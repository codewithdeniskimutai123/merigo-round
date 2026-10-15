from django.urls import path

from .views import mpesa_callback
from .b2c_views import b2c_result_callback, b2c_timeout_callback


urlpatterns = [
    path("callback/", mpesa_callback, name="mpesa_callback"),
    path("b2c/result/", b2c_result_callback, name="b2c-result"),
    path("b2c/timeout/", b2c_timeout_callback, name="b2c-timeout"),
]