
import uuid

from .models import Payout
from .mpesa.b2c import initiate_b2c_payment
from decimal import Decimal
from django.db import transaction
from .group_services import confirm_payout_success, confirm_payout_failure

@transaction.atomic
def reserve_payout_submission(*, payout_id):
    payout = Payout.objects.select_for_update().get(pk=payout_id)

    if payout.status != Payout.Status.PENDING:
        raise ValueError("Only pending payouts can be submitted.")

    if payout.originator_conversation_id:
        raise ValueError("This payout already has a submission ID and must not be submitted again automatically.")

    originator_id = uuid.uuid4().hex[:16]

    payout.originator_conversation_id = originator_id
    payout.save(update_fields=["originator_conversation_id", "updated_at"])

    return originator_id


def submit_payout(*, payout_id):
    originator_id = reserve_payout_submission(payout_id=payout_id)
    payout = Payout.objects.select_related("recipient").get(pk=payout_id)

    response = initiate_b2c_payment(
        amount=payout.amount,
        phone_number=payout.phone_number,
        originator_conversation_id=originator_id,
        remarks=f"Merigo Round payout {payout.round.round_number}",
        occasion=f"Cycle {payout.round.cycle.cycle_number}",
    )

    conversation_id = response.get("ConversationID")

    if conversation_id:
        Payout.objects.filter(pk=payout_id).update(conversation_id=conversation_id)

    return response




@transaction.atomic
def process_b2c_result(*, result):
    originator_id = result.get("OriginatorConversationID")
    conversation_id = result.get("ConversationID")
    result_code = result.get("ResultCode")
    result_description = result.get("ResultDesc", "No result description provided.")
    transaction_id = result.get("TransactionID")

    if not originator_id or result_code is None:
        raise ValueError("B2C result is missing required identifiers or result code.")

    payout = Payout.objects.select_for_update().get(
        originator_conversation_id=originator_id
    )

    if payout.status == Payout.Status.SUCCESS:
        if transaction_id == payout.transaction_reference:
            return payout
        raise ValueError("Conflicting result received for a successful payout.")

    if payout.status != Payout.Status.PENDING:
        raise ValueError("This payout is no longer pending.")

    if conversation_id and payout.conversation_id and conversation_id != payout.conversation_id:
        raise ValueError("B2C conversation ID does not match the payout.")

    payout.conversation_id = conversation_id or payout.conversation_id
    payout.save(update_fields=["conversation_id", "updated_at"])

    if str(result_code) == "0":
        if not transaction_id:
            raise ValueError("Successful B2C result has no transaction ID.")

        parameters = result.get("ResultParameters", {}).get("ResultParameter", [])
        parameter_map = {item.get("Key"): item.get("Value") for item in parameters}
        transaction_amount = parameter_map.get("TransactionAmount")

        if transaction_amount is None or Decimal(str(transaction_amount)) != payout.amount:
            raise ValueError("B2C result amount is missing or does not match the payout.")

        return confirm_payout_success(
            payout=payout,
            transaction_reference=transaction_id,
        )

    return confirm_payout_failure(
        payout=payout,
        failure_reason=str(result_description)[:2000],
    )


@transaction.atomic
def process_b2c_timeout(*, originator_conversation_id):
    payout = Payout.objects.select_for_update().get(
        originator_conversation_id=originator_conversation_id
    )

    if payout.status == Payout.Status.PENDING:
        return payout

    return payout
