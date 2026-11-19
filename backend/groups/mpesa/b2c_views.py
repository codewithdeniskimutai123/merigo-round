
import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from groups.payout_services import (
    process_b2c_result,
    process_b2c_timeout,
    process_b2c_status_result,
)

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def b2c_result_callback(request):
    try:
        payload = json.loads(request.body)

        if not isinstance(payload, dict):
            return JsonResponse(
                {"error": "Invalid B2C result payload."},
                status=400,
            )

        result = payload.get("Result")

        if not isinstance(result, dict):
            return JsonResponse(
                {"error": "Invalid B2C result payload."},
                status=400,
            )

        logger.info(
            "Received B2C result callback. "
            "OriginatorConversationID=%s, ConversationID=%s, "
            "ResultCode=%s",
            result.get("OriginatorConversationID"),
            result.get("ConversationID"),
            result.get("ResultCode"),
        )

        process_b2c_result(result=result)

        logger.info(
            "B2C result callback processed successfully. "
            "OriginatorConversationID=%s",
            result.get("OriginatorConversationID"),
        )

        return JsonResponse({
            "ResultCode": 0,
            "ResultDesc": "Result received.",
        })

    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.exception("Invalid JSON received in B2C result callback.")

        return JsonResponse(
            {"error": "Invalid JSON payload."},
            status=400,
        )

    except Exception:
        logger.exception("Failed to process B2C result callback.")

        return JsonResponse(
            {"error": "Could not process B2C result."},
            status=500,
        )


@csrf_exempt
@require_POST
def b2c_timeout_callback(request):
    try:
        payload = json.loads(request.body)

        if not isinstance(payload, dict):
            return JsonResponse(
                {"error": "Invalid B2C timeout payload."},
                status=400,
            )

        result = payload.get("Result", payload)

        if not isinstance(result, dict):
            return JsonResponse(
                {"error": "Invalid B2C timeout payload."},
                status=400,
            )

        originator_id = result.get("OriginatorConversationID")

        if not originator_id:
            logger.warning(
                "B2C timeout callback received without "
                "OriginatorConversationID: %s",
                payload,
            )

            return JsonResponse(
                {"error": "Missing originator conversation ID."},
                status=400,
            )

        logger.warning(
            "Received B2C timeout callback. "
            "OriginatorConversationID=%s, ConversationID=%s",
            originator_id,
            result.get("ConversationID"),
        )

        process_b2c_timeout(
            originator_conversation_id=originator_id,
        )

        return JsonResponse({
            "ResultCode": 0,
            "ResultDesc": "Timeout received for investigation.",
        })

    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.exception("Invalid JSON received in B2C timeout callback.")

        return JsonResponse(
            {"error": "Invalid JSON payload."},
            status=400,
        )

    except Exception:
        logger.exception("Failed to process B2C timeout callback.")

        return JsonResponse(
            {"error": "Could not process B2C timeout."},
            status=500,
        )


@csrf_exempt
@require_POST
def b2c_status_result_callback(request):
    try:
        payload = json.loads(request.body)

        if not isinstance(payload, dict):
            logger.warning(
                "Invalid B2C status result callback payload type: %s",
                type(payload).__name__,
            )

            return JsonResponse(
                {"error": "Invalid status result payload."},
                status=400,
            )

        result = payload.get("Result")

        if not isinstance(result, dict):
            logger.warning(
                "B2C status result callback missing Result object: %s",
                payload,
            )

            return JsonResponse(
                {"error": "Missing status result object."},
                status=400,
            )

        logger.info(
            "Received B2C transaction status result callback. "
            "OriginatorConversationID=%s, ConversationID=%s, "
            "ResultCode=%s, ResultDesc=%s",
            result.get("OriginatorConversationID"),
            result.get("ConversationID"),
            result.get("ResultCode"),
            result.get("ResultDesc"),
        )

        result_parameters = result.get("ResultParameters", {})

        if isinstance(result_parameters, dict):
            logger.info(
                "B2C status result parameters: %s",
                result_parameters.get("ResultParameter", []),
            )
        else:
            logger.warning(
                "Unexpected B2C ResultParameters structure: %s",
                result_parameters,
            )

        process_b2c_status_result(result=result)

        logger.info(
            "B2C transaction status result processed successfully. "
            "OriginatorConversationID=%s, ConversationID=%s",
            result.get("OriginatorConversationID"),
            result.get("ConversationID"),
        )

        return JsonResponse({
            "ResultCode": 0,
            "ResultDesc": "Transaction status result received.",
        })

    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.exception(
            "Invalid JSON received in B2C transaction status result callback."
        )

        return JsonResponse(
            {"error": "Invalid JSON payload."},
            status=400,
        )

    except Exception:
        logger.exception(
            "Failed to process B2C transaction status result."
        )

        return JsonResponse(
            {"error": "Could not process transaction status result."},
            status=500,
        )


@csrf_exempt
@require_POST
def b2c_status_timeout_callback(request):
    try:
        payload = json.loads(request.body)

        if not isinstance(payload, dict):
            return JsonResponse(
                {"error": "Invalid status timeout payload."},
                status=400,
            )

        result = payload.get("Result", payload)

        logger.warning(
            "Received Daraja B2C Transaction Status timeout callback: %s",
            result,
        )

        return JsonResponse({
            "ResultCode": 0,
            "ResultDesc": "Status query timeout received for investigation.",
        })

    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.exception(
            "Invalid JSON received in B2C transaction status timeout callback."
        )

        return JsonResponse(
            {"error": "Invalid JSON payload."},
            status=400,
        )

    except Exception:
        logger.exception(
            "Failed to process B2C transaction status timeout."
        )

        return JsonResponse(
            {"error": "Could not process transaction status timeout."},
            status=500,
        )
