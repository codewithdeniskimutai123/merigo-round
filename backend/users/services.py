from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)

import hashlib
import secrets

from datetime import timedelta

from django.utils import timezone

from .models import PasswordResetToken


def invalidate_user_refresh_tokens(user):
    outstanding_tokens = OutstandingToken.objects.filter(
        user=user
    )

    for token in outstanding_tokens:
        BlacklistedToken.objects.get_or_create(
            token=token
        )

def create_password_reset_token(user):
    raw_token = secrets.token_urlsafe(48)

    token_hash = hashlib.sha256(
        raw_token.encode()
    ).hexdigest()

    reset_token = PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=timezone.now() + timedelta(minutes=15),
    )

    return raw_token, reset_token

def verify_password_reset_token(raw_token):
    token_hash = hashlib.sha256(
        raw_token.encode()
    ).hexdigest()

    try:
        reset_token = PasswordResetToken.objects.select_related(
            "user"
        ).get(
            token_hash=token_hash
        )
    except PasswordResetToken.DoesNotExist:
        return None

    if reset_token.used_at is not None:
        return None

    if timezone.now() >= reset_token.expires_at:
        return None

    return reset_token