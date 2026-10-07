# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
import io
import pandas as pd
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from curriculum.models import Course, Module, Node, Task, TaskSubmission, StudentNodeProgress
from rbac.models import Role
from django.http import Http404

@pytest.mark.django_db
class TestOrganizationsExtraCoverage:
    @pytest.fixture(autouse=True)
    def setup_data(self, db):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        
        # Roles
        self.role_admin = Role.objects.get_or_create(name='org_admin')[0]
        self.role_teacher = Role.objects.get_or_create(name='teacher')[0]
        self.role_student = Role.objects.get_or_create(name='student')[0]
        
        # Admin User
        self.admin_user = User.objects.create_user(email="admin@test.com", password="password", first_name="Admin", last_name="User")
        OrganizationMember.objects.create(organization=self.org, user=self.admin_user, role=self.role_admin)
        
        # Teacher User
        self.teacher_user = User.objects.create_user(email="teacher@test.com", password="password", first_name="Teacher", last_name="User")
        OrganizationMember.objects.create(organization=self.org, user=self.teacher_user, role=self.role_teacher)
        
        # Course and Batch
        self.course = Course.objects.create(organization=self.org, title="Course 1")
        self.batch = Batch.objects.create(organization=self.org, name="Batch 1", start_date="2026-01-01", end_date="2026-12-31")
        self.batch.courses.add(self.course)

    def test_analytics_overview(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('organization-analytics-overview', kwargs={'pk': self.org.id})
        resp = self.client.get(url)
        assert resp.status_code == 200
        assert resp.data['total_users'] == 2

    def test_staff_list_filters(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('organization-staff-list', kwargs={'org_pk': self.org.id})
        
        # Filter by role
        resp = self.client.get(url, {'role': 'teacher'})
        print(f"DEBUG: Response data: {resp.data}")
        assert resp.status_code == 200
        
        # Filter by batch
        resp = self.client.get(url, {'batch': self.batch.id})
        assert resp.status_code == 200

    def test_staff_bulk_upload_unsupported_format(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': self.org.id})
        
        csv_file = io.BytesIO(b"email,first_name,last_name\ntest@test.com,Test,User")
        csv_file.name = 'test.txt' # Unsupported
        
        resp = self.client.post(url, {'file': csv_file, 'role_name': 'teacher'})
        assert resp.status_code == 400
        assert resp.data['error'] == 'Unsupported file format.'

    def test_staff_bulk_upload_success(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': self.org.id})
        
        # CSV with phone number ending .0 and missing email row
        content = "email,first_name,last_name,phone_number\n" \
                  "new_staff@test.com,New,Staff,123456.0\n" \
                  ",Missing,Email,\n"
        csv_file = io.BytesIO(content.encode('utf-8'))
        csv_file.name = 'test.csv'
        
        resp = self.client.post(url, {'file': csv_file, 'role_name': 'teacher'})
        assert resp.status_code == 201
        assert len(resp.data) == 1
        assert User.objects.filter(email='new_staff@test.com').exists()
        user = User.objects.get(email='new_staff@test.com')
        assert user.phone_number == '123456' # Cleaned .0

    def test_batch_student_get_object_lookup(self):
        self.client.force_authenticate(user=self.admin_user)
        student = User.objects.create_user(email="student@test.com", password="password", first_name="Student")
        BatchStudent.objects.create(batch=self.batch, student=student, student_id_number="SID123")
        
        # Lookup by UUID
        url = reverse('organization-batch-students-detail', kwargs={'org_pk': self.org.id, 'batch_pk': self.batch.id, 'pk': student.id})
        resp = self.client.get(url)
        assert resp.status_code == 200
        
        # Lookup by student_id_number
        url = reverse('organization-batch-students-detail', kwargs={'org_pk': self.org.id, 'batch_pk': self.batch.id, 'pk': "SID123"})
        resp = self.client.get(url)
        assert resp.status_code == 200
        
        # Lookup failure
        url = reverse('organization-batch-students-detail', kwargs={'org_pk': self.org.id, 'batch_pk': self.batch.id, 'pk': "NONEXISTENT"})
        resp = self.client.get(url)
        assert resp.status_code == 404

    def test_teacher_dashboard_toggles(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('teacher-dashboard', kwargs={'org_pk': self.org.id, 'teacher_id': self.admin_user.id})
        
        # Default as org_admin with no assignments -> org global view
        resp = self.client.get(url)
        assert resp.status_code == 200
        assert resp.data['view_mode'] == 'admin'
        
        # Force teacher mode
        resp = self.client.get(url, {'role': 'teacher'})
        assert resp.status_code == 200
        assert resp.data['view_mode'] == 'teacher'
        
        # Force admin mode
        resp = self.client.get(url, {'role': 'org_admin'})
        assert resp.status_code == 200
        assert resp.data['view_mode'] == 'admin'

    def test_resolve_course_and_batch_edge_cases(self):
        from organizations.views import BatchStudentViewSet
        view = BatchStudentViewSet()
        
        other_org = Organization.objects.create(name="Other Org", slug="other-org")
        other_course = Course.objects.create(organization=other_org, title="Other Course")
        
        with pytest.raises(Http404):
            view._resolve_course(other_course, self.org)
            
        other_batch = Batch.objects.create(organization=other_org, name="Other Batch", start_date="2026-01-01", end_date="2026-12-31")
        with pytest.raises(Http404):
            view._resolve_batch(other_batch, self.org, self.batch)

    def test_update_user_profile_logic(self):
        from organizations.views import BatchStudentViewSet
        view = BatchStudentViewSet()
        
        user = User.objects.create_user(email="profile@test.com", password="password")
        view._update_user_profile(user, "UpdatedFirst", "UpdatedLast", "999999")
        user.refresh_from_db()
        assert user.first_name == "UpdatedFirst"
        assert user.last_name == "UpdatedLast"
        assert user.phone_number == "999999"

    def test_org_student_viewset_get_object(self):
        self.client.force_authenticate(user=self.admin_user)
        student = User.objects.create_user(email="org_student@test.com", password="password")
        OrganizationMember.objects.create(organization=self.org, user=student, role=self.role_student)
        BatchStudent.objects.create(batch=self.batch, student=student, student_id_number="SID456")
        
        url = reverse('organization-students-detail', kwargs={'org_pk': self.org.id, 'pk': "SID456"})
        resp = self.client.get(url)
        assert resp.status_code == 200

    def test_org_student_viewset_patch(self):
        self.client.force_authenticate(user=self.admin_user)
        student = User.objects.create_user(email="patch_student@test.com", password="password", first_name="OldFirst", last_name="OldLast")
        OrganizationMember.objects.create(organization=self.org, user=student, role=self.role_student)
        
        url = reverse('organization-students-detail', kwargs={'org_pk': self.org.id, 'pk': str(student.id)})
        data = {
            "first_name": "NewFirst",
            "last_name": "NewLast",
            "phone_number": "111222",
            "student_id": "SID789",
            "batch_ids": [self.batch.id]
        }
        resp = self.client.patch(url, data, format='json')
        assert resp.status_code == 200
        
        student.refresh_from_db()
        assert student.first_name == "NewFirst"
        assert student.last_name == "NewLast"
        assert student.phone_number == "111222"
        
        # Verify BatchStudent enrollment is created/updated
        from organizations.models import BatchStudent
        bs = BatchStudent.objects.get(batch=self.batch, student=student)
        assert bs.student_id_number == "SID789"


