import logging
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import transaction
from django.utils.crypto import get_random_string
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .serializers import (UserRegistrationSerializer, 
                          UserSerializer, 
                          ChangePasswordSerializer,
                          ForgotPasswordSerializer,
                          ResetPasswordSerializer,
                          GoogleOAuthSerializer)
from django.utils import timezone
from users.services import invalidate_user_refresh_tokens
from django.contrib.auth import get_user_model
from users.services import (
    invalidate_user_refresh_tokens,
    create_password_reset_token,
    send_password_reset_email,
    reset_password,
)

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(
        data=request.data
    )

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )



@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "GET":
        return Response(
            UserSerializer(request.user).data
        )
    serializer = UserSerializer(
        request.user, data=request.data, partial=True
    )

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            UserSerializer(user).data
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={"request": request},
    )

    if serializer.is_valid():
        request.user.set_password(
            serializer.validated_data["new_password"]
        )
        request.user.password_changed_at = timezone.now()
        request.user.save()
        invalidate_user_refresh_tokens(request.user)

        return Response(
            {
                "detail": "Password changed successfully."
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    serializer = ForgotPasswordSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = serializer.validated_data["email"]

    User = get_user_model()

    user = User.objects.filter(
        email=email
    ).first()

    if user:
        raw_token, reset_token = create_password_reset_token(
            user
        )

        reset_link = (
            f"{settings.FRONTEND_URL}"
            f"/reset-password?token={raw_token}"
        )

        send_password_reset_email(
                    user,
                    reset_link,
                )

    return Response(
        {
            "detail": (
                "If an account with that email exists, "
                "a password reset link has been sent."
            )
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password_view(request):
    serializer = ResetPasswordSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        reset_password(
            raw_token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
        )

    except ValueError as exc:
        return Response(
            {
                "detail": str(exc)
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Password has been reset successfully."
        },
        status=status.HTTP_200_OK,
    )

logger = logging.getLogger(__name__)
User = get_user_model()

@api_view(["POST"])
@permission_classes([AllowAny])
def google_oauth(request):
    serializer = GoogleOAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    raw_token = serializer.validated_data["token"]

    try:
        id_info = id_token.verify_oauth2_token(
            raw_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        email = id_info.get("email")
        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")

        if not email:
            return Response(
                {"error": "Google account payload is missing a primary email address."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            user = User.objects.filter(email=email).first()
            if user is None:
                base_username = email.split("@")[0]
                username = base_username
                
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_unusable_password()
                user.save()
                logger.info("New profile registered via Google OAuth: %s", email)
            else:
                logger.info("Existing profile authenticated via Google OAuth: %s", email)

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_200_OK)

    except ValueError:
        logger.warning("Failed Google OAuth handshake attempt: Invalid token signature.")
        return Response(
            {"error": "Invalid or expired Google authentication token signature."},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as exc:
        logger.error("System-level Google OAuth failure: %s", str(exc))
        return Response(
            {"error": "Authentication server communication failure. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )