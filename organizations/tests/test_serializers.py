# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from organizations.serializers import OrganizationSerializer, OrganizationMemberSerializer, StaffSerializer
from organizations.models import Organization, OrganizationMember
from accounts.models import User
from rbac.models import Role
from types import SimpleNamespace
from unittest.mock import patch
from django.core.exceptions import ValidationError
from curriculum.models import Course

pytestmark = pytest.mark.django_db


def test_organization_serializer_create_with_org_admin_email(monkeypatch):
    data = {"name": "OrgX", "contact_email": "orgx@o.com", "org_admin_email": "newadmin@org.com"}
    monkeypatch.setattr('organizations.serializers._send_invite_link', lambda *args, **kwargs: None, raising=False)
    ser = OrganizationSerializer(data=data)
    assert ser.is_valid(), ser.errors
    org = ser.save()
    # org created
    assert Organization.objects.filter(id=org.id).exists()
    # admin user should be created and OrganizationMember created
    assert User.objects.filter(email='newadmin@org.com').exists()
    role = Role.objects.filter(name='org_admin').first()
    assert OrganizationMember.objects.filter(organization=org, role=role).exists()


def test_organization_serializer_rejects_dummy_org_admin_email():
    data = {"name": "OrgX", "contact_email": "orgx@o.com", "org_admin_email": "dummy@dummy.com"}
    ser = OrganizationSerializer(data=data)
    assert not ser.is_valid()
    assert "org_admin_email" in ser.errors


def test_organization_member_serializer_validate_role_name_raises():
    org = Organization.objects.create(name='O', contact_email='c@o.com')
    data = {"organization": org.id, "user_email": "x@x.com", "role_name": "no_such_role"}
    ser = OrganizationMemberSerializer(data=data)
    assert not ser.is_valid()
    assert 'role_name' in ser.errors


def test_staff_serializer_create_with_context(monkeypatch):
    org = Organization.objects.create(name='O2', contact_email='c2@o.com')
    # ensure role exists
    Role.objects.get_or_create(name='teacher')
    monkeypatch.setattr('organizations.serializers._send_invite_link', lambda *args, **kwargs: None, raising=False)

    dummy_view = SimpleNamespace(kwargs={'org_pk': org.id})
    ser = StaffSerializer(data={"user_email": "staff@o.com", "role_name": "teacher", "first_name": "F", "last_name": "L"}, context={'view': dummy_view})
    assert ser.is_valid(), ser.errors
    member = ser.save()
    assert isinstance(member, OrganizationMember)
    assert member.user.email == 'staff@o.com'


@patch("organizations.serializers._send_invite_link")
def test_staff_serializer_resends_invite_for_existing_inactive_user(mock_send_invite):
    org = Organization.objects.create(name='O3', contact_email='c3@o.com')
    Role.objects.get_or_create(name='teacher')
    User.objects.create_user(
        email="inactive_staff@o.com",
        is_active=False,
    )

    dummy_view = SimpleNamespace(kwargs={'org_pk': org.id})
    ser = StaffSerializer(
        data={"user_email": "inactive_staff@o.com", "role_name": "teacher"},
        context={'view': dummy_view},
    )
    assert ser.is_valid(), ser.errors

    member = ser.save()

    assert isinstance(member, OrganizationMember)
    mock_send_invite.assert_called_once_with("inactive_staff@o.com", organization=org)
import pytest
from organizations.serializers import OrganizationSerializer
from organizations.models import Organization

@pytest.mark.django_db
def test_organization_serializer():
    data = {
        "name": "Test Org",
        "slug": "test-org",
        "contact_email": "test@org.com",
    }
    serializer = OrganizationSerializer(data=data)
    assert serializer.is_valid()
    organization = serializer.save()
    assert organization.name == "Test Org"
    assert organization.slug == "test-org"
    assert organization.contact_email == "test@org.com"


def test_organization_sender_email_and_auto_slug_generation():
    org = Organization.objects.create(name="Sender Org", contact_email="admin@sender.org")
    invalid_email_org = Organization.objects.create(name="Broken Sender", contact_email="invalid-email")

    assert org.slug == "sender-org"
    assert org.sender_email == "no-reply@sender.org"
    assert invalid_email_org.sender_email == ""


def test_organization_member_role_exclusivity_validation():
    org = Organization.objects.create(name="Role Guard", contact_email="role@guard.org")
    teacher_role = Role.objects.get_or_create(name="teacher")[0]
    student_role = Role.objects.get_or_create(name="student")[0]
    user = User.objects.create_user(email="guarded@example.com")

    OrganizationMember.objects.create(organization=org, user=user, role=teacher_role)
    with pytest.raises(ValidationError):
        OrganizationMember(organization=org, user=user, role=student_role).full_clean()

    user2 = User.objects.create_user(email="student-first@example.com")
    OrganizationMember.objects.create(organization=org, user=user2, role=student_role)
    with pytest.raises(ValidationError):
        OrganizationMember(organization=org, user=user2, role=teacher_role).full_clean()


def test_staff_serializer_update_syncs_user_fields_and_courses(monkeypatch):
    org = Organization.objects.create(name="Teacher Org", contact_email="teacher@org.com")
    teacher_role = Role.objects.get_or_create(name="teacher")[0]
    user = User.objects.create_user(email="teacher@org.com", first_name="Old", last_name="Name")
    batch = org.batches.create(name="Batch A", start_date="2026-01-01", end_date="2026-12-31")
    course = Course.objects.create(organization=org, title="Course A")
    batch.courses.add(course)
    member = OrganizationMember.objects.create(organization=org, user=user, role=teacher_role)

    monkeypatch.setattr('organizations.serializers._send_invite_link', lambda *args, **kwargs: None, raising=False)
    serializer = StaffSerializer(
        member,
        data={
            "first_name": "New",
            "last_name": "Teacher",
            "phone_number": "1234567890",
            "batches": [batch.id],
            "assigned_courses": [course.id],
        },
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    updated_member = serializer.save()

    user.refresh_from_db()
    assert updated_member.batches.filter(id=batch.id).exists()
    assert user.first_name == "New"
    assert user.last_name == "Teacher"
    assert course.teachers.filter(user=user).exists()


def test_staff_serializer_assigned_courses_null(monkeypatch):
    org = Organization.objects.create(name="Null Course Org", contact_email="null@org.com")
    teacher_role = Role.objects.get_or_create(name="teacher")[0]
    user = User.objects.create_user(email="teacher_null@org.com", first_name="Old", last_name="Name")
    batch = org.batches.create(name="Batch B", start_date="2026-01-01", end_date="2026-12-31")
    course = Course.objects.create(organization=org, title="Course B")
    batch.courses.add(course)
    member = OrganizationMember.objects.create(organization=org, user=user, role=teacher_role)

    monkeypatch.setattr('organizations.serializers._send_invite_link', lambda *args, **kwargs: None, raising=False)
    serializer = StaffSerializer(
        member,
        data={
            "batches": [batch.id],
            "assigned_courses": None,  # null sent in JSON
        },
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    updated_member = serializer.save()

    # The course from Batch B should be automatically associated to the user
    assert updated_member.batches.filter(id=batch.id).exists()
    assert course.teachers.filter(user=user).exists()
