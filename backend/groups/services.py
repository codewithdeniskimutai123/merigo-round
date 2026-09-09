from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import Contribution, Transaction
from .mpesa.stk_push import initiate_stk_push


@transaction.atomic
def process_successful_payment(
    transaction_id,
    amount,
):
    payment = (
        Transaction.objects
        .select_for_update()
        .select_related("contribution")
        .get(id=transaction_id)
    )

    if payment.status == Transaction.Status.SUCCESS:
        return payment

    if payment.status != Transaction.Status.PENDING:
        raise ValueError(
            "Only pending transactions can be completed."
        )

    amount = Decimal(str(amount))

    if amount != payment.amount:
        raise ValueError(
            "Payment amount does not match transaction amount."
        )

    contribution = payment.contribution

    remaining_balance = (
        contribution.amount_due - contribution.amount_paid
    )

    if amount > remaining_balance:
        raise ValueError(
            "Payment exceeds the contribution balance."
        )

    payment.status = Transaction.Status.SUCCESS
    payment.transaction_date = timezone.now()
    payment.save(
        update_fields=[
            "status",
            "transaction_date",
            "updated_at",
        ]
    )

    contribution.amount_paid += amount

    if contribution.amount_paid >= contribution.amount_due:
        contribution.amount_paid = contribution.amount_due
        contribution.status = Contribution.Status.PAID
        contribution.paid_at = timezone.now()

    elif contribution.amount_paid > 0:
        contribution.status = (
            Contribution.Status.PARTIALLY_PAID
        )

    contribution.save(
        update_fields=[
            "amount_paid",
            "status",
            "paid_at",
            "updated_at",
        ]
    )

    return payment



@transaction.atomic
def initiate_contribution_payment(
    contribution_id,
    phone_number,
    callback_url,
):
   
    contribution = (
        Contribution.objects
        .select_for_update()
        .select_related("member__user", "round__cycle__group")
        .get(id=contribution_id)
    )

    remaining_balance = (
        contribution.amount_due - contribution.amount_paid
    )

    if remaining_balance <= 0:
        raise ValueError(
            "This contribution has already been fully paid."
        )

    payment = Transaction.objects.create(
        contribution=contribution,
        amount=remaining_balance,
        phone_number=phone_number,
        status=Transaction.Status.PENDING,
    )

    account_reference = f"CONTRIB{payment.id}"

    transaction_description = "Contribution"

    # Initiate STK Push.
    response = initiate_stk_push(
        phone_number=phone_number,
        amount=payment.amount,
        account_reference=account_reference,
        transaction_description=transaction_description,
        callback_url=callback_url,
    )

    payment.merchant_request_id = response.get(
        "MerchantRequestID"
    )

    payment.checkout_request_id = response.get(
        "CheckoutRequestID"
    )

    payment.save(
        update_fields=[
            "merchant_request_id",
            "checkout_request_id",
            "updated_at",
        ]
    )

    return payment