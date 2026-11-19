from django.urls import path

from .views import mpesa_callback
from .b2c_views import (
    b2c_result_callback,
    b2c_timeout_callback,
    b2c_status_result_callback,
    b2c_status_timeout_callback,
)

urlpatterns = [
    path("stk/callback/", mpesa_callback, name="mpesa_callback"),
    path("payouts/result/", b2c_result_callback, name="b2c-result"),
    path("payouts/timeout/", b2c_timeout_callback, name="b2c-timeout"),
    path("payouts/status-result/", b2c_status_result_callback, name="b2c-status-result"),
    path("payouts/status-timeout/", b2c_status_timeout_callback, name="b2c-status-timeout"),
]
