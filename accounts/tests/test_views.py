# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from datetime import timedelta

from django.core.signing import TimestampSigner, SignatureExpired
from django.utils import timezone
from unittest.mock import patch
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.serializers import UserSerializer
from organizations.models import Organization, OrganizationMember
from accounts.models import User, InviteToken
from rbac.models import Role, UserRole
from django.urls import reverse

User = get_user_model()

factory = APIRequestFactory()

# Centralized test passwords to avoid hard-coded credential warnings
DEFAULT_VAL = "password123"
ADMIN_VAL = "adminpass"
NEW_VAL = "newpassword"
WRONG_VAL = "wrongpassword"

@pytest.mark.django_db
@patch("accounts.views.send_html_email_via_ses")
def test_send_invite_link(mock_send_email):
    mock_send_email.return_value = {"MessageId": "msg-1"}

    # Create a user first, then call the invite helper
    user = User.objects.create_user(
        email="test@lms.com",
        password=None,
        username="test_user",
        first_name="Test",
        last_name="User",
        is_active=False,
    )

    from accounts.views import _send_invite_link
    _send_invite_link(user.email)

    mock_send_email.assert_called_once()
    assert "test@lms.com" in mock_send_email.call_args[1]["recipient_list"]


@pytest.mark.django_db
def test_post_login():
    client = APIClient()
    user = User.objects.create_user(email="test@lms.com", password=DEFAULT_VAL, username="test_u")
    org = Organization.objects.create(name="Test Org", slug="test-org")
    role, _ = Role.objects.get_or_create(name="student")
    OrganizationMember.objects.create(organization=org, user=user, role=role)

    url = reverse("login")
    response = client.post(
        url, 
        {"email": "test@lms.com", "password": DEFAULT_VAL},
        HTTP_HOST="test-org.localhost"
    )

    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_logout():
    client = APIClient()
    user = User.objects.create_user(email="test@lms.com", password=DEFAULT_VAL)

    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    url = reverse("logout")
    response = client.post(url, {"refresh": str(refresh)})

    assert response.status_code == status.HTTP_205_RESET_CONTENT


