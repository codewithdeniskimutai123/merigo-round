from rest_framework import serializers

from groups.models import Group

class GroupSerializer(serializers.ModelSerializer):
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
                "created_at",
                "updated_at",
            ]

            read_only_fields = [
                "id",
                "created_by",
                "status",
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


