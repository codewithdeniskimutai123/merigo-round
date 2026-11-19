
import logging
import uuid
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from .models import Payout
from .mpesa.b2c import (
    initiate_b2c_payment,
    query_b2c_transaction_status,
)
from .group_services import (
    confirm_payout_success,
    confirm_payout_failure,
)


logger = logging.getLogger(__name__)


@transaction.atomic
def reserve_payout_submission(*, payout_id):
    payout = Payout.objects.select_for_update().get(pk=payout_id)

    if payout.status != Payout.Status.PENDING:
        raise ValueError("Only pending payouts can be submitted.")

    if payout.originator_conversation_id:
        raise ValueError(
            "This payout already has a submission ID and must not "
            "be submitted again automatically."
        )

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

    if not isinstance(response, dict):
        raise RuntimeError("Daraja returned an invalid B2C response.")

    response_code = response.get("ResponseCode")
    conversation_id = response.get("ConversationID")

    if str(response_code) != "0":
        raise RuntimeError(
            "Daraja did not confirm acceptance of the B2C request. "
            "The payout requires reconciliation before any retry."
        )

    if not isinstance(conversation_id, str) or not conversation_id.strip():
        raise RuntimeError(
            "Daraja did not return a valid conversation ID. "
            "The payout requires reconciliation before any retry."
        )

    Payout.objects.filter(pk=payout_id).update(
        conversation_id=conversation_id.strip(),
        updated_at=timezone.now(),
    )

    return response


@transaction.atomic
def process_b2c_result(*, result):
    if not isinstance(result, dict):
        raise ValueError("B2C result must be a JSON object.")

    originator_id = result.get("OriginatorConversationID")
    conversation_id = result.get("ConversationID")
    result_code = result.get("ResultCode")
    result_description = result.get(
        "ResultDesc",
        "No result description provided.",
    )
    transaction_id = result.get("TransactionID")

    if not isinstance(originator_id, str) or not originator_id.strip():
        raise ValueError("B2C result is missing a valid originator ID.")

    if not isinstance(conversation_id, str) or not conversation_id.strip():
        raise ValueError("B2C result is missing a valid conversation ID.")

    if isinstance(result_code, bool) or not isinstance(result_code, (str, int)):
        raise ValueError("B2C result contains an invalid result code.")

    result_code = str(result_code).strip()

    if not result_code:
        raise ValueError("B2C result is missing its result code.")

    if not isinstance(result_description, str):
        raise ValueError("B2C result contains an invalid description.")

    result_description = result_description.strip() or (
        "No result description provided."
    )

    payout = Payout.objects.select_for_update().get(
        originator_conversation_id=originator_id.strip()
    )

    if (
        payout.conversation_id
        and payout.conversation_id != conversation_id.strip()
    ):
        raise ValueError("B2C conversation ID does not match the payout.")

    is_success = result_code == "0"

    if is_success:
        if not isinstance(transaction_id, str) or not transaction_id.strip():
            raise ValueError(
                "Successful B2C result has no valid transaction ID."
            )

        transaction_id = transaction_id.strip()
        result_parameters = result.get("ResultParameters", {})

        if not isinstance(result_parameters, dict):
            raise ValueError("B2C result parameters must be an object.")

        parameters = result_parameters.get("ResultParameter", [])

        if not isinstance(parameters, list):
            raise ValueError("B2C result parameter list is invalid.")

        if not all(isinstance(item, dict) for item in parameters):
            raise ValueError("B2C result contains an invalid parameter.")

        amount_values = [
            item.get("Value")
            for item in parameters
            if item.get("Key") == "TransactionAmount"
        ]

        if len(amount_values) != 1 or amount_values[0] is None:
            raise ValueError(
                "B2C result must contain exactly one transaction amount."
            )

        try:
            received_amount = Decimal(str(amount_values[0]))
        except (InvalidOperation, TypeError, ValueError):
            raise ValueError(
                "B2C result contains an invalid transaction amount."
            ) from None

        if not received_amount.is_finite() or received_amount != payout.amount:
            raise ValueError("B2C result amount does not match the payout.")

        if payout.status == Payout.Status.SUCCESS:
            if payout.transaction_reference == transaction_id:
                return payout

            raise ValueError(
                "Conflicting result received for a successful payout."
            )

        if payout.status != Payout.Status.PENDING:
            raise ValueError(
                "A successful result conflicts with the payout's current status."
            )

        payout.conversation_id = conversation_id.strip()
        payout.save(update_fields=["conversation_id", "updated_at"])

        return confirm_payout_success(
            payout=payout,
            transaction_reference=transaction_id,
        )

    failure_reason = (
        f"Daraja ResultCode {result_code}: {result_description}"
    )[:2000]

    if payout.status == Payout.Status.FAILED:
        if payout.failure_reason == failure_reason:
            return payout

        raise ValueError("Conflicting failure result received for this payout.")

    if payout.status != Payout.Status.PENDING:
        raise ValueError(
            "A failure result conflicts with the payout's current status."
        )

    payout.conversation_id = conversation_id.strip()
    payout.save(update_fields=["conversation_id", "updated_at"])

    return confirm_payout_failure(
        payout=payout,
        failure_reason=failure_reason,
    )


