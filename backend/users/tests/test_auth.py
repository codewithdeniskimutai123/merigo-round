from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


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