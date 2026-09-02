from django.contrib import admin
from .models import Group, GroupMembership


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