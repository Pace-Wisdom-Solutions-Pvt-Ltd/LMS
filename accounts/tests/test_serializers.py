# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework.test import APIRequestFactory
from rest_framework.exceptions import ValidationError
from accounts.serializers import UserInviteSerializer, UserSerializer, UserUpdateSerializer
from rbac.models import Role
from organizations.models import Organization, OrganizationMember
from rbac.models import UserRole
from django.contrib.auth import get_user_model
import pytest

factory = APIRequestFactory()
User = get_user_model()
TEST_SECRET = "test-pass-123"

@pytest.mark.django_db
def test_user_invite_serializer_no_context():
    serializer = UserInviteSerializer(data={})
    with pytest.raises(ValidationError) as exc:
        serializer.validate({})
    assert "Request context is missing." in str(exc.value)

@pytest.mark.django_db
def test_user_invite_serializer_invalid_role():
    req = factory.post('/')
    req.user, _ = User.objects.get_or_create(email="admin@test.com")
    serializer = UserInviteSerializer(context={'request': req})
    
    with pytest.raises(ValidationError) as exc:
        serializer.validate({"role_id": 9999})
    assert "Invalid role ID" in str(exc.value)

@pytest.mark.django_db
def test_user_invite_serializer_non_superadmin_missing_org():
    req = factory.post('/')
    req.user, _ = User.objects.get_or_create(email="user@test.com", is_superuser=False)
    role, _ = Role.objects.get_or_create(name="teacher")
    
    serializer = UserInviteSerializer(context={'request': req})
    with pytest.raises(ValidationError) as exc:
        serializer.validate({"role_id": role.id, "organization_id": None})
    assert "Organization ID is required" in str(exc.value)

@pytest.mark.django_db
def test_user_invite_serializer_not_org_admin():
    req = factory.post('/')
    req.user, _ = User.objects.get_or_create(email="user2@test.com", is_superuser=False)
    role, _ = Role.objects.get_or_create(name="teacher")
    org, _ = Organization.objects.get_or_create(name="Test Org")
    
    serializer = UserInviteSerializer(context={'request': req})
    with pytest.raises(ValidationError) as exc:
        serializer.validate({"role_id": role.id, "organization_id": org.id})
    assert "You do not have permission" in str(exc.value)

@pytest.mark.django_db
def test_user_invite_serializer_invalid_role_choice():
    # Test assigning a role that is not allowed (e.g. 'superadmin' by a normal org admin)
    from organizations.models import OrganizationMember
    req = factory.post('/')
    req.user, _ = User.objects.get_or_create(email="orgadmin@test.com", is_superuser=False)
    
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    bad_role, _ = Role.objects.get_or_create(name="superadmin") # Not allowed to be invited by org admin
    org, _ = Organization.objects.get_or_create(name="Test Org 2")
    
    OrganizationMember.objects.get_or_create(user=req.user, organization=org, role=admin_role, is_active=True)
    
    serializer = UserInviteSerializer(context={'request': req})
    with pytest.raises(ValidationError) as exc:
        serializer.validate({"role_id": bad_role.id, "organization_id": org.id})
    assert "You can only invite" in str(exc.value)


@pytest.mark.django_db
def test_user_serializer_returns_combined_roles_and_organizations():
    user = User.objects.create_user(email="combo@test.com", first_name="Com", last_name="Bo")
    org = Organization.objects.create(name="Combo Org", slug="combo-org")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    student_role, _ = Role.objects.get_or_create(name="student")
    UserRole.objects.create(user=user, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=user, role=student_role)

    data = UserSerializer(user).data
    assert set(data["roles"]) == {"teacher", "student"}
    assert data["organizations"][0]["name"] == "Combo Org"
    assert data["organizations"][0]["role"] == "student"


