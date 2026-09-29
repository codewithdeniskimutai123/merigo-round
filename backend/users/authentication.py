from datetime import datetime, timezone

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class PasswordChangeAwareJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        password_changed_at = user.password_changed_at

        if password_changed_at:
            token_iat = validated_token.get("iat")

            if token_iat is None:
                raise AuthenticationFailed(
                    "Token is missing issue time."
                )

            token_issued_at = datetime.fromtimestamp(
                token_iat,
                tz=timezone.utc,
            )

            if token_issued_at < password_changed_at:
                raise AuthenticationFailed(
                    "Token was issued before the password was changed."
                )

        return user