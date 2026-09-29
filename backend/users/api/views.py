from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import (UserRegistrationSerializer, 
                          UserSerializer, 
                          ChangePasswordSerializer,
                          ForgotPasswordSerializer)
from django.utils import timezone
from users.services import invalidate_user_refresh_tokens
from django.contrib.auth import get_user_model
from users.services import (
    invalidate_user_refresh_tokens,
    create_password_reset_token,
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

        send_mail(
            subject="Reset your Merigo Round password",
            message=(
                "You requested a password reset for your "
                "Merigo Round account.\n\n"
                "Click the link below to reset your password:\n\n"
                f"{reset_link}\n\n"
                "This link expires in 15 minutes and can "
                "only be used once.\n\n"
                "If you did not request this password reset, "
                "you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
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