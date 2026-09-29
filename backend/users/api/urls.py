from django.urls import path

from .views import register, me
from rest_framework_simplejwt.views import (TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("register/", register, name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(),name="token_refresh"),
    path("me/", me, name="me"),
]