@pytest.mark.django_db
def test_user_serializer_excludes_inactive_organization_memberships():
    user = User.objects.create_user(email="combo2@test.com", first_name="Com", last_name="Bo")
    org_active = Organization.objects.create(name="Active Org", slug="active-org")
    org_inactive = Organization.objects.create(name="Inactive Org", slug="inactive-org", is_active=False)
    org_admin_role, _ = Role.objects.get_or_create(name="org_admin")
    student_role, _ = Role.objects.get_or_create(name="student")

    OrganizationMember.objects.create(organization=org_active, user=user, role=org_admin_role, is_active=True)
    OrganizationMember.objects.create(organization=org_inactive, user=user, role=student_role, is_active=True)

    data = UserSerializer(user).data
    assert set(data["roles"]) == {"org_admin"}
    assert len(data["organizations"]) == 1
    assert data["organizations"][0]["name"] == "Active Org"
    assert data["organizations"][0]["role"] == "org_admin"


@pytest.mark.django_db
def test_user_serializer_normalizes_status_from_is_active():
    inactive_user = User.objects.create_user(
        email="inactive-status@test.com",
        is_active=False,
        status=User.STATUS_ACTIVE,
    )
    active_user = User.objects.create_user(
        email="active-status@test.com",
        is_active=True,
        status=User.STATUS_INACTIVE,
    )

    inactive_data = UserSerializer(inactive_user).data
    active_data = UserSerializer(active_user).data

    assert inactive_data["status"] == User.STATUS_INACTIVE
    assert active_data["status"] == User.STATUS_ACTIVE


@pytest.mark.django_db
def test_user_update_serializer_status_validation_and_update_paths():
    admin = User.objects.create_superuser(
        email="serializer-admin@test.com",
        password=TEST_SECRET,
    )
    user = User.objects.create_user(email="target@test.com", is_active=True, status=User.STATUS_ACTIVE)

    req = factory.patch('/')
    req.user = admin
    serializer = UserUpdateSerializer(instance=user, data={"status": User.STATUS_DELETED}, partial=True, context={"request": req})
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()
    assert updated.status == User.STATUS_DELETED
    assert updated.is_active is False
    assert updated.is_deleted is True

    req_self = factory.patch('/')
    req_self.user = user
    serializer_self = UserUpdateSerializer(instance=user, data={"status": User.STATUS_ACTIVE}, partial=True, context={"request": req_self})
    assert not serializer_self.is_valid()
    assert "status" in serializer_self.errors


@pytest.mark.django_db
def test_user_update_serializer_rejects_status_without_authenticated_request():
    user = User.objects.create_user(email="anon-target@test.com")
    req = factory.patch('/')
    req.user = type("Anon", (), {"is_authenticated": False})()
    serializer = UserUpdateSerializer(instance=user, data={"status": User.STATUS_ACTIVE}, partial=True, context={"request": req})
    assert not serializer.is_valid()
    assert "status" in serializer.errors


@pytest.mark.django_db
def test_user_serializer_dynamic_expiry():
    from django.utils import timezone
    from datetime import timedelta
    
    # 1. User invited less than 7 days ago -> status remains pending
    user_pending_recent = User.objects.create_user(
        email="recent-pending@test.com",
        is_active=False,
        status=User.STATUS_PENDING,
        last_invited_at=timezone.now() - timedelta(days=6)
    )
    assert UserSerializer(user_pending_recent).data["status"] == User.STATUS_PENDING

    # 2. User invited more than 7 days ago -> status becomes expired dynamically
    user_pending_expired = User.objects.create_user(
        email="expired-pending@test.com",
        is_active=False,
        status=User.STATUS_PENDING,
        last_invited_at=timezone.now() - timedelta(days=8)
    )
    assert UserSerializer(user_pending_expired).data["status"] == User.STATUS_EXPIRED

    # 3. User reinvited more than 7 days ago -> status becomes expired dynamically
    user_reinvited_expired = User.objects.create_user(
        email="expired-reinvited@test.com",
        is_active=False,
        status=User.STATUS_REINVITED,
        last_invited_at=timezone.now() - timedelta(days=8)
    )
    assert UserSerializer(user_reinvited_expired).data["status"] == User.STATUS_EXPIRED

    # 4. User reinvited less than 7 days ago -> status remains reinvited
    user_reinvited_recent = User.objects.create_user(
        email="recent-reinvited@test.com",
        is_active=False,
        status=User.STATUS_REINVITED,
        last_invited_at=timezone.now() - timedelta(days=5)
    )
    assert UserSerializer(user_reinvited_recent).data["status"] == User.STATUS_REINVITED
