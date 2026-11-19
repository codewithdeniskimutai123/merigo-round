
import logging
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

import requests
from django.conf import settings

from .b2c_authentication import get_b2c_access_token
from .phone import normalize_phone_number


logger = logging.getLogger(__name__)


def _get_mpesa_base_url():
    environment = settings.MPESA_B2C_ENVIRONMENT

    if environment == "production":
        return "https://api.safaricom.co.ke"

    if environment == "sandbox":
        return "https://sandbox.safaricom.co.ke"

    raise ValueError(
        "MPESA_B2C_ENVIRONMENT must be 'sandbox' or 'production'."
    )


def _validate_callback_url(setting_name, callback_url):
    if not callback_url:
        raise ValueError(f"{setting_name} is required.")

    parsed_url = urlparse(callback_url)

    if (
        parsed_url.scheme != "https"
        or not parsed_url.netloc
        or not parsed_url.hostname
    ):
        raise ValueError(
            f"{setting_name} must be a valid HTTPS URL."
        )

    return callback_url


def initiate_b2c_payment(
    *,
    amount,
    phone_number,
    originator_conversation_id,
    remarks,
    occasion="",
):
    base_url = _get_mpesa_base_url()

    required_settings = {
        "MPESA_B2C_CONSUMER_KEY": settings.MPESA_B2C_CONSUMER_KEY,
        "MPESA_B2C_CONSUMER_SECRET": settings.MPESA_B2C_CONSUMER_SECRET,
        "MPESA_B2C_INITIATOR_NAME": settings.MPESA_B2C_INITIATOR_NAME,
        "MPESA_B2C_SECURITY_CREDENTIAL": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "MPESA_B2C_SHORTCODE": settings.MPESA_B2C_SHORTCODE,
        "MPESA_B2C_RESULT_URL": settings.MPESA_B2C_RESULT_URL,
        "MPESA_B2C_TIMEOUT_URL": settings.MPESA_B2C_TIMEOUT_URL,
    }

    missing_settings = [
        name
        for name, value in required_settings.items()
        if not value
    ]

    if missing_settings:
        raise ValueError(
            f"Missing B2C settings: {', '.join(missing_settings)}"
        )

    result_url = _validate_callback_url(
        "MPESA_B2C_RESULT_URL",
        settings.MPESA_B2C_RESULT_URL,
    )

    timeout_url = _validate_callback_url(
        "MPESA_B2C_TIMEOUT_URL",
        settings.MPESA_B2C_TIMEOUT_URL,
    )

    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(
            "B2C amount must be a valid number."
        ) from exc

    if not amount.is_finite() or amount <= 0:
        raise ValueError(
            "B2C amount must be greater than zero."
        )

    if amount != amount.to_integral_value():
        raise ValueError(
            "B2C amount must be a positive whole number."
        )

    if (
        not isinstance(originator_conversation_id, str)
        or not originator_conversation_id.strip()
        or len(originator_conversation_id.strip()) >= 20
    ):
        raise ValueError(
            "A unique originator conversation ID shorter than "
            "20 characters is required."
        )

    originator_conversation_id = originator_conversation_id.strip()

    if (
        not isinstance(remarks, str)
        or not 2 <= len(remarks) <= 100
    ):
        raise ValueError(
            "Remarks must contain between 2 and 100 characters."
        )

    if not isinstance(occasion, str) or len(occasion) > 100:
        raise ValueError(
            "Occasion must not exceed 100 characters."
        )

    phone_number = normalize_phone_number(phone_number)

    access_token = get_b2c_access_token()

    payload = {
        "OriginatorConversationID": originator_conversation_id,
        "InitiatorName": settings.MPESA_B2C_INITIATOR_NAME,
        "SecurityCredential": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": settings.MPESA_B2C_SHORTCODE,
        "PartyB": phone_number,
        "Remarks": remarks,
        "QueueTimeOutURL": timeout_url,
        "ResultURL": result_url,
        "Occassion": occasion,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    url = f"{base_url}/mpesa/b2c/v3/paymentrequest"

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )

        if not response.ok:
            logger.error(
                "Daraja B2C HTTP error. Status: %s, Response: %s",
                response.status_code,
                response.text[:1000],
            )

            response.raise_for_status()

        try:
            data = response.json()
        except ValueError as exc:
            raise RuntimeError(
                "The M-Pesa B2C API returned an invalid JSON response."
            ) from exc

        if not isinstance(data, dict):
            raise RuntimeError(
                "The M-Pesa B2C API returned an invalid response."
            )

        logger.info(
            "Daraja B2C request response received. "
            "OriginatorConversationID=%s, ConversationID=%s, "
            "ResponseCode=%s",
            originator_conversation_id,
            data.get("ConversationID"),
            data.get("ResponseCode"),
        )

        return data

    except requests.RequestException as exc:
        logger.exception("Daraja B2C request failed.")

        raise RuntimeError(
            "Could not submit the M-Pesa B2C request."
        ) from exc


