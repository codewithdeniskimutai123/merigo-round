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
    group_remove_member,
    group_archive,
    group_leave_request,
    group_cancel_leave_request,
    group_pending_leave_requests,
    group_approve_leave_request,
    group_reject_leave_request,
    group_cycles,
    group_cycle_create,
    cycle_update,
    cycle_draw_options,
    cycle_draw_select,
    cycle_swap_request,
    cycle_swap_accept,
    cycle_swap_reject,
    cycle_order_finalize,
    cycle_rounds_create,
    cycle_activate,
    cycle_next_round_activate,
    cycle_rounds_list,
    cycle_overview,
    cycle_order_details,
    cycle_my_round,
    cycle_round_extend_date,
    cycle_round_date_history,
    cycle_contributions_list,
    contribution_payment_initiate,
    contribution_payment_status,
    cycle_payment_history,
    cycle_payment_history_download,
    contribution_waive,
)

urlpatterns = [
    # Group management
    path("groups/", group_list, name="group-list"),
    path("groups/create/", group_create, name="group-create"),
    path("groups/<int:pk>/", group_detail, name="group-detail"),
    path("groups/<int:pk>/update/", group_update, name="group-update"),
    path("groups/<int:pk>/delete/", group_delete, name="group-delete"),
    path("groups/<int:group_id>/archive/", group_archive, name="group-archive"),

    # Group membership
    path("groups/<int:pk>/join/", group_join_request, name="group-join-request"),
    path("groups/<int:pk>/cancel-join/", group_cancel_join_request, name="group-cancel-join-request"),
    path("groups/<int:pk>/members/<int:membership_id>/approve/", group_approve_member, name="group-approve-member"),
    path("groups/<int:pk>/members/<int:membership_id>/reject/", group_reject_member, name="group-reject-member"),
    path("groups/<int:group_id>/members/<int:membership_id>/remove/", group_remove_member, name="group-remove-member"),
    path("groups/<int:pk>/members/", group_members, name="group-members"),
    path("groups/<int:pk>/pending-members/", group_pending_members, name="group-pending-members"),
    path("groups/<int:pk>/my-membership-history/", group_my_membership_history, name="group-my-membership-history"),

    # Member leave requests
    path("groups/<int:pk>/leave-request/", group_leave_request, name="group-leave-request"),
    path("groups/<int:pk>/leave-request/cancel/", group_cancel_leave_request, name="group-cancel-leave-request"),
    path("groups/<int:pk>/leave-requests/", group_pending_leave_requests, name="group-pending-leave-requests"),
    path("groups/<int:pk>/members/<int:membership_id>/leave/approve/", group_approve_leave_request, name="group-approve-leave-request"),
    path("groups/<int:pk>/members/<int:membership_id>/leave/reject/", group_reject_leave_request, name="group-reject-leave-request"),

    # Cycle management
    path("groups/<int:pk>/cycles/", group_cycles, name="group-cycles"),
    path("groups/<int:pk>/cycles/create/", group_cycle_create, name="group-cycle-create"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/update/", cycle_update, name="cycle-update"),

    # Cycle draw
    path("groups/<int:pk>/cycles/<int:cycle_id>/draw/options/", cycle_draw_options, name="cycle-draw-options"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/draw/select/", cycle_draw_select, name="cycle-draw-select"),

    # Cycle position swaps
    path("groups/<int:pk>/cycles/<int:cycle_id>/swaps/", cycle_swap_request, name="cycle-swaps"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/swaps/<int:swap_id>/accept/", cycle_swap_accept, name="cycle-swap-accept"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/swaps/<int:swap_id>/reject/", cycle_swap_reject, name="cycle-swap-reject"),

    # Cycle order and rounds
    path("groups/<int:pk>/cycles/<int:cycle_id>/finalize-order/", cycle_order_finalize, name="cycle-order-finalize"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/rounds/create/", cycle_rounds_create, name="cycle-rounds-create"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/activate/", cycle_activate, name="cycle-activate"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/rounds/activate-next/", cycle_next_round_activate, name="cycle-next-round-activate"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/rounds/", cycle_rounds_list, name="cycle-rounds-list"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/overview/", cycle_overview, name="cycle-overview"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/order/", cycle_order_details, name="cycle-order-details"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/my-round/", cycle_my_round, name="cycle-my-round"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/contributions/", cycle_contributions_list, name="cycle-contributions-list"),

    # Round date management
    path("cycles/<int:cycle_id>/rounds/<int:round_id>/extend-date/", cycle_round_extend_date, name="cycle-round-extend-date"),
    path("cycles/<int:cycle_id>/rounds/<int:round_id>/date-history/", cycle_round_date_history, name="cycle-round-date-history"),


    # Contribution Payments
    path("payments/contributions/initiate/", contribution_payment_initiate, name="contribution-payment-initiate"),
    path("payments/transactions/<int:transaction_id>/status/", contribution_payment_status, name="contribution-payment-status"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/payments/", cycle_payment_history, name="cycle-payment-history"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/payments/download/", cycle_payment_history_download, name="cycle-payment-history-download"),
    path("groups/<int:pk>/cycles/<int:cycle_id>/contributions/<int:contribution_id>/waive/", contribution_waive, name="contribution-waive"),
]