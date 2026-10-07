# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from curriculum.models import Course
from rbac.models import Role

User = get_user_model()

@pytest.fixture
def setup_test_data(db):
    org = Organization.objects.create(name="LMS Multi Org", slug="lms-multi-org")
    
    super_admin = User.objects.create_superuser(email="super@lms.com", password="password", username="superadmin")
    org_admin = User.objects.create_user(email="admin@lms.com", password="password", username="orgadmin")
    teacher = User.objects.create_user(email="teacher@lms.com", password="password", username="teacher")
    student = User.objects.create_user(email="student@lms.com", password="password", username="student")
    
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    student_role, _ = Role.objects.get_or_create(name="student")
    
    OrganizationMember.objects.create(organization=org, user=org_admin, role=admin_role)
    teacher_member = OrganizationMember.objects.create(organization=org, user=teacher, role=teacher_role)
    student_member = OrganizationMember.objects.create(organization=org, user=student, role=student_role)
    
    batch1 = Batch.objects.create(organization=org, name="Batch 1", start_date="2026-01-01", end_date="2026-12-31")
    batch2 = Batch.objects.create(organization=org, name="Batch 2", start_date="2026-01-01", end_date="2026-12-31")
    
    course1 = Course.objects.create(organization=org, title="Active Course 1", status="Published")
    course2 = Course.objects.create(organization=org, title="Active Course 2", status="Published")
    archived_course = Course.objects.create(organization=org, title="Archived Course", status="Archived")
    
    batch1.courses.add(course1)
    batch2.courses.add(course2)
    
    return {
        "org": org,
        "super_admin": super_admin,
        "org_admin": org_admin,
        "teacher": teacher,
        "teacher_member": teacher_member,
        "student": student,
        "student_member": student_member,
        "batch1": batch1,
        "batch2": batch2,
        "course1": course1,
        "course2": course2,
        "archived_course": archived_course
    }

@pytest.mark.django_db
def test_course_archiving_visibility_and_restrictions(setup_test_data):
    data = setup_test_data
    client = APIClient()
    
    # 1. Org Admin can filter/view archived courses
    client.force_authenticate(user=data["org_admin"])
    url = reverse('course-list-create', kwargs={'org_id': data["org"].id})
    
    # List active by default (should exclude Archived)
    resp = client.get(url)
    assert resp.status_code == 200
    titles = [c["title"] for c in resp.data["results"]]
    assert "Archived Course" not in titles
    
    # Filter only archived
    resp = client.get(f"{url}?status=Archived")
    assert resp.status_code == 200
    titles = [c["title"] for c in resp.data["results"]]
    assert "Archived Course" in titles
    
    # 2. Teachers and Students cannot see archived course
    client.force_authenticate(user=data["teacher"])
    resp = client.get(url)
    assert resp.status_code == 200
    titles = [c["title"] for c in resp.data["results"]]
    assert "Archived Course" not in titles
    
    # Try to access archived course directly as teacher -> should be denied
    detail_url = reverse('course-detail', kwargs={'org_id': data["org"].id, 'course_id': data["archived_course"].id})
    resp = client.get(detail_url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_multiple_batch_assignments_serializer_and_filtering(setup_test_data):
    data = setup_test_data
    client = APIClient()
    client.force_authenticate(user=data["org_admin"])
    
    # 1. Assign multiple batches to teacher via Staff Detail API
    staff_url = reverse('organization-staff-detail', kwargs={'org_pk': data["org"].id, 'pk': data["teacher_member"].id})
    resp = client.patch(staff_url, {
        "batches": [data["batch1"].id, data["batch2"].id]
    }, format='json')
    assert resp.status_code == 200
    
    # Verify teacher batches M2M is set
    data["teacher_member"].refresh_from_db()
    assert data["teacher_member"].batches.count() == 2
    
    # 2. Assign multiple batches to student via Student Detail API
    student_url = reverse('organization-students-detail', kwargs={'org_pk': data["org"].id, 'pk': str(data["student"].id)})
    resp = client.patch(student_url, {
        "batch_ids": [data["batch1"].id, data["batch2"].id]
    }, format='json')
    assert resp.status_code == 200
    
    # Verify student batches M2M and BatchStudent records
    data["student_member"].refresh_from_db()
    assert data["student_member"].batches.count() == 2
    assert BatchStudent.objects.filter(student=data["student"], batch=data["batch1"]).exists()
    assert BatchStudent.objects.filter(student=data["student"], batch=data["batch2"]).exists()
    
    # 3. Test teacher dashboard filtering
    dashboard_url = reverse('teacher-dashboard', kwargs={'org_pk': data["org"].id, 'teacher_id': data["teacher"].id})
    client.force_authenticate(user=data["teacher"])
    resp = client.get(dashboard_url)
    assert resp.status_code == 200
    assert resp.data["batch_count"] == 2
    assert resp.data["course_count"] == 2