def query_b2c_transaction_status(
    *,
    originator_conversation_id,
):
    base_url = _get_mpesa_base_url()

    if (
        not isinstance(originator_conversation_id, str)
        or not originator_conversation_id.strip()
        or len(originator_conversation_id.strip()) >= 20
    ):
        raise ValueError(
            "A valid original B2C originator conversation ID is required."
        )

    originator_conversation_id = originator_conversation_id.strip()

    required_settings = {
        "MPESA_B2C_INITIATOR_NAME": settings.MPESA_B2C_INITIATOR_NAME,
        "MPESA_B2C_SECURITY_CREDENTIAL": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "MPESA_B2C_SHORTCODE": settings.MPESA_B2C_SHORTCODE,
        "MPESA_B2C_RESULT_URL": settings.MPESA_B2C_RESULT_URL,
    }

    missing_settings = [
        name
        for name, value in required_settings.items()
        if not value
    ]

    if missing_settings:
        raise ValueError(
            f"Missing B2C settings: {', '.join(missing_settings)}"
        )

    parsed_url = urlparse(settings.MPESA_B2C_RESULT_URL)

    if (
        parsed_url.scheme != "https"
        or not parsed_url.netloc
        or not parsed_url.hostname
    ):
        raise ValueError(
            "MPESA_B2C_RESULT_URL must be a valid HTTPS URL."
        )

    callback_base = (
        f"{parsed_url.scheme}://{parsed_url.netloc}"
    )

    result_url = (
        f"{callback_base}/mpesa/b2c/status/result/"
    )

    timeout_url = (
        f"{callback_base}/mpesa/b2c/status/timeout/"
    )


    payload = {
        "Initiator": settings.MPESA_B2C_INITIATOR_NAME,
        "SecurityCredential": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "CommandID": "TransactionStatusQuery",
        "OriginalConversationID": originator_conversation_id,
        "PartyA": settings.MPESA_B2C_SHORTCODE,
        "IdentifierType": "4",
        "ResultURL": result_url,
        "QueueTimeOutURL": timeout_url,
        "Remarks": "Merigo B2C payout status reconciliation",
        "Occasion": "Payout status check",
    }


    access_token = get_b2c_access_token()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    url = f"{base_url}/mpesa/transactionstatus/v1/query"

    logger.info(
        "Submitting Daraja Transaction Status query. "
        "OriginalConversationID=%s, IdentifierType=%s, PartyA=%s",
        originator_conversation_id,
        payload["IdentifierType"],
        settings.MPESA_B2C_SHORTCODE,
    )

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )

        if not response.ok:
            logger.error(
                "Daraja Transaction Status HTTP error. "
                "Status: %s, Response: %s",
                response.status_code,
                response.text[:1000],
            )

            response.raise_for_status()

        try:
            data = response.json()
        except ValueError as exc:
            raise RuntimeError(
                "Daraja returned an invalid Transaction Status response."
            ) from exc

        if not isinstance(data, dict):
            raise RuntimeError(
                "Daraja returned an invalid Transaction Status response."
            )

        logger.info(
            "Daraja Transaction Status query acknowledgement received. "
            "OriginalConversationID=%s, QueryOriginatorConversationID=%s, "
            "QueryConversationID=%s, ResponseCode=%s",
            originator_conversation_id,
            data.get("OriginatorConversationID"),
            data.get("ConversationID"),
            data.get("ResponseCode"),
        )

        return data

    except requests.RequestException as exc:
        logger.exception(
            "Daraja Transaction Status request failed."
        )

        raise RuntimeError(
            "Could not request the B2C transaction status."
        ) from exc
