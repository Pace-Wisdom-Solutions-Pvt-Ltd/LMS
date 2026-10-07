# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password

User = get_user_model()


@pytest.mark.django_db
def test_change_password_success():
    """Verify that authenticated user can successfully change password and it is hashed in DB."""
    user = User.objects.create_user(
        email="test_change_pass@example.com",
        password="OldSecurePassword123!",
        first_name="Test",
        last_name="User",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = "/api/auth/change-password/"
    payload = {
        "current_password": "OldSecurePassword123!",
        "new_password": "BrandNewPassword2026!",
        "confirm_password": "BrandNewPassword2026!",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data.get("detail") == "Password changed successfully."

    user.refresh_from_db()
    # Password must be stored as hash only
    assert user.password.startswith("pbkdf2_sha256$")
    assert user.password != "BrandNewPassword2026!"
    assert check_password("BrandNewPassword2026!", user.password) is True
    assert check_password("OldSecurePassword123!", user.password) is False


@pytest.mark.django_db
def test_change_password_root_url_fallback():
    """Verify that /auth/change-password/ without /api/ prefix also works."""
    user = User.objects.create_user(
        email="test_root_url@example.com",
        password="OldSecurePassword123!",
        first_name="Test",
        last_name="User",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = "/auth/change-password/"
    payload = {
        "current_password": "OldSecurePassword123!",
        "new_password": "BrandNewPassword2026!",
        "confirm_password": "BrandNewPassword2026!",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_change_password_wrong_current_password():
    """Verify error when current_password is wrong."""
    user = User.objects.create_user(
        email="test_wrong_current@example.com",
        password="OldSecurePassword123!",
        first_name="Test",
        last_name="User",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = "/api/auth/change-password/"
    payload = {
        "current_password": "IncorrectPassword999!",
        "new_password": "BrandNewPassword2026!",
        "confirm_password": "BrandNewPassword2026!",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "current_password" in response.data


@pytest.mark.django_db
def test_change_password_mismatch_confirm_password():
    """Verify error when new_password and confirm_password do not match."""
    user = User.objects.create_user(
        email="test_mismatch@example.com",
        password="OldSecurePassword123!",
        first_name="Test",
        last_name="User",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = "/api/auth/change-password/"
    payload = {
        "current_password": "OldSecurePassword123!",
        "new_password": "BrandNewPassword2026!",
        "confirm_password": "DifferentPassword2026!",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "confirm_password" in response.data


@pytest.mark.django_db
def test_change_password_same_as_current():
    """Verify error when new_password is the same as current_password."""
    user = User.objects.create_user(
        email="test_same@example.com",
        password="OldSecurePassword123!",
        first_name="Test",
        last_name="User",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = "/api/auth/change-password/"
    payload = {
        "current_password": "OldSecurePassword123!",
        "new_password": "OldSecurePassword123!",
        "confirm_password": "OldSecurePassword123!",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "new_password" in response.data


@pytest.mark.django_db
def test_change_password_unauthenticated():
    """Verify 401 Unauthorized for unauthenticated requests."""
    client = APIClient()
    url = "/api/auth/change-password/"
    payload = {
        "current_password": "OldSecurePassword123!",
        "new_password": "BrandNewPassword2026!",
        "confirm_password": "BrandNewPassword2026!",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
