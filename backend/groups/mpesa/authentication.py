import base64

import requests
from django.conf import settings
from django.core.cache import cache


class DarajaAuthenticationError(Exception):
    """Raised when Daraja OAuth authentication fails."""
    pass


def get_daraja_access_token():
    cache_key = (
        f"daraja_access_token:{settings.MPESA_ENVIRONMENT}"
    )

    # Check Redis first
    access_token = cache.get(cache_key)

    if access_token:
        return access_token

    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    if not consumer_key or not consumer_secret:
        raise DarajaAuthenticationError(
            "Daraja Consumer Key or Consumer Secret is missing."
        )

    credentials = f"{consumer_key}:{consumer_secret}"

    encoded_credentials = base64.b64encode(
        credentials.encode("utf-8")
    ).decode("utf-8")

    if settings.MPESA_ENVIRONMENT == "production":
        base_url = "https://api.safaricom.co.ke"
    else:
        base_url = "https://sandbox.safaricom.co.ke"

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
    except requests.RequestException as exc:
        raise DarajaAuthenticationError(
            "Could not connect to Daraja."
        ) from exc

    if response.status_code != 200:
        raise DarajaAuthenticationError(
            f"Daraja authentication failed: "
            f"{response.status_code} - {response.text}"
        )

    data = response.json()

    access_token = data.get("access_token")
    expires_in = data.get("expires_in")

    if not access_token:
        raise DarajaAuthenticationError(
            "Daraja response did not contain an access token."
        )

    if not expires_in:
        raise DarajaAuthenticationError(
            "Daraja response did not contain token expiry information."
        )

    cache_timeout = max(int(expires_in) - 60, 1)

    cache.set(
        cache_key,
        access_token,
        timeout=cache_timeout,
    )

    return access_token