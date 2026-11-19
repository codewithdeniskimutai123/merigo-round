
import base64
import hashlib

import requests
from django.conf import settings
from django.core.cache import cache


class B2CAuthenticationError(Exception):
    """Raised when B2C OAuth authentication fails."""
    pass


def get_b2c_access_token():
    consumer_key = settings.MPESA_B2C_CONSUMER_KEY
    consumer_secret = settings.MPESA_B2C_CONSUMER_SECRET

    if not consumer_key or not consumer_secret:
        raise B2CAuthenticationError(
            "B2C Consumer Key or Consumer Secret is missing."
        )

    environment = settings.MPESA_B2C_ENVIRONMENT

    if environment == "production":
        base_url = "https://api.safaricom.co.ke"
    elif environment == "sandbox":
        base_url = "https://sandbox.safaricom.co.ke"
    else:
        raise B2CAuthenticationError(
            "MPESA_B2C_ENVIRONMENT must be 'sandbox' or 'production'."
        )

    credentials = f"{consumer_key}:{consumer_secret}"

    credentials_hash = hashlib.sha256(
        credentials.encode("utf-8")
    ).hexdigest()[:16]

    cache_key = (
        f"daraja_b2c_access_token:"
        f"{environment}:"
        f"{credentials_hash}"
    )

    access_token = cache.get(cache_key)

    if access_token:
        return access_token

    encoded_credentials = base64.b64encode(
        credentials.encode("utf-8")
    ).decode("utf-8")

    url = (
        f"{base_url}/oauth/v1/generate"
        "?grant_type=client_credentials"
    )

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()

    except requests.RequestException as exc:
        raise B2CAuthenticationError(
            "Could not authenticate the B2C Daraja application."
        ) from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise B2CAuthenticationError(
            "Daraja returned an invalid B2C authentication response."
        ) from exc

    access_token = data.get("access_token")
    expires_in = data.get("expires_in")

    if not access_token or not expires_in:
        raise B2CAuthenticationError(
            "Daraja did not return a valid B2C access token and expiry."
        )

    cache_timeout = max(int(expires_in) - 60, 1)

    cache.set(
        cache_key,
        access_token,
        timeout=cache_timeout,
    )

    return access_token
