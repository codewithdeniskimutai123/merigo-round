from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch
from users.models import PasswordResetToken
from users.services import create_password_reset_token

User = get_user_model()


class AuthenticationTests(APITestCase):

    def setUp(self):
        self.user_data = {
            "username": "testauth",
            "email": "testauth@example.com",
            "phone_number": "0799001122",
            "password": "StrongPassword123",
        }

    def test_user_registration(self):
        response = self.client.post(
            "/api/auth/register/",
            self.user_data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            User.objects.filter(
                username="testauth"
            ).exists()
        )

    def test_user_login(self):
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_data["username"],
                "password": self.user_data["password"],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_authenticated_user_can_access_me(self):
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_data["username"],
                "password": self.user_data["password"],
            },
            format="json",
        )

        access_token = response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}"
        )

        response = self.client.get(
            "/api/auth/me/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["id"],
            user.id,
        )

        self.assertEqual(
            response.data["username"],
            user.username,
        )
    def test_unauthenticated_user_cannot_access_me(self):
        response = self.client.get(
            "/api/auth/me/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_refresh_token(self):
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_data["username"],
                "password": self.user_data["password"],
            },
            format="json",
        )

        refresh_token = login_response.data["refresh"]

        response = self.client.post(
            "/api/auth/refresh/",
            {
                "refresh": refresh_token,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "access",
            response.data,
        )

    def test_refresh_token_rotation(self):
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_data["username"],
                "password": self.user_data["password"],
            },
            format="json",
        )

        refresh_token = login_response.data["refresh"]

        first_refresh_response = self.client.post(
            "/api/auth/refresh/",
            {
                "refresh": refresh_token,
            },
            format="json",
        )

        self.assertEqual(
            first_refresh_response.status_code,
            status.HTTP_200_OK,
        )

        new_refresh_token = first_refresh_response.data["refresh"]

        second_refresh_response = self.client.post(
            "/api/auth/refresh/",
            {
                "refresh": refresh_token,
            },
            format="json",
        )

        self.assertEqual(
            second_refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertNotEqual(
            refresh_token,
            new_refresh_token,
        )


    def test_login_with_wrong_password(self):
        User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_data["username"],
                "password": "WrongPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


    def test_duplicate_username_registration(self):
        User.objects.create_user(
            username=self.user_data["username"],
            email="first@example.com",
            phone_number="0700000001",
            password=self.user_data["password"],
        )

        response = self.client.post(
            "/api/auth/register/",
            {
                "username": self.user_data["username"],
                "email": "second@example.com",
                "phone_number": "0700000002",
                "password": self.user_data["password"],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_authenticated_user_can_update_profile(self):
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/auth/me/",
            {
                "phone_number": "0711111111",
                "email": "updated@example.com",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        user.refresh_from_db()

        self.assertEqual(
            user.phone_number,
            "0711111111",
        )

        self.assertEqual(
            user.email,
            "updated@example.com",
        )

    def test_user_cannot_update_protected_profile_fields(self):
        user = User.objects.create_user(
            username=self.user_data["username"],
            email=self.user_data["email"],
            phone_number=self.user_data["phone_number"],
            password=self.user_data["password"],
        )

        original_id = user.id

        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/auth/me/",
            {
                "username": "hackername",
                "id": 999,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        user.refresh_from_db()

        self.assertEqual(
            user.username,
            "testauth",
        )

        self.assertEqual(
            user.id,
            original_id,
        )

    def test_old_access_token_is_invalid_after_password_change(self):
        user = get_user_model().objects.create_user(
            username="passwordtest",
            email="passwordtest@example.com",
            phone_number="0712345678",
            password="OldPassword123",
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "passwordtest",
                "password": "OldPassword123",
            },
            format="json",
        )

        access_token = login_response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}"
        )

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 401)

    def test_old_refresh_token_is_invalid_after_password_change(self):
        user = get_user_model().objects.create_user(
            username="refresh_test",
            email="refresh_test@example.com",
            phone_number="0723456789",
            password="OldPassword123",
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "refresh_test",
                "password": "OldPassword123",
            },
            format="json",
        )

        refresh_token = login_response.data["refresh"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/refresh/",
            {
                "refresh": refresh_token,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_change_password_with_wrong_current_password(self):
        user = get_user_model().objects.create_user(
            username="wrong_current",
            email="wrong_current@example.com",
            phone_number="0734567890",
            password="OldPassword123",
        )

        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "WrongPassword123",
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("current_password", response.data)


    def test_change_password_with_mismatched_passwords(self):
        user = get_user_model().objects.create_user(
            username="mismatch",
            email="mismatch@example.com",
            phone_number="0745678901",
            password="OldPassword123",
        )

        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123",
                "confirm_password": "DifferentPassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)


    def test_unauthenticated_user_cannot_change_password(self):
        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_registration_password_is_hashed(self):
        response = self.client.post(
            "/api/auth/register/",
            self.user_data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        user = User.objects.get(
            username="testauth"
        )

        self.assertNotEqual(
            user.password,
            self.user_data["password"],
        )

        self.assertTrue(
            user.check_password(
                self.user_data["password"]
            )
        )

    def test_registration_password_is_not_returned(self):
        response = self.client.post(
            "/api/auth/register/",
            self.user_data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertNotIn(
            "password",
            response.data,
        )

    def test_registration_rejects_short_password(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                **self.user_data,
                "password": "short",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_new_password_works_after_change(self):
        user = User.objects.create_user(
            username="new_password",
            email="new_password@example.com",
            phone_number="0756789012",
            password="OldPassword123",
        )

        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.client.force_authenticate(
            user=None
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "new_password",
                "password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            login_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "access",
            login_response.data,
        )

    @patch("users.api.views.send_password_reset_email")
    def test_forgot_password_existing_email(
        self,
        mock_send_email,
    ):
        User.objects.create_user(
            username="forgot_user",
            email="forgot@example.com",
            phone_number="0767890123",
            password="OldPassword123",
        )

        response = self.client.post(
            "/api/auth/forgot-password/",
            {
                "email": "forgot@example.com",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "detail",
            response.data,
        )

        self.assertEqual(
            PasswordResetToken.objects.filter(
                user__username="forgot_user"
            ).count(),
            1,
        )

        mock_send_email.assert_called_once()

        
    def test_forgot_password_nonexistent_email_returns_generic_response(self):
        response = self.client.post(
            "/api/auth/forgot-password/",
            {
                "email": "doesnotexist@example.com",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["detail"],
            (
                "If an account with that email exists, "
                "a password reset link has been sent."
            ),
        )

        self.assertEqual(
            PasswordResetToken.objects.count(),
            0,
        )

    def test_reset_token_is_stored_as_hash(self):
        user = User.objects.create_user(
            username="hash_test",
            email="hash@example.com",
            phone_number="0778901234",
            password="OldPassword123",
        )

        raw_token, reset_token = (
            create_password_reset_token(user)
        )

        self.assertNotEqual(
            reset_token.token_hash,
            raw_token,
        )

        self.assertEqual(
            len(reset_token.token_hash),
            64,
        )

    def test_valid_reset_token_changes_password(self):
        user = User.objects.create_user(
            username="reset_user",
            email="reset@example.com",
            phone_number="0789012345",
            password="OldPassword123",
        )

        raw_token, reset_token = (
            create_password_reset_token(user)
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        user.refresh_from_db()

        self.assertTrue(
            user.check_password(
                "NewPassword123"
            )
        )

        reset_token.refresh_from_db()

        self.assertIsNotNone(
            reset_token.used_at
        )

    def test_new_password_works_after_reset(self):
        User.objects.create_user(
            username="reset_login",
            email="reset_login@example.com",
            phone_number="0790123456",
            password="OldPassword123",
        )

        user = User.objects.get(
            username="reset_login"
        )

        raw_token, _ = (
            create_password_reset_token(user)
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "reset_login",
                "password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            login_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "access",
            login_response.data,
        )

    def test_old_password_does_not_work_after_reset(self):
        User.objects.create_user(
            username="old_password",
            email="old_password@example.com",
            phone_number="0701234567",
            password="OldPassword123",
        )

        user = User.objects.get(
            username="old_password"
        )

        raw_token, _ = (
            create_password_reset_token(user)
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "old_password",
                "password": "OldPassword123",
            },
            format="json",
        )

        self.assertEqual(
            login_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_used_reset_token_cannot_be_reused(self):
        user = User.objects.create_user(
            username="reuse_token",
            email="reuse@example.com",
            phone_number="0712345670",
            password="OldPassword123",
        )

        raw_token, _ = (
            create_password_reset_token(user)
        )

        first_response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )

        second_response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "AnotherPassword123",
                "confirm_password": "AnotherPassword123",
            },
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            second_response.data["detail"],
            "Invalid or expired password reset token.",
        )

    def test_invalid_reset_token_is_rejected(self):
        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": "invalid-token-123",
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "Invalid or expired password reset token.",
        )

    def test_expired_reset_token_is_rejected(self):
        user = User.objects.create_user(
            username="expired_token",
            email="expired@example.com",
            phone_number="0723456701",
            password="OldPassword123",
        )

        raw_token, reset_token = (
            create_password_reset_token(user)
        )

        reset_token.expires_at = (
            timezone.now() - timedelta(minutes=1)
        )

        reset_token.save(
            update_fields=["expires_at"]
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "Invalid or expired password reset token.",
        )

    def test_reset_password_with_mismatched_passwords(self):
        user = User.objects.create_user(
            username="reset_mismatch",
            email="reset_mismatch@example.com",
            phone_number="0734567012",
            password="OldPassword123",
        )

        raw_token, _ = (
            create_password_reset_token(user)
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "DifferentPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "confirm_password",
            response.data,
        )

    def test_reset_password_invalidates_old_access_token(self):
        user = User.objects.create_user(
            username="reset_access",
            email="reset_access@example.com",
            phone_number="0745678012",
            password="OldPassword123",
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "reset_access",
                "password": "OldPassword123",
            },
            format="json",
        )

        access_token = login_response.data["access"]

        raw_token, _ = (
            create_password_reset_token(user)
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}"
        )

        response = self.client.get(
            "/api/auth/me/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_reset_password_invalidates_old_refresh_token(self):
        user = User.objects.create_user(
            username="reset_refresh",
            email="reset_refresh@example.com",
            phone_number="0756789012",
            password="OldPassword123",
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "reset_refresh",
                "password": "OldPassword123",
            },
            format="json",
        )

        refresh_token = login_response.data["refresh"]

        raw_token, _ = (
            create_password_reset_token(user)
        )

        response = self.client.post(
            "/api/auth/reset-password/",
            {
                "token": raw_token,
                "new_password": "NewPassword123",
                "confirm_password": "NewPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        response = self.client.post(
            "/api/auth/refresh/",
            {
                "refresh": refresh_token,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    @patch("users.api.views.id_token.verify_oauth2_token")
    def test_google_oauth_registers_new_user_successfully(self, mock_verify):
        mock_verify.return_value = {
            "email": "denis.kimutai@gmail.com",
            "given_name": "Denis",
            "family_name": "Kimutai",
            "iss": "://google.com",
            "sub": "google-unique-sub-12345",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"token": "mock_raw_frontend_token_xyz"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "denis.kimutai@gmail.com")

        self.assertTrue(User.objects.filter(email="denis.kimutai@gmail.com").exists())
        
        new_user = User.objects.get(email="denis.kimutai@gmail.com")
        self.assertFalse(new_user.has_usable_password())

    @patch("users.api.views.id_token.verify_oauth2_token")
    def test_google_oauth_logs_in_existing_user_successfully(self, mock_verify):
        """Verifies that a returning Google user is authenticated without spawning duplicate accounts."""
        existing_user = User.objects.create_user(
            username="denis.kimutai",
            email="denis.kimutai@gmail.com",
            first_name="Denis",
            last_name="Kimutai"
        )
        existing_user.set_unusable_password()
        existing_user.save()

        mock_verify.return_value = {
            "email": "denis.kimutai@gmail.com",
            "given_name": "Denis",
            "family_name": "Kimutai",
            "iss": "://google.com",
            "sub": "google-unique-sub-12345",
        }

        response = self.client.post(
            "/api/auth/google/",
            {"token": "another_mock_token_abc"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email="denis.kimutai@gmail.com").count(), 1)

    @patch("users.api.views.id_token.verify_oauth2_token")
    def test_google_oauth_rejects_invalid_or_expired_token_signature(self, mock_verify):
        """Verifies that a tampered or bad Google token signature gets caught by the firewall block."""
        mock_verify.side_effect = ValueError("Invalid token signature")

        response = self.client.post(
            "/api/auth/google/",
            {"token": "malicious_tampered_token_string"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid or expired Google authentication token signature.")