@transaction.atomic
def process_b2c_timeout(*, originator_conversation_id):
    payout = Payout.objects.select_for_update().get(
        originator_conversation_id=originator_conversation_id
    )
    return payout


@transaction.atomic
def reserve_payout_status_query(*, payout_id):
    payout = Payout.objects.select_for_update().get(pk=payout_id)

    if payout.status != Payout.Status.PENDING:
        raise ValueError("Only pending payouts can be reconciled.")

    if not payout.originator_conversation_id:
        raise ValueError(
            "The payout has no original B2C originator conversation ID."
        )

    if not payout.conversation_id:
        raise ValueError(
            "The original B2C request has no Daraja conversation ID."
        )

    if payout.status_query_requested_at:
        raise ValueError(
            "A status query has already been attempted for this payout. "
            "Investigate the existing attempt before retrying."
        )

    payout.status_query_requested_at = timezone.now()
    payout.save(
        update_fields=["status_query_requested_at", "updated_at"]
    )

    return payout


def reconcile_payout(*, payout_id):
    payout = reserve_payout_status_query(payout_id=payout_id)

    response = query_b2c_transaction_status(
        originator_conversation_id=payout.originator_conversation_id,
    )

    if not isinstance(response, dict):
        raise RuntimeError(
            "Daraja returned an invalid status-query response."
        )

    if str(response.get("ResponseCode")) != "0":
        raise RuntimeError(
            "Daraja did not accept the transaction status query. "
            "Investigate before attempting another query."
        )

    query_originator_id = response.get("OriginatorConversationID")
    query_conversation_id = response.get("ConversationID")

    if (
        not isinstance(query_originator_id, str)
        or not query_originator_id.strip()
        or len(query_originator_id.strip()) > 100
    ):
        raise RuntimeError(
            "Daraja returned an invalid status-query originator ID."
        )

    if (
        not isinstance(query_conversation_id, str)
        or not query_conversation_id.strip()
        or len(query_conversation_id.strip()) > 100
    ):
        raise RuntimeError(
            "Daraja returned an invalid status-query conversation ID."
        )

    query_originator_id = query_originator_id.strip()
    query_conversation_id = query_conversation_id.strip()

    updated = Payout.objects.filter(
        pk=payout_id,
        status=Payout.Status.PENDING,
        status_query_requested_at=payout.status_query_requested_at,
        status_query_originator_id__isnull=True,
    ).update(
        status_query_originator_id=query_originator_id,
        status_query_conversation_id=query_conversation_id,
        updated_at=timezone.now(),
    )

    if not updated:
        current_payout = Payout.objects.get(pk=payout_id)

        if (
            current_payout.status_query_originator_id != query_originator_id
            or current_payout.status_query_conversation_id
            != query_conversation_id
        ):
            raise RuntimeError(
                "The payout changed while the status query was being "
                "recorded, and the saved query IDs do not match Daraja's "
                "acknowledgement. Investigate before retrying."
            )

    return response


