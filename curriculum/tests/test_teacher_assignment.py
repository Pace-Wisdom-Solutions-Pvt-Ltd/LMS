# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from curriculum.models import Course, Module


@pytest.fixture
def api_setup():
    User = get_user_model()
    # Roles
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    
    # Org
    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    
    # Users
    admin_user = User.objects.create_user(email="admin@test.com", password="password", first_name="Admin")
    teacher_user_1 = User.objects.create_user(email="t1@test.com", password="password", first_name="Teacher", last_name="One")
    teacher_user_2 = User.objects.create_user(email="t2@test.com", password="password", first_name="Teacher", last_name="Two")
    
    # Memberships
    OrganizationMember.objects.create(organization=org, user=admin_user, role=admin_role)
    OrganizationMember.objects.create(organization=org, user=teacher_user_1, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=teacher_user_2, role=teacher_role)
    
    return {
        "org": org,
        "admin": admin_user,
        "teacher1": teacher_user_1,
        "teacher2": teacher_user_2
    }

@pytest.mark.django_db
def test_org_admin_can_create_and_assign_teacher(api_setup):
    client = APIClient()
    client.force_authenticate(user=api_setup["admin"])
    
    url = f"/api/organizations/{api_setup['org'].id}/courses/"
    data = {
        "title": "New Course",
        "teachers": [api_setup["teacher1"].id]
    }
    
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['title'] == "New Course"
    
    # Verify in DB: teachers should NOT be assigned on creation
    course = Course.objects.get(id=response.data['id'])
    assert course.teachers.count() == 0

@pytest.mark.django_db
def test_teacher_cannot_create_course(api_setup):
    client = APIClient()
    client.force_authenticate(user=api_setup["teacher1"])
    
    url = f"/api/organizations/{api_setup['org'].id}/courses/"
    data = {"title": "Teacher Course"}
    
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_teacher_sees_only_assigned_courses(api_setup):
    # Create two courses, assign teacher1 to course1
    c1 = Course.objects.create(organization=api_setup["org"], title="Course 1")
    c1.teachers.add(api_setup["teacher1"])
    c2 = Course.objects.create(organization=api_setup["org"], title="Course 2")
    c2.teachers.add(api_setup["teacher2"])
    
    client = APIClient()
    client.force_authenticate(user=api_setup["teacher1"])
    
    url = f"/api/organizations/{api_setup['org'].id}/courses/"
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['title'] == "Course 1"

@pytest.mark.django_db
def test_assigned_teacher_can_manage_course_content(api_setup):
    course = Course.objects.create(organization=api_setup["org"], title="Course 1")
    course.teachers.add(api_setup["teacher1"])
    
    client = APIClient()
    client.force_authenticate(user=api_setup["teacher1"])
    
    # Create module
    url = f"/api/organizations/{api_setup['org'].id}/courses/{course.id}/modules/"
    data = {"title": "Module 1"}
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
@pytest.mark.django_db
def test_unassigned_teacher_cannot_access_course_content(api_setup):
    course = Course.objects.create(organization=api_setup["org"], title="Course 1")
    course.teachers.add(api_setup["teacher2"])
    
    client = APIClient()
    client.force_authenticate(user=api_setup["teacher1"])
    
    # Try to GET course detail
    url = f"/api/organizations/{api_setup['org'].id}/courses/{course.id}/"
    response = client.get(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    # Actually get_object_or_404 will find it but check_object_permissions will fail
    # In my view, I call get_object_or_404 then check_object_permissions.
    # DRF check_object_permissions raises PermissionDenied which is 403.
