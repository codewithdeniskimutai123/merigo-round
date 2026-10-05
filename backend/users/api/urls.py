from django.urls import path

from .views import register, me, change_password, forgot_password, reset_password_view, google_oauth
from rest_framework_simplejwt.views import (TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("register/", register, name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(),name="token_refresh"),
    path("me/", me, name="me"),
    path("change-password/", change_password, name="change_password"),
    path("forgot-password/", forgot_password, name="forgot_password"),
    path("reset-password/", reset_password_view, name="reset_password"),
    path("google/", google_oauth, name="google-oauth"),

]