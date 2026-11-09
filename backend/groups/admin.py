from django.contrib import admin
from .models import Group, GroupMembership, Cycle, Round


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "created_by",
        "contribution_amount",
        "frequency",
        "status",
        "created_at",
    )


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "group",
        "role",
        "status",
        "joined_at",
    )


@admin.register(Cycle)
class CycleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "group",
        "cycle_number",
        "start_date",
        "end_date",
        "status",
        "order_status",
    )

@admin.register(Round)
class RoundAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "cycle",
        "round_number",
        "recipient",
        "start_date",
        "due_date",
        "status",
        "expected_payout_amount",
    )

   