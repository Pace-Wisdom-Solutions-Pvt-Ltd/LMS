# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from curriculum.models import Course
from rbac.models import Role
import datetime

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data():
    # Setup Superadmin
    admin = User.objects.create_superuser(email='super@admin.com', password='password', username='superadmin')
    
    # Setup Org and Batch
    org = Organization.objects.create(name='Test Org', slug='test-org', contact_email='test@org.com')
    batch = Batch.objects.create(organization=org, name='Winter 2026', start_date=datetime.date.today(), end_date=datetime.date.today())
    
    # Setup Course
    course = Course.objects.create(organization=org, title="React Development", status="Published")
    
    # Setup Role
    Role.objects.get_or_create(name='student')
    
    return admin, org, batch, course

@pytest.mark.django_db
def test_bulk_add_students_with_course(api_client, setup_data):
    admin, org, batch, course = setup_data
    api_client.force_authenticate(user=admin)
    
    url = f"/api/organizations/{org.id}/batches/{batch.id}/students/"
    data = {
        "students": [
            {
                "email": "student_course@test.com",
                "first_name": "Course",
                "last_name": "Student",
                "course_id": course.id
            }
        ]
    }
    
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    # Since students inherit from the batch, the individual 'course' field is forced to None
    assert response.data[0]['course'] is None
    
    # Verify DB
    student = User.objects.get(email="student_course@test.com")
    bs = BatchStudent.objects.get(batch=batch, student__user=student)
    assert bs.course is None

@pytest.mark.django_db
def test_individual_course_update(api_client, setup_data):
    admin, org, batch, course = setup_data
    api_client.force_authenticate(user=admin)
    
    # Create another course in same org
    course2 = Course.objects.create(organization=org, title="Node.js Mastery", status="Published")
    
    # Create student enrolled in first course
    student = User.objects.create_user(email="move_course@test.com", first_name="Mover")
    member = OrganizationMember.objects.create(organization=org, user=student, role=Role.objects.get(name='student'))
    bs = BatchStudent.objects.create(batch=batch, student=member, course=course)
    
    url = f"/api/organizations/{org.id}/batches/{batch.id}/students/{student.id}/"
    data = {
        "course": course2.id
    }
    
    response = api_client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    # Course update should be ignored/forced to None for students
    assert response.data['course'] is None
    
    # Verify DB
    bs.refresh_from_db()
    assert bs.course is None

@pytest.mark.django_db
def test_course_validation_cross_org(api_client, setup_data):
    admin, org, batch, _ = setup_data
    
    # Create another org and a course there
    org2 = Organization.objects.create(name='Other Org', slug='other-org', contact_email='other@org.com')
    course_other = Course.objects.create(organization=org2, title="Other Course")
    
    api_client.force_authenticate(user=admin)
    
    url = f"/api/organizations/{org.id}/batches/{batch.id}/students/"
    data = {
        "students": [
            {
                "email": "invalid_course@test.com",
                "course_id": course_other.id
            }
        ]
    }
    
    # Should fail because course belongs to another org
    # The view should catch this and return 404
    # In the new architecture, student course_id is ignored entirely during creation
    # to enforce batch-level inheritance. Thus, providing an invalid course_id 
    # doesn't trigger a 404 anymore—it's simply ignored.
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data[0]['course'] is None
