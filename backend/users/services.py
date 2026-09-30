import hashlib
import secrets
from datetime import timedelta

import resend
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)
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


def send_password_reset_email(user, reset_link):
    resend.api_key = settings.RESEND_API_KEY

    resend.Emails.send(
        {
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [user.email],
            "subject": "Reset your Merigo Round password",
            "text": (
                "You requested a password reset for your "
                "Merigo Round account.\n\n"
                "Click the link below to reset your password:\n\n"
                f"{reset_link}\n\n"
                "This link expires in 15 minutes and can "
                "only be used once.\n\n"
                "If you did not request this password reset, "
                "you can safely ignore this email."
            ),
        }
    )



def reset_password(raw_token, new_password):
    reset_token = verify_password_reset_token(
        raw_token
    )

    if reset_token is None:
        raise ValueError(
            "Invalid or expired password reset token."
        )

    with transaction.atomic():
        user = reset_token.user

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save(
            update_fields=[
                "password",
                "password_changed_at",
            ]
        )

        invalidate_user_refresh_tokens(user)

        reset_token.used_at = timezone.now()
        reset_token.save(
            update_fields=["used_at"]
        )

    return user