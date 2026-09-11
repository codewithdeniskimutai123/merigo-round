import requests

from django.conf import settings

from .authentication import get_daraja_access_token
from .stk_push import generate_timestamp, generate_password


def query_stk_push(checkout_request_id):
    access_token = get_daraja_access_token()

    timestamp = generate_timestamp()

    password = generate_password(timestamp)

    if settings.MPESA_ENVIRONMENT == "production":
        base_url = "https://api.safaricom.co.ke"
    else:
        base_url = "https://sandbox.safaricom.co.ke"

    url = f"{base_url}/mpesa/stkpushquery/v1/query"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
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
            "Could not connect to the M-Pesa STK Query API."
        ) from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"STK Query request failed: "
            f"{response.status_code} - {response.text}"
        )

    return response.json()