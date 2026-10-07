# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.core.signing import TimestampSigner
from unittest.mock import patch

from accounts.models import User
from rbac.models import Role, UserRole
from organizations.models import Organization, OrganizationMember

TEST_VAL = "testpass123"
WRONG_VAL = "wrong"
EXISTING_VAL = "existingpass"
NEW_VAL = "newpass456"
ADMIN_VAL = "adminpass"


@pytest.mark.django_db
def test_login_success_and_invalid_credentials():
    client = APIClient()
    
    user = User.objects.create_user(
        email="alice@lms.com",
        password=TEST_VAL,
        username="alice",
        first_name="Alice",
        last_name="Example",
        is_active=True,
    )
    org = Organization.objects.create(name="Acme", slug="acme")
    role, _ = Role.objects.get_or_create(name="student")
    OrganizationMember.objects.create(organization=org, user=user, role=role)

    url = reverse("login")

    # Successful login via subdomain
    resp = client.post(
        url, 
        {"email": "alice@lms.com", "password": TEST_VAL},
        HTTP_HOST="acme.localhost"
    )
    assert resp.status_code == 200, resp.content
    assert "access" in resp.data
    assert "refresh" in resp.data

    # Invalid password via subdomain
    resp2 = client.post(
        url, 
        {"email": "alice@lms.com", "password": WRONG_VAL},
        HTTP_HOST="acme.localhost"
    )
    assert resp2.status_code == 400
    assert resp2.data.get("detail") == "Invalid credentials."


@pytest.mark.django_db
@patch("accounts.views.send_html_email_via_ses")
def test_forgot_password_sends_reset_email(mock_send_email, settings):
    client = APIClient()
    mock_send_email.return_value = {"MessageId": "reset-1"}

    User.objects.create_user(
        email="eve@lms.com",
        password=EXISTING_VAL,
        username="eve",
        first_name="Eve",
        last_name="Example",
        is_active=True,
    )

    url = reverse("forgot_password")
    resp = client.post(url, {"email": "eve@lms.com"}, format="json")

    assert resp.status_code == 200, resp.content
    assert "detail" in resp.data
    mock_send_email.assert_called_once()
    assert "reset" in mock_send_email.call_args[1]["subject"].lower()
    assert "set-password" in mock_send_email.call_args[1]["text_body"]
    assert "token=" in mock_send_email.call_args[1]["text_body"]


@pytest.mark.django_db
def test_forgot_password_returns_success_for_unknown_email(settings):
    client = APIClient()

    url = reverse("forgot_password")
    resp = client.post(url, {"email": "missing@lms.com"}, format="json")

    assert resp.status_code == 200, resp.content
    assert resp.data["detail"] == "If an account with that email exists, a password reset link has been sent."


@pytest.mark.django_db
def test_accept_invite_activates_user_and_returns_tokens():
    client = APIClient()
    # create an invited user (inactive, unusable password)
    invited = User.objects.create_user(
        email="bob@lms.com",
        password=None,
        username="bob",
        first_name="Bob",
        last_name="Builder",
        is_active=False,
    )

    signer = TimestampSigner()
    token = signer.sign(invited.email)

    url = reverse("accept_invite")
    payload = {"token": token, "password": NEW_VAL}

    # ensure email backend uses locmem for capturing
    resp = client.post(url, payload, format="json")
    assert resp.status_code == 200, resp.content
    assert "access" in resp.data
    assert "refresh" in resp.data

    invited.refresh_from_db()
    assert invited.is_active is True
    assert invited.check_password(NEW_VAL)




@pytest.mark.django_db
def test_reinvite_deleted_user_email_resolution():
    client = APIClient()
    
    # 1. Create and then soft-delete the first user
    user1 = User.objects.create_user(
        email="test_duplicate@lms.com",
        password=None,
        username="dup1",
        first_name="First",
        last_name="User",
        is_active=False,
    )
    user1.delete()
    assert user1.is_deleted is True
    assert user1.status == User.STATUS_DELETED

    # 2. Create the second user with the same email (active/pending)
    user2 = User.objects.create_user(
        email="test_duplicate@lms.com",
        password=None,
        username="dup2",
        first_name="Second",
        last_name="User",
        is_active=False,
    )
    user2.status = User.STATUS_PENDING
    user2.save()

    signer = TimestampSigner()
    token = signer.sign(user2.email)

    url = reverse("accept_invite")
    payload = {"token": token, "password": "newpassword123"}

    resp = client.post(url, payload, format="json")
    assert resp.status_code == 200, resp.content
    assert "access" in resp.data
    assert "refresh" in resp.data

    # Re-fetch users from DB to verify states
    user1.refresh_from_db()
    user2.refresh_from_db()

    # User1 should remain soft-deleted
    assert user1.is_deleted is True
    assert user1.status == User.STATUS_DELETED

    # User2 should be successfully activated
    assert user2.is_active is True
    assert user2.status == User.STATUS_ACTIVE
    assert user2.check_password("newpassword123")

