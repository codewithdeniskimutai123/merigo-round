import base64
from datetime import datetime

import requests
from django.conf import settings

from .authentication import get_daraja_access_token


def generate_timestamp():
    return datetime.now().strftime("%Y%m%d%H%M%S")

def generate_password(timestamp):
    
    password_string = (
        f"{settings.MPESA_SHORTCODE}"
        f"{settings.MPESA_PASSKEY}"
        f"{timestamp}"
    )

    encoded_password = base64.b64encode(
        password_string.encode("utf-8")
    ).decode("utf-8")

    return encoded_password


def initiate_stk_push(
    phone_number,
    amount,
    account_reference,
    transaction_description,
    callback_url,
):
    
    access_token = get_daraja_access_token()

    # Generate current timestamp.
    timestamp = generate_timestamp()

    # Generate M-Pesa password.
    password = generate_password(timestamp)

    # Determine Daraja environment.
    if settings.MPESA_ENVIRONMENT == "production":
        base_url = "https://api.safaricom.co.ke"
    else:
        base_url = "https://sandbox.safaricom.co.ke"

    url = (
        f"{base_url}"
        "/mpesa/stkpush/v1/processrequest"
    )

    # STK Push request headers.
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # STK Push request body.
    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": account_reference,
        "TransactionDesc": transaction_description,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise RuntimeError(
            "Could not connect to the M-Pesa STK Push API."
        ) from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"STK Push request failed: "
            f"{response.status_code} - {response.text}"
        )

    data = response.json()

    return data








