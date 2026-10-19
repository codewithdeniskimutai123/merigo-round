
import requests

from decimal import Decimal
from django.conf import settings

from .authentication import get_daraja_access_token
from .phone import normalize_phone_number
from urllib.parse import urlparse


def initiate_b2c_payment(*, amount, phone_number, originator_conversation_id, remarks, occasion=""):
    if settings.MPESA_ENVIRONMENT == "production":
        base_url = "https://api.safaricom.co.ke"
    elif settings.MPESA_ENVIRONMENT == "sandbox":
        base_url = "https://sandbox.safaricom.co.ke"
    else:
        raise ValueError("MPESA_ENVIRONMENT must be 'sandbox' or 'production'.")

    url = f"{base_url}/mpesa/b2c/v3/paymentrequest"

    required_settings = {
        "MPESA_B2C_INITIATOR_NAME": settings.MPESA_B2C_INITIATOR_NAME,
        "MPESA_B2C_SECURITY_CREDENTIAL": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "MPESA_B2C_SHORTCODE": settings.MPESA_B2C_SHORTCODE,
        "MPESA_B2C_RESULT_URL": settings.MPESA_B2C_RESULT_URL,
        "MPESA_B2C_TIMEOUT_URL": settings.MPESA_B2C_TIMEOUT_URL,
    }

    missing_settings = [name for name, value in required_settings.items() if not value]
    if missing_settings:
        raise ValueError(f"Missing B2C settings: {', '.join(missing_settings)}")
    
 
    
    for setting_name in ("MPESA_B2C_RESULT_URL", "MPESA_B2C_TIMEOUT_URL"):
        callback_url = getattr(settings, setting_name)
        parsed_url = urlparse(callback_url)

        if parsed_url.scheme != "https" or not parsed_url.netloc:
            raise ValueError(f"{setting_name} must be a valid HTTPS URL.")



    amount = Decimal(str(amount))
    if amount <= 0 or amount != amount.to_integral_value():
        raise ValueError("B2C amount must be a positive whole number.")

    if not originator_conversation_id or len(originator_conversation_id) >= 20:
        raise ValueError("A unique originator conversation ID shorter than 20 characters is required.")

    if not remarks or not 2 <= len(remarks) <= 100:
        raise ValueError("Remarks must contain between 2 and 100 characters.")

    if occasion and len(occasion) > 100:
        raise ValueError("Occasion must not exceed 100 characters.")

    phone_number = normalize_phone_number(phone_number)
    access_token = get_daraja_access_token()

    payload = {
        "OriginatorConversationID": originator_conversation_id,
        "InitiatorName": settings.MPESA_B2C_INITIATOR_NAME,
        "SecurityCredential": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": settings.MPESA_B2C_SHORTCODE,
        "PartyB": phone_number,
        "Remarks": remarks,
        "QueueTimeOutURL": settings.MPESA_B2C_TIMEOUT_URL,
        "ResultURL": settings.MPESA_B2C_RESULT_URL,
        "Occasion": occasion,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if not response.ok:
            print("Daraja B2C HTTP status:", response.status_code)
            print("Daraja B2C response:", response.text[:1000])
            response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise RuntimeError("Could not submit the M-Pesa B2C request.") from exc
    except ValueError as exc:
        raise RuntimeError("The M-Pesa B2C API returned an invalid JSON response.") from exc
