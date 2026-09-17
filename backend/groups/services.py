from decimal import Decimal
from django.conf import settings
from django.db import transaction
from .mpesa.stk_query import query_stk_push
from django.utils import timezone
from .models import Contribution, Transaction
from .mpesa.stk_push import initiate_stk_push
from .mpesa.reference import generate_account_reference, generate_transaction_description

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

    account_reference = generate_account_reference(payment.id)
    transaction_description = generate_transaction_description(payment.id)

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


@transaction.atomic
def reconcile_pending_transaction(transaction_id):
    payment = (
        Transaction.objects
        .select_for_update()
        .select_related("contribution")
        .get(id=transaction_id)
    )

    if payment.status != Transaction.Status.PENDING:
        return payment

    if not payment.checkout_request_id:
        raise ValueError(
            "Transaction does not have a CheckoutRequestID."
        )

    response = query_stk_push(
        payment.checkout_request_id
    )

    result_code = response.get("ResultCode")

    if result_code is None:
        raise ValueError(
            "M-Pesa STK Query response does not contain ResultCode."
        )

    result_code = int(result_code)

    if result_code == 0:
        process_successful_payment(
            transaction_id=payment.id,
            amount=payment.amount,
        )

    elif result_code == 1032:
        payment.status = Transaction.Status.CANCELLED
        payment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    else:
        payment.status = Transaction.Status.FAILED
        payment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    payment.refresh_from_db()

    return payment