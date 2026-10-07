# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.core.signing import TimestampSigner, BadSignature
from accounts.models import User
from lms_core.email_utils import EmailDeliveryError
from rbac.models import Role
from organizations.models import Organization, OrganizationMember

TEST_PASSCODE = "test-passcode"
UPDATED_PASSCODE = "updated-passcode-123"
SUPERUSER_PASSCODE = "superuser-test-passcode"

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def db_setup(db):
    org = Organization.objects.create(name="Test Org", is_active=True, slug="test")
    inactive_org = Organization.objects.create(name="Inactive Org", is_active=False, slug="inactive")
    
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    Role.objects.get_or_create(name="superadmin")
    
    active_user = User.objects.create_user(email="active@test.com", password=TEST_PASSCODE, is_active=True)
    inactive_user = User.objects.create_user(email="inactive@test.com", password=TEST_PASSCODE, is_active=False)
    
    # User in inactive org
    user_inactive_org = User.objects.create_user(email="inactive_org@test.com", password=TEST_PASSCODE)
    OrganizationMember.objects.create(user=user_inactive_org, organization=inactive_org, role=admin_role)
    
    # User with inactive membership
    user_inactive_mem = User.objects.create_user(email="inactive_mem@test.com", password=TEST_PASSCODE)
    OrganizationMember.objects.create(user=user_inactive_mem, organization=org, role=admin_role, is_active=False)
    
    return {
        "org": org,
        "inactive_org": inactive_org,
        "active_user": active_user,
        "inactive_user": inactive_user,
        "user_inactive_org": user_inactive_org,
        "user_inactive_mem": user_inactive_mem
    }

@pytest.mark.django_db
@patch('django.contrib.auth.authenticate')
def test_login_inactive_user(mock_auth, api_client, db_setup):
    mock_auth.return_value = db_setup["inactive_user"]
    url = reverse('login')
    data = {"email": "inactive@test.com", "password": TEST_PASSCODE}
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Account is inactive. Please contact support."

@pytest.mark.django_db
def test_login_inactive_org(api_client, db_setup):
    url = reverse('login')
    data = {"email": "inactive_org@test.com", "password": TEST_PASSCODE}
    response = api_client.post(url, data, HTTP_HOST="inactive.localhost")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    # Org is inactive, so user has no active memberships
    assert "Your account or organization is currently inactive" in response.data["detail"]

@pytest.mark.django_db
def test_login_inactive_membership(api_client, db_setup):
    url = reverse('login')
    data = {"email": "inactive_mem@test.com", "password": TEST_PASSCODE}
    response = api_client.post(url, data, HTTP_HOST="test.localhost")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    # Membership is inactive
    assert "Your account or organization is currently inactive" in response.data["detail"]

@pytest.mark.django_db
def test_logout_missing_token(api_client, db_setup):
    api_client.force_authenticate(user=db_setup["active_user"])
    url = reverse('logout')
    response = api_client.post(url, {})
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_logout_invalid_token(api_client, db_setup):
    api_client.force_authenticate(user=db_setup["active_user"])
    url = reverse('logout')
    response = api_client.post(url, {"refresh": "invalid_token"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_accept_invite_bad_signature(api_client):
    url = reverse('accept_invite')
    response = api_client.post(url, {"token": "bad-token", "password": UPDATED_PASSCODE})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Invalid invite link."

@pytest.mark.django_db
def test_accept_invite_expired_token(api_client):
    signer = TimestampSigner()
    # Sign something a long time ago (more than 7 days)
    token = signer.sign("test@email.com")
    
    # We need to manually construct a token with an old timestamp or mock the unsign
    with patch('django.core.signing.TimestampSigner.unsign', side_effect=BadSignature("Expired")):
        url = reverse('accept_invite')
        response = api_client.post(url, {"token": token, "password": TEST_PASSCODE})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_accept_invite_user_not_found(api_client):
    signer = TimestampSigner()
    token = signer.sign("nonexistent@test.com")
    url = reverse('accept_invite')
    response = api_client.post(url, {"token": token, "password": TEST_PASSCODE})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "User not found."

@pytest.mark.django_db
@patch('accounts.views.send_html_email_via_ses')
def test_forgot_password_email_delivery_error(mock_send, api_client, db_setup):
    mock_send.side_effect = EmailDeliveryError(detail="Email delivery failed.")
    url = reverse('forgot_password')
    data = {"email": "active@test.com"}
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
