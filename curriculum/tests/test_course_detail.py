# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from curriculum.models import Course
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from accounts.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    # 1. Create Org
    org = Organization.objects.create(name="Test Org", slug="test-org")
    
    # 2. Create Roles
    teacher_role = Role.objects.get(name='teacher')
    student_role = Role.objects.get(name='student')
    
    # 3. Create Users
    teacher_user = User.objects.create_user(email="teacher@test.com", password="password123")
    student_user = User.objects.create_user(email="student@test.com", password="password123")
    
    # 4. Create Memberships
    OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=student_user, role=student_role)
    
    # 5. Create Course
    course = Course.objects.create(organization=org, title="Initial Course", description="Description")
    course.teachers.add(teacher_user)
    
    return org, teacher_user, student_user, course

@pytest.mark.django_db
class TestCourseDetail:
    def test_retrieve_course(self, api_client, setup_data):
        org, teacher, student, course = setup_data
        url = reverse('course-detail', kwargs={'org_id': org.id, 'course_id': course.id})
        
        # Teacher can retrieve
        api_client.force_authenticate(user=teacher)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == "Initial Course"
        
        # Student cannot retrieve (IsOrgAdminOrTeacher)
        api_client.force_authenticate(user=student)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_course(self, api_client, setup_data):
        org, teacher, student, course = setup_data
        url = reverse('course-detail', kwargs={'org_id': org.id, 'course_id': course.id})
        
        # Teacher can update
        api_client.force_authenticate(user=teacher)
        payload = {"title": "Updated Course Title"}
        response = api_client.patch(url, data=payload)
        assert response.status_code == status.HTTP_200_OK
        course.refresh_from_db()
        assert course.title == "Updated Course Title"
        
        # Student cannot update
        api_client.force_authenticate(user=student)
        response = api_client.patch(url, data={"title": "Hacker Title"})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_course(self, api_client, setup_data):
        org, teacher, student, course = setup_data
        url = reverse('course-detail', kwargs={'org_id': org.id, 'course_id': course.id})
        
        # Student cannot delete
        api_client.force_authenticate(user=student)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Course.objects.filter(id=course.id).exists()
        
        # Teacher can delete
        api_client.force_authenticate(user=teacher)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Course.objects.filter(id=course.id).exists()
