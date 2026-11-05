from django.contrib import admin
from .models import Group, GroupMembership, Cycle


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