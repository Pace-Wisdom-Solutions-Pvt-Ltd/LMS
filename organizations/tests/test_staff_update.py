# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, OrganizationMember, Batch
from rbac.models import Role
from curriculum.models import Course

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="org@test.com")
    admin_role = Role.objects.get(name="org_admin")
    teacher_role = Role.objects.get(name="teacher")
    
    admin_user = User.objects.create_user(
        email="admin@lms.com", password="password123", first_name="Admin", last_name="User", username="admin"
    )
    OrganizationMember.objects.create(organization=org, user=admin_user, role=admin_role)
    
    teacher_user = User.objects.create_user(
        email="teacher@lms.com", password="password123", first_name="Teacher", last_name="One", username="teacher1"
    )
    teacher_member = OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    
    batch = Batch.objects.create(
        organization=org, name="Batch 1", start_date="2026-01-01", end_date="2026-12-31"
    )
    course = Course.objects.create(organization=org, title="Course 1")
    
    return {
        "org": org,
        "admin_user": admin_user,
        "teacher_user": teacher_user,
        "teacher_member": teacher_member,
        "batch": batch,
        "course": course,
        "teacher_role": teacher_role,
        "admin_role": admin_role
    }

@pytest.mark.django_db
def test_update_staff_profile_and_assignment(api_client, setup_data):
    org = setup_data["org"]
    admin_user = setup_data["admin_user"]
    teacher_member = setup_data["teacher_member"]
    batch = setup_data["batch"]
    
    api_client.force_authenticate(user=admin_user)
    
    url = reverse("organization-staff-detail", kwargs={"org_pk": org.id, "pk": teacher_member.id})
    
    data = {
        "user_email": "teacher@lms.com", # won't be updated but required by serializer validation if not partial
        "first_name": "Updated Teacher",
        "last_name": "Updated Name",
        "phone_number": "1234567890",
        "role_name": "org_admin",
        "batches": [batch.id],
    }
    
    response = api_client.put(url, data, format="json")
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data["user_detail"]["first_name"] == "Updated Teacher"
    assert response.data["role_detail"]["name"] == "org_admin"
    assert response.data["batch_detail"][0]["name"] == "Batch 1"
    
    # Verify User was updated
    teacher_user = User.objects.get(email="teacher@lms.com")
    assert teacher_user.first_name == "Updated Teacher"
    assert teacher_user.phone_number == "1234567890"

@pytest.mark.django_db
def test_delete_staff(api_client, setup_data):
    org = setup_data["org"]
    admin_user = setup_data["admin_user"]
    teacher_member = setup_data["teacher_member"]
    
    api_client.force_authenticate(user=admin_user)
    
    url = reverse("organization-staff-detail", kwargs={"org_pk": org.id, "pk": teacher_member.id})
    
    response = api_client.delete(url)
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not OrganizationMember.objects.filter(id=teacher_member.id).exists()
    # Verify User still exists
    assert User.objects.filter(email="teacher@lms.com").exists()
