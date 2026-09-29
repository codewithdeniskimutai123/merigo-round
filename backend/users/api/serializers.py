from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField( write_only=True, min_length=8,)

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
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone_number",
            "profile_photo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "username",
            "created_at",
            "updated_at",
        ]



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