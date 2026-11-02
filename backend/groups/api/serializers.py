
from rest_framework import serializers

from groups.models import Group, GroupMembership


class GroupSerializer(serializers.ModelSerializer):
    user_membership_status = serializers.CharField(
        read_only=True,
        allow_null=True,
    )

    user_membership_role = serializers.CharField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
            "created_by",
            "contribution_amount",
            "frequency",
            "start_date",
            "max_members",
            "status",
            "user_membership_status",
            "user_membership_role",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "status",
            "user_membership_status",
            "user_membership_role",
            "created_at",
            "updated_at",
        ]

    def validate_contribution_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Contribution amount must be greater than zero."
            )

        return value

    def validate_max_members(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Maximum members must be greater than zero."
            )

        return value


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)

    class Meta:
        model = GroupMembership
        fields = [
            "id",
            "user_id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "role",
            "status",
            "created_at",
        ]

        read_only_fields = fields