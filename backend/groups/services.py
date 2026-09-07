from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Contribution, Transaction


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

    # Only pending payments can be completed
    if payment.status != Transaction.Status.PENDING:
        raise ValueError(
            "Only pending transactions can be completed."
        )

    amount = Decimal(str(amount))

    # Make sure the callback amount matches
    if amount != payment.amount:
        raise ValueError(
            "Payment amount does not match transaction amount."
        )

    contribution = payment.contribution

    # Make sure payment does not exceed the remaining balance
    remaining_balance = (
        contribution.amount_due - contribution.amount_paid
    )

    if amount > remaining_balance:
        raise ValueError(
            "Payment exceeds the contribution balance."
        )

    # Mark payment as successful
    payment.status = Transaction.Status.SUCCESS
    payment.transaction_date = timezone.now()
    payment.save(
        update_fields=[
            "status",
            "transaction_date",
            "updated_at",
        ]
    )

    # Update contribution
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