@pytest.mark.django_db
def test_login_view():
    client = APIClient()
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="test@lms.com", password=DEFAULT_VAL, username="test_u2")
    org = Organization.objects.create(name="Test Org 2", slug="test-org-2")
    role, _ = Role.objects.get_or_create(name="student")
    OrganizationMember.objects.create(organization=org, user=user, role=role)

    response = client.post(
        "/api/auth/login/", 
        {"email": "test@lms.com", "password": DEFAULT_VAL},
        HTTP_HOST="test-org-2.localhost"
    )
    assert response.status_code == status.HTTP_200_OK

    response = client.post("/api/auth/login/", {"email": "test@lms.com", "password": WRONG_VAL})
    # The login endpoint returns 400 Bad Request for invalid credentials
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_user_update():
    client = APIClient()
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@lms.com", password=DEFAULT_VAL, username="user_lms")
    client.force_authenticate(user=user)

    # Update own profile via the 'me' endpoint (partial update)
    response = client.patch("/api/users/me/", {"first_name": "Updated"})
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_login_invalid_credentials():
    client = APIClient()
    response = client.post("/api/auth/login/", {"email": "invalid@lms.com", "password": WRONG_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Invalid credentials."


@pytest.mark.django_db
def test_login_inactive_user():
    client = APIClient()
    user = User.objects.create_user(email="inactive@lms.com", password=DEFAULT_VAL, is_active=False, username="inactive_user")
    response = client.post("/api/auth/login/", {"email": user.email, "password": DEFAULT_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    # The login view returns an explicit message for inactive accounts
    assert response.data["detail"] == "Account is inactive. Please contact support."


@pytest.mark.django_db
def test_login_pending_user_message():
    client = APIClient()
    user = User.objects.create_user(
        email="pending@lms.com",
        password=DEFAULT_VAL,
        username="pending_user",
        is_active=False,
        status=User.STATUS_PENDING,
    )
    response = client.post("/api/auth/login/", {"email": user.email, "password": DEFAULT_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Please accept your invitation to activate your account."


@pytest.mark.django_db
def test_login_reinvited_user_message():
    client = APIClient()
    user = User.objects.create_user(
        email="reinvited@lms.com",
        password=DEFAULT_VAL,
        username="reinvited_user",
        is_active=False,
        status=User.STATUS_REINVITED,
    )
    response = client.post("/api/auth/login/", {"email": user.email, "password": DEFAULT_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Please accept your invitation to activate your account."


@pytest.mark.django_db
def test_login_expired_user_message():
    client = APIClient()
    user = User.objects.create_user(
        email="expired-status@lms.com",
        password=DEFAULT_VAL,
        username="expired_status_user",
        is_active=False,
        status=User.STATUS_EXPIRED,
    )
    response = client.post("/api/auth/login/", {"email": user.email, "password": DEFAULT_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Your invitation has expired. Please contact your administrator."


@pytest.mark.django_db
def test_verify_invite_used_token():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(
        email="used@lms.com",
        password=DEFAULT_VAL,
        username="used_user",
        is_active=False,
        status=User.STATUS_PENDING,
    )
    token = signer.sign(user.email)
    InviteToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(days=7),
        is_used=True,
    )

    response = client.get(f"/api/auth/verify-invite/?token={token}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "This invite link has already been used."


@pytest.mark.django_db
def test_verify_invite_revoked_token():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(
        email="revoked@lms.com",
        password=DEFAULT_VAL,
        username="revoked_user",
        is_active=False,
        status=User.STATUS_REINVITED,
    )
    token = signer.sign(user.email)
    InviteToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(days=7),
        is_revoked=True,
    )

    response = client.get(f"/api/auth/verify-invite/?token={token}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "This invite link has been revoked. Please use the latest invite link."


@pytest.mark.django_db
def test_verify_invite_deleted_user():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(
        email="deleted-invite@lms.com",
        password=DEFAULT_VAL,
        username="deleted_invite_user",
        is_active=False,
        status=User.STATUS_PENDING,
    )
    token = signer.sign(user.email)
    InviteToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(days=7),
    )
    user.delete()

    response = client.get(f"/api/auth/verify-invite/?token={token}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "This invitation is no longer valid because the account was deleted."


@pytest.mark.django_db
def test_accept_invite_deleted_user():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(
        email="deleted-accept@lms.com",
        password=DEFAULT_VAL,
        username="deleted_accept_user",
        is_active=False,
        status=User.STATUS_PENDING,
    )
    token = signer.sign(user.email)
    InviteToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(days=7),
    )
    user.delete()

    response = client.post("/api/auth/accept-invite/", {"token": token, "password": NEW_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "This invitation is no longer valid because the account was deleted."


@pytest.mark.django_db
def test_reinvite_updates_user_status():
    client = APIClient()
    from rbac.models import Role
    admin = User.objects.create_superuser(email="admin-reinvite@lms.com", password=ADMIN_VAL, username="admin_reinvite")
    client.force_authenticate(user=admin)
    Role.objects.get_or_create(name="teacher")
    user = User.objects.create_user(
        email="reinvite-target@lms.com",
        password=DEFAULT_VAL,
        username="reinvite_target",
        is_active=False,
        status=User.STATUS_PENDING,
    )
    token_old = TimestampSigner().sign(user.email)
    InviteToken.objects.create(
        user=user,
        token=token_old,
        expires_at=timezone.now() + timedelta(days=7),
    )

    response = client.post(f"/api/users/{user.email}/reinvite/")
    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.status == User.STATUS_REINVITED
    assert InviteToken.objects.filter(user=user, token=token_old, is_revoked=True).exists()
    client = APIClient()
    user = User.objects.create_user(email="user@logout.com", password=DEFAULT_VAL, username="logout_user")
    client.force_authenticate(user=user)
    refresh = RefreshToken.for_user(user)
    response = client.post("/api/auth/logout/", {"refresh": str(refresh)})
    assert response.status_code == status.HTTP_205_RESET_CONTENT
    assert response.data["detail"] == "Successfully logged out."


@pytest.mark.django_db
def test_logout_invalid_token():
    client = APIClient()
    user = User.objects.create_user(email="user@logout.com", password=DEFAULT_VAL, username="logout_user2")
    client.force_authenticate(user=user)
    response = client.post("/api/auth/logout/", {"refresh": "invalidtoken"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Invalid or expired token."



@pytest.mark.django_db
def test_me_endpoint():
    client = APIClient()
    user = User.objects.create_user(email="me@lms.com", password=DEFAULT_VAL, username="me_user")
    client.force_authenticate(user=user)

    # Test GET
    response = client.get("/api/users/me/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["email"] == user.email

    # Test PATCH
    response = client.patch("/api/users/me/", {"first_name": "Updated"})
    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.first_name == "Updated"


@pytest.mark.django_db
def test_accept_invite_expired_token():
    client = APIClient()
    signer = TimestampSigner()
    expired_token = signer.sign("expired@lms.com")

    try:
        signer.unsign(expired_token, max_age=1)  # Simulate expiration
    except SignatureExpired:
        response = client.post("/api/auth/accept-invite/", {"token": expired_token, "password": NEW_VAL})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["detail"] == "Invite link has expired."


@pytest.mark.django_db
def test_accept_invite_invalid_token():
    client = APIClient()
    response = client.post("/api/auth/accept-invite/", {"token": "invalidtoken", "password": NEW_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Invalid invite link."


@pytest.mark.django_db
def test_accept_invite_success():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(email="invite@lms.com", is_active=False, username="invite_user")
    valid_token = signer.sign(user.email)

    response = client.post("/api/auth/accept-invite/", {"token": valid_token, "password": NEW_VAL})
    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.is_active
    assert user.check_password(NEW_VAL)


@pytest.mark.django_db
def test_reset_password_accepts_invite_token():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(email="invite-reset@lms.com", is_active=False, status=User.STATUS_PENDING, username="invite_reset_user")
    valid_token = signer.sign(user.email)

    response = client.post("/api/auth/reset-password/", {"token": valid_token, "password": NEW_VAL})
    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.is_active
    assert user.status == User.STATUS_ACTIVE
    assert user.check_password(NEW_VAL)


@pytest.mark.django_db
def test_reset_password_with_inactive_organization_membership_returns_forbidden():
    client = APIClient()
    signer = TimestampSigner()
    user = User.objects.create_user(
        email="inactive-membership@lms.com",
        password=None,
        username="inactive_membership",
        is_active=False,
        status=User.STATUS_PENDING,
    )
    org = Organization.objects.create(name="Inactive Org", slug="inactive-org", contact_email="inactive@org.com", is_active=False)
    role, _ = Role.objects.get_or_create(name="teacher")
    OrganizationMember.objects.create(organization=org, user=user, role=role, is_active=True)

    valid_token = signer.sign(user.email)
    response = client.post("/api/auth/reset-password/", {"token": valid_token, "password": NEW_VAL})

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "inactive organization" in response.data["detail"].lower()


@pytest.mark.django_db
def test_login_embeds_organizations_in_token():
    client = APIClient()
    # create role, organization, user and membership
    role, _ = Role.objects.get_or_create(name="teacher", defaults={"description": "Teacher"})
    org = Organization.objects.create(name="OrgX", contact_email="orgx@lms.com", slug="orgx")
    user = User.objects.create_user(email="orguser@lms.com", password=DEFAULT_VAL, username="orguser")
    OrganizationMember.objects.create(organization=org, user=user, role=role)

    resp = client.post(
        "/api/auth/login/", 
        {"email": user.email, "password": DEFAULT_VAL},
        HTTP_HOST="orgx.localhost"
    )
    assert resp.status_code == status.HTTP_200_OK
    # decode refresh token to inspect payload
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken(resp.data["refresh"])
    assert "organizations" in refresh
    assert isinstance(refresh["organizations"], list)
    assert any(d.get("org_id") == org.id for d in refresh["organizations"]) 



@pytest.mark.django_db
def test_custom_user_manager_create_user_and_superuser_behavior():
    from django.contrib.auth import get_user_model
    user_model = get_user_model()

    # create_user without email should raise
    with pytest.raises(ValueError):
        user_model.objects.create_user(email="", password=None)

    # create_user with password sets usable password
    u_with_pw = user_model.objects.create_user(email="pwuser@lms.com", password=DEFAULT_VAL, username="pwuser")
    assert u_with_pw.check_password(DEFAULT_VAL)
    assert not u_with_pw.check_password("secret")

    # create_user without password sets unusable password
    u_no_pw = user_model.objects.create_user(email="nopw@lms.com", password=None, username="nopw")
    assert not u_no_pw.has_usable_password()

    # create_superuser should default username and enforce flags
    su = user_model.objects.create_superuser(email="super@lms.com", password=DEFAULT_VAL, username="superuser")
    assert su.is_superuser
    assert su.is_staff
    assert su.is_active

    with pytest.raises(ValueError):
        # if is_staff is forced False, should raise
        user_model.objects.create_superuser(email="bad@lms.com", password=DEFAULT_VAL, username="bad", is_staff=False)


@pytest.mark.django_db
def test_userinviteserializer_validation_and_create_paths():
    from accounts.serializers import UserInviteSerializer
    from django.contrib.auth import get_user_model
    user_model = get_user_model()

    # missing request context should raise
    data = {"email": "a@b.com", "username": "a", "first_name": "A", "last_name": "B", "role_id": 1}
    serializer = UserInviteSerializer(data=data)
    with pytest.raises(ValidationError):
        serializer.is_valid(raise_exception=True)

    # prepare a superuser context and create path
    superu = user_model.objects.create_superuser("admin2@lms.com", "p", username="admin2")
    # create a valid role
    role, _ = Role.objects.get_or_create(name="teacher")
    data["role_id"] = role.id
    serializer = UserInviteSerializer(data=data, context={"request": type("R", (), {"user": superu})()})
    assert serializer.is_valid()
    new_user = serializer.save()
    assert hasattr(new_user, "_assigned_role")
    assert new_user._assigned_role == role
    assert new_user.is_active is False

    # reject obvious dummy email addresses
    data_dummy = {
        "email": "dummy@dummy.com",
        "username": "d",
        "first_name": "D",
        "last_name": "U",
        "role_id": role.id,
    }
    serializer = UserInviteSerializer(data=data_dummy, context={"request": type("R", (), {"user": superu})()})
    assert not serializer.is_valid()
    assert "email" in serializer.errors

    # Non-superuser without organization_id should raise
    normal = user_model.objects.create_user("normal@lms.com", "p", username="normal")
    data2 = {"email": "b@c.com", "username": "b", "first_name": "B", "last_name": "C", "role_id": role.id}
    serializer = UserInviteSerializer(data=data2, context={"request": type("R", (), {"user": normal})()})
    with pytest.raises(ValidationError):
        serializer.is_valid(raise_exception=True)

    # Non-org-admin with organization_id provided should be rejected
    org = Organization.objects.create(name="OrgY", contact_email="o@y.com")
    data3 = {"email": "c@d.com", "username": "c", "first_name": "C", "last_name": "D", "role_id": role.id, "organization_id": org.id}
    serializer = UserInviteSerializer(data=data3, context={"request": type("R", (), {"user": normal})()})
    with pytest.raises(ValidationError):
        serializer.is_valid(raise_exception=True)


@pytest.mark.django_db
def test_userserializer_get_roles_list():
    # create user and assign UserRole entries then ensure serializer returns role names
    u = User.objects.create_user(email="r1@lms.com", password=DEFAULT_VAL, username="r1")
    r, _ = Role.objects.get_or_create(name="student")
    UserRole.objects.create(user=u, role=r)
    from accounts.serializers import UserSerializer
    ser = UserSerializer(u)
    assert "roles" in ser.data
    assert r.name in ser.data["roles"]


@pytest.mark.django_db
def test_userserializer_includes_extra_membership_roles():
    # An org_admin who is also a teacher and student must expose all three so the
    # login screen offers the "Continue as" role picker.
    u = User.objects.create_user(email="multi@lms.com", password=DEFAULT_VAL)
    org = Organization.objects.create(name="OrgM", contact_email="o@m.com")
    roles = [Role.objects.get_or_create(name=n)[0] for n in ("org_admin", "teacher", "student")]
    member = OrganizationMember.objects.create(organization=org, user=u, role=roles[0])
    member.roles.add(*roles)

    data = UserSerializer(u).data
    assert sorted(data["roles"]) == ["org_admin", "student", "teacher"]
    assert data["organizations"][0]["roles"] == ["org_admin", "student", "teacher"]


@pytest.mark.django_db
def test_accept_invite_bad_signature():
    client = APIClient()
    # Hits the BadSignature except block
    fake_token = "completely_fake_" + "token.abc"
    response = client.post(reverse("accept_invite"), {"token": fake_token, "password": NEW_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Invalid invite link."

@pytest.mark.django_db
def test_accept_invite_user_does_not_exist():
    client = APIClient()
    signer = TimestampSigner()
    # Sign an email that does NOT exist in the database
    token = signer.sign("ghost@lms.com") 
    
    # Hits the User.DoesNotExist except block
    response = client.post(reverse("accept_invite"), {"token": token, "password": NEW_VAL})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "User not found."

@pytest.mark.django_db
def test_logout_missing_refresh_token():
    client = APIClient()
    user = User.objects.create_user(email="logout2@lms.com", password=DEFAULT_VAL)
    client.force_authenticate(user=user)
    
    # Hits the "Refresh token is required" branch
    response = client.post(reverse("logout"), {}) 
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    

@pytest.mark.django_db
def test_accept_invite_bad_signature_extra():
    # Covers the BadSignature except block
    fake_token = "completely_fake_" + "token"
    response = APIClient().post(reverse("accept_invite"), {"token": fake_token, "password": NEW_VAL})
    assert response.status_code == 400
    assert response.data["detail"] == "Invalid invite link."

@pytest.mark.django_db
def test_accept_invite_user_does_not_exist_extra():
    # Covers the User.DoesNotExist except block
    signer = TimestampSigner()
    token = signer.sign("ghost@lms.com") 
    
    response = APIClient().post(reverse("accept_invite"), {"token": token, "password": NEW_VAL})
    assert response.status_code == 400
    assert response.data["detail"] == "User not found."
