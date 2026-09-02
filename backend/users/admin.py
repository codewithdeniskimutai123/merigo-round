from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "id",
        "username",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "is_active",
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Custom Information",
            {
                "fields": ("phone_number", "profile_photo"),
            },
        ),
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            "Custom Information",
            {
                "fields": ("phone_number", "profile_photo"),
            },
        ),
    )
