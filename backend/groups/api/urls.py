from django.urls import path
from .views import (
    group_list,
    group_create,
    group_detail,
    group_update,
    group_delete,
    group_join_request,
    group_cancel_join_request,
    group_approve_member,
    group_reject_member,
    group_my_membership_history,
    group_pending_members,
    group_members,
)

urlpatterns = [
    path("groups/", group_list, name="group-list"),
    path("groups/create/", group_create, name="group-create"),
    path("groups/<int:pk>/", group_detail, name="group-detail"),
    path("groups/<int:pk>/update/", group_update, name="group-update"),
    path("groups/<int:pk>/delete/", group_delete, name="group-delete"),
    path("groups/<int:pk>/join/", group_join_request, name="group-join-request"),
    path("groups/<int:pk>/cancel-join/", group_cancel_join_request, name="group-cancel-join-request"),
    path("groups/<int:pk>/members/<int:membership_id>/approve/", group_approve_member, name="group-approve-member"),
    path("groups/<int:pk>/members/<int:membership_id>/reject/", group_reject_member, name="group-reject-member"),
    path("groups/<int:pk>/my-membership-history/", group_my_membership_history, name="group-my-membership-history"),
    path("groups/<int:pk>/pending-members/", group_pending_members, name="group-pending-members"),
    path("groups/<int:pk>/members/", group_members, name="group-members"),
]