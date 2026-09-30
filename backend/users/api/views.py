from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import (UserRegistrationSerializer, 
                          UserSerializer, 
                          ChangePasswordSerializer,
                          ForgotPasswordSerializer,
                          ResetPasswordSerializer,)
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