@transaction.atomic
def process_b2c_status_result(*, result):
    if not isinstance(result, dict):
        raise ValueError(
            "Transaction Status result must be a JSON object."
        )

    query_originator_id = result.get("OriginatorConversationID")
    query_conversation_id = result.get("ConversationID")
    result_code = result.get("ResultCode")

    if (
        not isinstance(query_originator_id, str)
        or not query_originator_id.strip()
        or len(query_originator_id.strip()) > 100
    ):
        raise ValueError("Missing or invalid status-query originator ID.")

    if (
        not isinstance(query_conversation_id, str)
        or not query_conversation_id.strip()
        or len(query_conversation_id.strip()) > 100
    ):
        raise ValueError("Missing or invalid status-query conversation ID.")

    query_originator_id = query_originator_id.strip()
    query_conversation_id = query_conversation_id.strip()

    if isinstance(result_code, bool) or not isinstance(result_code, (str, int)):
        raise ValueError("Invalid status-query result code.")

    if str(result_code).strip() != "0":
        logger.warning(
            "Daraja could not complete status query %s: %s",
            query_originator_id,
            result.get("ResultDesc", "No description provided."),
        )
        return None

    result_parameters = result.get("ResultParameters", {})

    if not isinstance(result_parameters, dict):
        raise ValueError("Invalid status-query result parameters.")

    parameters = result_parameters.get("ResultParameter", [])

    if not isinstance(parameters, list) or not all(
        isinstance(item, dict) for item in parameters
    ):
        raise ValueError("Invalid status-query parameter list.")

    parameter_values = {}

    for item in parameters:
        key = item.get("Key")

        if isinstance(key, str) and key:
            parameter_values.setdefault(key, []).append(item.get("Value"))

    original_originator_ids = parameter_values.get(
        "OriginatorConversationID", []
    )

    if (
        len(original_originator_ids) != 1
        or not isinstance(original_originator_ids[0], str)
        or not original_originator_ids[0].strip()
    ):
        raise ValueError(
            "Status result must contain exactly one valid original "
            "B2C originator ID."
        )

    original_originator_id = original_originator_ids[0].strip()

    # Locate the original payout, not the status query.
    payout = Payout.objects.select_for_update().get(
        originator_conversation_id=original_originator_id,
        status_query_requested_at__isnull=False,
    )

    # The callback must belong to the query recorded for this payout.
    if (
        payout.status_query_originator_id
        and payout.status_query_originator_id != query_originator_id
    ):
        raise ValueError(
            "Status-query originator ID does not match the payout."
        )

    if (
        payout.status_query_conversation_id
        and payout.status_query_conversation_id != query_conversation_id
    ):
        raise ValueError(
            "Status-query conversation ID does not match the payout."
        )

    # Recover acknowledgement IDs only if they were not saved previously.
    fields_to_update = []

    if not payout.status_query_originator_id:
        payout.status_query_originator_id = query_originator_id
        fields_to_update.append("status_query_originator_id")

    if not payout.status_query_conversation_id:
        payout.status_query_conversation_id = query_conversation_id
        fields_to_update.append("status_query_conversation_id")

    if fields_to_update:
        fields_to_update.append("updated_at")
        payout.save(update_fields=fields_to_update)

    statuses = parameter_values.get("TransactionStatus", [])

    if (
        len(statuses) != 1
        or not isinstance(statuses[0], str)
        or not statuses[0].strip()
    ):
        raise ValueError("Missing or invalid transaction status.")

    transaction_status = statuses[0].strip().lower()

    # Non-final statuses must never change the payout.
    if transaction_status in {
        "initiated",
        "authorized",
        "pending authorized",
        "pending",
    }:
        return payout

    if transaction_status == "completed":
        amounts = parameter_values.get("Amount", [])
        receipts = parameter_values.get("ReceiptNo", [])

        if len(amounts) != 1 or amounts[0] is None:
            raise ValueError(
                "Completed transaction has no valid amount."
            )

        if (
            len(receipts) != 1
            or not isinstance(receipts[0], str)
            or not receipts[0].strip()
        ):
            raise ValueError(
                "Completed transaction has no valid M-Pesa receipt number."
            )

        try:
            received_amount = Decimal(str(amounts[0]))
        except (InvalidOperation, TypeError, ValueError):
            raise ValueError(
                "Transaction Status returned an invalid amount."
            ) from None

        if not received_amount.is_finite() or received_amount != payout.amount:
            raise ValueError(
                "Transaction Status amount does not match the payout."
            )

        receipt_number = receipts[0].strip()

        if payout.status == Payout.Status.SUCCESS:
            if payout.transaction_reference == receipt_number:
                return payout

            raise ValueError(
                "Conflicting receipt received for a successful payout."
            )

        if payout.status != Payout.Status.PENDING:
            raise ValueError(
                "Completed transaction conflicts with the payout status."
            )

        return confirm_payout_success(
            payout=payout,
            transaction_reference=receipt_number,
        )

    if transaction_status in {
        "failed",
        "cancelled",
        "declined",
        "expired",
    }:
        failure_reason = (
            "Daraja Transaction Status: "
            f"{statuses[0]}. "
            f"{result.get('ResultDesc', '')}"
        )[:2000]

        if payout.status == Payout.Status.FAILED:
            if payout.failure_reason == failure_reason:
                return payout

            raise ValueError(
                "Conflicting failure status received for this payout."
            )

        if payout.status != Payout.Status.PENDING:
            raise ValueError(
                "Failed transaction conflicts with the payout status."
            )

        return confirm_payout_failure(
            payout=payout,
            failure_reason=failure_reason,
        )

    logger.warning(
        "Unrecognized Daraja transaction status '%s' for payout %s. "
        "Payout remains unchanged.",
        statuses[0],
        payout.pk,
    )

    return payout
