import logging

import json
from datetime import datetime
from decimal import Decimal
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .phone import normalize_phone_number
from ..models import Transaction
from .result_codes import get_transaction_status
from ..services import process_successful_payment
logger = logging.getLogger(__name__)

@csrf_exempt
def mpesa_callback(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST requests are allowed."},
            status=405,
        )

    if request.content_type != "application/json":
        return JsonResponse(
                {"error": "Content-Type must be application/json."},
                status=415,
     
    )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON."},
            status=400,
        )


    stk_callback = data.get("Body", {}).get("stkCallback", {})

    if not isinstance(stk_callback, dict) or not stk_callback:
        return JsonResponse(
            {"error": "Invalid M-Pesa callback structure."},
            status=400,
        )
    
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
    if result_code is None:
        return JsonResponse(
            {"error": "ResultCode is missing."},
            status=400,
        )

    if not isinstance(checkout_request_id, str) or not checkout_request_id.strip():
        return JsonResponse(
            {"error": "Invalid CheckoutRequestID."},
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


            if payment.status == Transaction.Status.SUCCESS:
                return JsonResponse({
                    "ResultCode": 0,
                    "ResultDesc": "Callback already processed.",
                })

            if result_code != 0:
                transaction_status = get_transaction_status(result_code)

                payment.status = transaction_status
                payment.save(
                    update_fields=["status", "updated_at"]
                )

                logger.info(
                    "M-Pesa transaction completed with non-success result: "
                    "transaction_id=%s, result_code=%s, status=%s, description=%s",
                    payment.id,
                    result_code,
                    transaction_status,
                    result_desc,
                )

                return JsonResponse({
                    "ResultCode": 0,
                    "ResultDesc": "Callback processed successfully.",
                })

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
            try:
                amount = Decimal(str(amount))
            except (TypeError, ValueError):
                return JsonResponse(
                    {"error": "Invalid payment amount."},
                    status=400,
                )

            if amount <= 0:
                return JsonResponse(
                    {"error": "Payment amount must be greater than zero."},
                    status=400,
                )

            if amount != payment.amount:
                logger.warning(
                    "M-Pesa amount mismatch: transaction_id=%s, "
                    "expected=%s, received=%s",
                    payment.id,
                    payment.amount,
                    amount,
                )

                return JsonResponse(
                    {"error": "Payment amount does not match transaction amount."},
                    status=400,
                )
            if not receipt_number:
                return JsonResponse(
                    {"error": "M-Pesa receipt number is missing."},
                    status=400,
                )

            if not isinstance(receipt_number, str) or not receipt_number.strip():
                return JsonResponse(
                    {"error": "Invalid M-Pesa receipt number."},
                    status=400,
                )
            existing_payment = (
                        Transaction.objects
                        .filter(mpesa_receipt_number=receipt_number)
                        .exclude(id=payment.id)
                        .first()
                    )

            if existing_payment:
                logger.warning(
                    "Duplicate M-Pesa receipt detected: receipt=%s, "
                    "existing_transaction_id=%s, callback_transaction_id=%s",
                    receipt_number,
                    existing_payment.id,
                    payment.id,
                )

                return JsonResponse({
                    "ResultCode": 0,
                    "ResultDesc": "Callback already processed.",
                })

            payment.mpesa_receipt_number = receipt_number

            if phone_number:
                try:
                    payment.phone_number = normalize_phone_number(phone_number)
                except ValueError:
                    return JsonResponse(
                        {"error": "Invalid phone number in M-Pesa callback."},
                        status=400,
                    )

            if transaction_date:
                try:
                    parsed_date = datetime.strptime(
                        str(transaction_date),
                        "%Y%m%d%H%M%S",
                    )

                    payment.transaction_date = timezone.make_aware(
                        parsed_date
                    )

                except (TypeError, ValueError):
                    return JsonResponse(
                        {"error": "Invalid transaction date."},
                        status=400,
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
        logger.warning(
            "M-Pesa callback received for unknown CheckoutRequestID=%s",
            checkout_request_id,
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