import logging

import json
from datetime import datetime

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from ..models import Transaction
from ..services import process_successful_payment
logger = logging.getLogger(__name__)

@csrf_exempt
def mpesa_callback(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST requests are allowed."},
            status=405,
        )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON."},
            status=400,
        )

    stk_callback = data.get("Body", {}).get("stkCallback", {})
    logger.info(
    "M-Pesa callback received: %s",
    json.dumps(data),
)

    checkout_request_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")
    result_desc = stk_callback.get("ResultDesc")
    logger.info(
    "M-Pesa callback details: CheckoutRequestID=%s, ResultCode=%s, ResultDesc=%s",
    checkout_request_id,
    result_code,
    result_desc,
)

    if not checkout_request_id:
        return JsonResponse(
            {"error": "CheckoutRequestID is missing."},
            status=400,
        )

    try:
        with transaction.atomic():
            payment = (
                Transaction.objects
                .select_for_update()
                .select_related("contribution")
                .get(checkout_request_id=checkout_request_id)
            )

            logger.info(
                    "M-Pesa transaction found: id=%s, checkout_request_id=%s, status=%s",
                    payment.id,
                    checkout_request_id,
                    payment.status,
                )


            # If this callback has already been successfully processed,
            # do nothing. This prevents duplicate payment processing.
            if payment.status == Transaction.Status.SUCCESS:
                return JsonResponse({
                    "ResultCode": 0,
                    "ResultDesc": "Callback already processed.",
                })

            # Safaricom reports failed/cancelled transactions here.
            if result_code != 0:
                payment.status = Transaction.Status.FAILED
                payment.save(
                    update_fields=["status", "updated_at"]
                )

                return JsonResponse({
                    "ResultCode": 0,
                    "ResultDesc": "Callback processed successfully.",
                })

            # Extract successful payment metadata.
            callback_metadata = stk_callback.get(
                "CallbackMetadata",
                {}
            )

            items = callback_metadata.get("Item", [])

            metadata = {}

            for item in items:
                name = item.get("Name")
                value = item.get("Value")

                if name:
                    metadata[name] = value

            amount = metadata.get("Amount")
            receipt_number = metadata.get("MpesaReceiptNumber")
            transaction_date = metadata.get("TransactionDate")
            phone_number = metadata.get("PhoneNumber")

            if amount is None:
                return JsonResponse(
                    {"error": "Payment amount is missing."},
                    status=400,
                )

            if not receipt_number:
                return JsonResponse(
                    {"error": "M-Pesa receipt number is missing."},
                    status=400,
                )

            # Save M-Pesa transaction information.
            payment.mpesa_receipt_number = receipt_number

            if phone_number:
                payment.phone_number = str(phone_number)

            if transaction_date:
                parsed_date = datetime.strptime(
                    str(transaction_date),
                    "%Y%m%d%H%M%S",
                )

                payment.transaction_date = timezone.make_aware(
                    parsed_date
                )

            payment.save(
                update_fields=[
                    "mpesa_receipt_number",
                    "transaction_date",
                    "phone_number",
                    "updated_at",
                ]
            )

            # This marks the Transaction as SUCCESS and updates
            # the Contribution inside the same database transaction.
            process_successful_payment(
                transaction_id=payment.id,
                amount=amount,
            )
            logger.info(
                "M-Pesa payment processed successfully: transaction_id=%s, amount=%s, receipt=%s",
                payment.id,
                amount,
                receipt_number,
            )

    except Transaction.DoesNotExist:
        return JsonResponse(
            {"error": "Transaction not found."},
            status=404,
        )

    except ValueError as exc:
        return JsonResponse(
            {"error": str(exc)},
            status=400,
        )

    return JsonResponse({
        "ResultCode": 0,
        "ResultDesc": result_desc or "Callback processed successfully.",
    })