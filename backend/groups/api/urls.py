from django.urls import path
from .views import (
    group_list,
    group_create,
    group_detail,
    group_join_request,
    group_cancel_join_request,
    group_approve_member,
    group_pending_members,
    group_members,
)

urlpatterns = [
    path("groups/", group_list, name="group-list"),
    path("groups/create/", group_create, name="group-create"),
    path("groups/<int:pk>/", group_detail, name="group-detail"),
    path("groups/<int:pk>/join/", group_join_request, name="group-join-request"),
    path("groups/<int:pk>/cancel-join/", group_cancel_join_request, name="group-cancel-join-request"),
    path("groups/<int:pk>/members/<int:membership_id>/approve/", group_approve_member, name="group-approve-member"),
    path("groups/<int:pk>/pending-members/", group_pending_members, name="group-pending-members"),
    path("groups/<int:pk>/members/", group_members, name="group-members"),
]