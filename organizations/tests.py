# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from accounts.models import User
from rbac.models import Role
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError


@pytest.mark.django_db
def test_organization_creation():
	org = Organization.objects.create(
		name="Test Organization",
		slug="test-org",
		contact_email="contact@testorg.com"
	)
	assert org.name == "Test Organization"
	assert org.slug == "test-org"
	assert Organization.objects.count() == 1


@pytest.mark.django_db
def test_organization_member_creation():
	org = Organization.objects.create(
		name="Test Org",
		slug="test-org",
		contact_email="contact@testorg.com"
	)
	user = User.objects.create_user(email="test@user.com", password="password123",
									first_name="Test", last_name="User")
	role, _ = Role.objects.get_or_create(name="org_admin", defaults={"description": "Organization Admin"})

	member = OrganizationMember.objects.create(organization=org, user=user, role=role)
	assert member.organization == org
	assert member.user == user
	assert member.role == role
	assert OrganizationMember.objects.count() == 1


@pytest.mark.django_db
def test_unique_organization_member():
	org = Organization.objects.create(
		name="Another Org",
		slug="another-org",
		contact_email="another@testorg.com"
	)
	user = User.objects.create_user(email="duplicate@user.com", password="password123",
									first_name="Dup", last_name="User")
	role, _ = Role.objects.get_or_create(name="student", defaults={"description": "Student Role"})

	OrganizationMember.objects.create(organization=org, user=user, role=role)
	with pytest.raises(IntegrityError):
		OrganizationMember.objects.create(organization=org, user=user, role=role)


@pytest.mark.django_db
def test_staff_and_student_membership_conflict_already_student():
	org1 = Organization.objects.create(name="Org1", slug="org1", contact_email="org1@test.com")
	org2 = Organization.objects.create(name="Org2", slug="org2", contact_email="org2@test.com")
	user = User.objects.create_user(email="conflict@user.com", password="password123",
						first_name="Conflict", last_name="User")
	student_role, _ = Role.objects.get_or_create(name="student", defaults={"description": "Student Role"})
	staff_role, _ = Role.objects.get_or_create(name="teacher", defaults={"description": "Teacher Role"})

	OrganizationMember.objects.create(organization=org1, user=user, role=student_role)
	with pytest.raises(ValidationError):
		OrganizationMember.objects.create(organization=org2, user=user, role=staff_role)


@pytest.mark.django_db
def test_staff_and_student_membership_conflict_already_staff():
	org1 = Organization.objects.create(name="Org1", slug="org1b", contact_email="org1b@test.com")
	org2 = Organization.objects.create(name="Org2", slug="org2b", contact_email="org2b@test.com")
	user = User.objects.create_user(email="conflict2@user.com", password="password123",
						first_name="Conflict2", last_name="User")
	student_role, _ = Role.objects.get_or_create(name="student", defaults={"description": "Student Role"})
	staff_role, _ = Role.objects.get_or_create(name="org_admin", defaults={"description": "Organization Admin"})

	OrganizationMember.objects.create(organization=org1, user=user, role=staff_role)
	with pytest.raises(ValidationError):
		OrganizationMember.objects.create(organization=org2, user=user, role=student_role)


@pytest.mark.django_db
def test_batch_creation():
	org = Organization.objects.create(name="Batch Org", slug="batch-org", contact_email="batch@org.com")
	batch = Batch.objects.create(organization=org, name="Spring 2026", start_date="2026-01-01", end_date="2026-05-31")
	assert batch.name == "Spring 2026"
	assert batch.organization == org


@pytest.mark.django_db
def test_batch_dates_must_be_valid():
	org = Organization.objects.create(name="Invalid Date Org", slug="invalid-date-org", contact_email="invalid@org.com")
	with pytest.raises(ValidationError):
		Batch.objects.create(
			organization=org,
			name="Invalid Range",
			start_date="2026-08-31",
			end_date="2026-07-31",
		)


@pytest.mark.django_db
def test_batch_student_enrollment():
	org = Organization.objects.create(name="Enrollment Org", slug="enroll-org", contact_email="enroll@org.com")
	batch = Batch.objects.create(organization=org, name="Fall 2026", start_date="2026-09-01", end_date="2026-12-31")
	student_user = User.objects.create_user(email="student@enroll.com", password="password", first_name="Enroll", last_name="Student")
    
	batch_student = BatchStudent.objects.create(batch=batch, student=student_user)
	assert batch_student.batch == batch
	assert batch_student.student == student_user
	assert BatchStudent.objects.count() == 1


@pytest.mark.django_db
def test_unique_batch_student_enrollment():
	org = Organization.objects.create(name="Unique Enrollment Org", slug="unique-enroll-org", contact_email="unique@org.com")
	batch = Batch.objects.create(organization=org, name="Summer 2026", start_date="2026-06-01", end_date="2026-08-31")
	student_user = User.objects.create_user(email="unique_student@enroll.com", password="password", first_name="Unique", last_name="Student")
    
	BatchStudent.objects.create(batch=batch, student=student_user)
	with pytest.raises(IntegrityError):
		BatchStudent.objects.create(batch=batch, student=student_user)


@pytest.mark.django_db
def test_organization_creation_invalid():
    with pytest.raises(ValidationError):
        Organization.objects.create(name="", slug="", contact_email="invalid")


@pytest.mark.django_db
def test_organization_deletion():
    org = Organization.objects.create(name="Delete Org", slug="delete-org", contact_email="delete@org.com")
    org.delete()
    assert Organization.objects.count() == 0


@pytest.mark.django_db
def test_batch_update():
    org = Organization.objects.create(name="Update Org", slug="update-org", contact_email="update@org.com")
    batch = Batch.objects.create(organization=org, name="Old Name", start_date="2026-01-01", end_date="2026-05-31")
    batch.name = "Updated Name"
    batch.save()
    assert batch.name == "Updated Name"


@pytest.mark.django_db
def test_list_organizations():
    Organization.objects.create(name="Org 1", slug="org-1", contact_email="org1@org.com")
    Organization.objects.create(name="Org 2", slug="org-2", contact_email="org2@org.com")
    assert Organization.objects.count() == 2


@pytest.mark.django_db
def test_retrieve_organization():
    org = Organization.objects.create(name="Retrieve Org", slug="retrieve-org", contact_email="retrieve@org.com")
    retrieved_org = Organization.objects.get(id=org.id)
    assert retrieved_org.name == "Retrieve Org"
