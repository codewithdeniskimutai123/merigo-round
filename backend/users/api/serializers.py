from django.contrib.auth import get_user_model
from rest_framework import serializers
from groups.models import GroupMembership

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField( write_only=True, min_length=8,)
    phone_number = serializers.CharField(
    max_length=20,
    required=False,
    allow_blank=True,
    allow_null=True,
)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone_number",
            "password",
        ]
        read_only_fields = [
            "id",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    is_profile_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "phone_number",
            "profile_photo",
            "created_at",
            "updated_at",
            "is_profile_complete",
        ]
        read_only_fields = [
            "id",
            "username",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        user = self.instance

        if user is None:
            return attrs

        owns_group = user.created_groups.exists()

        has_active_membership = user.group_memberships.filter(
            status=GroupMembership.Status.ACTIVE
        ).exists()

        if owns_group or has_active_membership:
            required_fields = [
                "first_name",
                "last_name",
                "email",
                "phone_number",
            ]

            errors = {}

            for field in required_fields:
                value = attrs.get(field, getattr(user, field))

                if value is None or not str(value).strip():
                    errors[field] = (
                        "This field cannot be empty because you "
                        "own a group or have an active group membership."
                    )

            if errors:
                raise serializers.ValidationError(errors)

        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField( write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Passwords do not match."
                }
            )

        if not self.context["request"].user.check_password(
            attrs["current_password"]
        ):
            raise serializers.ValidationError(
                {
                    "current_password": "Current password is incorrect."
                }
            )

        return attrs

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()




class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True )
    new_password = serializers.CharField(write_only=True, min_length=8 )
    confirm_password = serializers.CharField( write_only=True)
    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Passwords do not match."
                }
            )

        return attrs


class GoogleOAuthSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, 
                                  allow_blank=False, 
                                  error_messages={"required":"Google auth token is strictly required."})

    