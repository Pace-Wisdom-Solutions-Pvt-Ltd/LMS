# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from curriculum.models import Course
from rbac.models import Role
from accounts.models import User

@pytest.fixture
def setup_data(db):
    org = Organization.objects.create(name="Test Org", slug="test-org")
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    student_role, _ = Role.objects.get_or_create(name="student")
    
    super_admin = User.objects.create_superuser(email="super@lms.com", password="password", username="superadmin")
    org_admin = User.objects.create_user(email="admin@lms.com", password="password", username="orgadmin")
    teacher = User.objects.create_user(email="teacher@lms.com", password="password", username="teacher")
    student_user = User.objects.create_user(email="student@lms.com", password="password", username="student")
    
    OrganizationMember.objects.create(organization=org, user=org_admin, role=admin_role)
    OrganizationMember.objects.create(organization=org, user=teacher, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=student_user, role=student_role)
    
    course = Course.objects.create(organization=org, title="Initial Course", status="Published")
    
    return {
        "org": org,
        "super_admin": super_admin,
        "org_admin": org_admin,
        "teacher": teacher,
        "student": student_user,
        "course": course
    }

def test_create_batch_with_course(setup_data):
    org = setup_data["org"]
    course = setup_data["course"]
    client = APIClient()
    client.force_authenticate(user=setup_data["org_admin"])
    
    url = reverse('organization-batches-list', kwargs={'org_pk': org.id})
    data = {
        "name": "Morning Batch",
        "start_date": "2026-04-01",
        "end_date": "2026-06-01",
        "courses": [course.id]
    }
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert course.id in response.data["courses"]
    
    batch = Batch.objects.get(id=response.data["id"])
    assert course in batch.courses.all()

def test_enrollment_defaults_to_batch_course(setup_data):
    org = setup_data["org"]
    course = setup_data["course"]
    batch = Batch.objects.create(
        organization=org, 
        name="Linked Batch", 
        start_date="2026-04-01", 
        end_date="2026-06-01"
    )
    batch.courses.add(course)
    
    # Create the user and organization member beforehand as expected by the updated view logic
    student_role = Role.objects.get(name="student")
    new_student = User.objects.create_user(email="new.student@test.com", password="password", username="newstudent")
    OrganizationMember.objects.create(organization=org, user=new_student, role=student_role)
    
    client = APIClient()
    client.force_authenticate(user=setup_data["org_admin"])
    url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
    
    # Add new student without specifying course
    data = {
        "students": [
            {"email": "new.student@test.com", "first_name": "New", "last_name": "Student"}
        ]
    }
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
    enrollment = BatchStudent.objects.get(student__user__email="new.student@test.com")
    # In the new architecture, students inherit all batch courses, so enrollment.course is forced to None
    assert enrollment.course is None

def test_super_admin_can_manage_any_course(setup_data):
    org = setup_data["org"]
    client = APIClient()
    client.force_authenticate(user=setup_data["super_admin"])
    
    # Create course
    url = reverse('course-list-create', kwargs={'org_id': org.id})
    data = {"title": "Super Course", "status": "Draft"}
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED



def test_assign_batches_via_course(setup_data):
    org = setup_data["org"]
    batch1 = Batch.objects.create(organization=org, name="Batch 1", start_date="2026-04-01", end_date="2026-06-01")
    batch2 = Batch.objects.create(organization=org, name="Batch 2", start_date="2026-04-01", end_date="2026-06-01")
    
    client = APIClient()
    client.force_authenticate(user=setup_data["org_admin"])
    
    url = reverse('course-list-create', kwargs={'org_id': org.id})
    data = {
        "title": "Multi-Batch Course",
        "batches": [batch1.id, batch2.id]
    }
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
    batch1.refresh_from_db()
    batch2.refresh_from_db()
    assert batch1.courses.filter(id=response.data["id"]).exists()
    assert batch2.courses.filter(id=response.data["id"]).exists()

def test_assign_multiple_courses_to_teacher(setup_data):
    org = setup_data["org"]
    course1 = setup_data["course"]
    course2 = Course.objects.create(organization=org, title="Second Course")
    teacher = setup_data["teacher"]
    
    client = APIClient()
    client.force_authenticate(user=setup_data["org_admin"])
    
    # Use Staff Detail API to update assigned_courses
    member = OrganizationMember.objects.get(user=teacher, organization=org)
    url = reverse('organization-staff-detail', kwargs={'org_pk': org.id, 'pk': member.id})
    
    # Create a batch and link it to the teacher first (mandatory for courses)
    batch = Batch.objects.create(organization=org, name="Teacher Batch", start_date="2026-04-01", end_date="2026-06-01")
    batch.courses.add(course1, course2)
    member.batches.add(batch)

    data = {
        "assigned_courses": [course1.id, course2.id]
    }
    response = client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    
    # Verify M2M on Course side
    assert teacher in course1.teachers.all()
    assert teacher in course2.teachers.all()
    
    # Verify Detail in Staff API
    assert len(response.data["assigned_courses_detail"]) == 2

def test_move_batch_between_courses(setup_data):
    org = setup_data["org"]
    course1 = setup_data["course"]
    course2 = Course.objects.create(organization=org, title="Target Course")
    batch = Batch.objects.create(organization=org, name="Moving Batch", start_date="2026-04-01", end_date="2026-06-01")
    batch.courses.add(course1)
    
    client = APIClient()
    client.force_authenticate(user=setup_data["org_admin"])
    
    # Assign batch to course2 via Course API
    url = reverse('course-detail', kwargs={'org_id': org.id, 'course_id': course2.id})
    data = {"batches": [batch.id]}
    response = client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    
    batch.refresh_from_db()
    assert course2 in batch.courses.all()
