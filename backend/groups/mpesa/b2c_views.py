
import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from groups.payout_services import process_b2c_result, process_b2c_timeout


logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def b2c_result_callback(request):
    try:
        payload = json.loads(request.body)
        result = payload.get("Result")

        if not isinstance(result, dict):
            return JsonResponse({"error": "Invalid B2C result payload."}, status=400)

        process_b2c_result(result=result)

        return JsonResponse({"ResultCode": 0, "ResultDesc": "Result received."})

    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)
    except Exception:
        logger.exception("Failed to process B2C result callback.")
        return JsonResponse({"error": "Could not process B2C result."}, status=500)


@csrf_exempt
@require_POST
def b2c_timeout_callback(request):
    try:
        payload = json.loads(request.body)
        result = payload.get("Result", payload)

        if not isinstance(result, dict):
            return JsonResponse({"error": "Invalid B2C timeout payload."}, status=400)

        originator_id = result.get("OriginatorConversationID")

        if not originator_id:
            return JsonResponse({"error": "Missing originator conversation ID."}, status=400)

        process_b2c_timeout(originator_conversation_id=originator_id)

        logger.warning("B2C timeout received for originator ID %s.", originator_id)

        return JsonResponse({"ResultCode": 0, "ResultDesc": "Timeout received for investigation."})

    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)
    except Exception:
        logger.exception("Failed to process B2C timeout callback.")
        return JsonResponse({"error": "Could not process B2C timeout."}, status=500)
