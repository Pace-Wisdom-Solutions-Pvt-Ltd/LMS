# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role
from curriculum.models import Course

from unittest.mock import patch

@pytest.mark.django_db
class TestOrganizationsCoverageBoost:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(email="orgadmin@test.com", username="orgadmin", password="password")
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        
        self.admin_role = Role.objects.get(name='org_admin')
        self.teacher_role = Role.objects.get(name='teacher')
        self.student_role = Role.objects.get(name='student')
        
        OrganizationMember.objects.get_or_create(organization=self.org, user=self.admin, role=self.admin_role)
        self.client.force_authenticate(user=self.admin)
        
        self.batch = Batch.objects.create(organization=self.org, name="Batch 1", start_date="2026-01-01", end_date="2026-12-31")
        self.course = Course.objects.create(organization=self.org, title="Org Course")

    def _get_data(self, resp):
        if isinstance(resp.data, dict) and 'results' in resp.data:
            return resp.data['results']
        return resp.data

    def test_org_member_list(self):
        url = reverse('organization-members-list', kwargs={'org_pk': self.org.id})
        resp = self.client.get(url)
        assert resp.status_code == 200
        data = self._get_data(resp)
        assert any(m['user_detail']['email'] == self.admin.email for m in data)

    def test_staff_list(self):
        url = reverse('organization-staff-list', kwargs={'org_pk': self.org.id})
        resp = self.client.get(url)
        assert resp.status_code == 200
        data = self._get_data(resp)
        assert any(m['user_detail']['email'] == self.admin.email for m in data)

    def test_batch_list_and_create(self):
        url = reverse('organization-batches-list', kwargs={'org_pk': self.org.id})
        # List
        resp = self.client.get(url)
        assert resp.status_code == 200
        data = self._get_data(resp)
        assert any(b['name'] == self.batch.name for b in data)
        
        # Create
        resp = self.client.post(url, {'name': 'Batch 2', 'start_date': '2026-02-01', 'end_date': '2026-03-01'})
        assert resp.status_code == 201

    def test_batch_student_list(self):
        student_user = User.objects.create_user(email="student@test.com", username="student")
        BatchStudent.objects.create(batch=self.batch, student=student_user)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': self.org.id, 'batch_pk': self.batch.id})
        resp = self.client.get(url)
        assert resp.status_code == 200
        data = self._get_data(resp)
        assert len(data) >= 1

    def test_batch_student_bulk_add_duplicate_blocked(self):
        # First add
        url = reverse('organization-batch-students-list', kwargs={'org_pk': self.org.id, 'batch_pk': self.batch.id})
        data = {
            'students': [
                {'email': 'existing@test.com', 'first_name': 'Old', 'last_name': 'Name'}
            ]
        }
        self.client.post(url, data, format='json')
        
        # Second add with same email (should be blocked by BatchStudent existence check)
        data_update = {
            'students': [
                {'email': 'existing@test.com', 'first_name': 'New', 'last_name': 'Name'}
            ]
        }
        resp = self.client.post(url, data_update, format='json')
        assert resp.status_code == 400
        assert "already enrolled" in str(resp.data[0])

    def test_batch_student_retrieve_by_student_id_number(self):
        student_user = User.objects.create_user(email="sid@test.com", username="sid")
        BatchStudent.objects.create(batch=self.batch, student=student_user, student_id_number="S123")
        
        url = reverse('organization-batch-students-detail', kwargs={
            'org_pk': self.org.id,
            'batch_pk': self.batch.id,
            'pk': "S123"
        })
        resp = self.client.get(url)
        assert resp.status_code == 200
        # Serializer uses 'student_id' as key for 'student_id_number'
        assert resp.data['student_id'] == "S123"

    def test_org_student_list(self):
        url = reverse('organization-students-list', kwargs={'org_pk': self.org.id})
        resp = self.client.get(url)
        assert resp.status_code == 200

    def test_teacher_enrolled_as_student(self):
        # 1. Create a teacher
        teacher_user = User.objects.create_user(email="teacher_role@test.com", username="teacher_role")
        OrganizationMember.objects.create(organization=self.org, user=teacher_user, role=self.teacher_role)
        
        # 2. Add the teacher user as a student in self.batch
        url = reverse('organization-batch-students-list', kwargs={'org_pk': self.org.id, 'batch_pk': self.batch.id})
        data = {
            'students': [
                {'email': 'teacher_role@test.com', 'first_name': 'Teacher', 'last_name': 'Student'}
            ]
        }
        resp = self.client.post(url, data, format='json')
        assert resp.status_code == 201
        
        # Verify BatchStudent is created
        assert BatchStudent.objects.filter(batch=self.batch, student=teacher_user).exists()
        # Verify their membership role is still 'teacher'
        member = OrganizationMember.objects.get(organization=self.org, user=teacher_user)
        assert member.role.name == 'teacher'

    def test_permissions_edge_cases(self):
        from django.contrib.auth.models import AnonymousUser
        from organizations.permissions import IsOrgAdminOrTeacher, IsOrgAdmin, IsOrgAdminOrTeacherOrEnrolledStudent
        
        request = type("Req", (), {"user": AnonymousUser()})()
        view = type("V", (), {"kwargs": {"org_pk": self.org.id}})()
        
        p1 = IsOrgAdminOrTeacher()
        p2 = IsOrgAdmin()
        p3 = IsOrgAdminOrTeacherOrEnrolledStudent()
        
        # Anonymous users
        assert not p1.has_permission(request, view)
        assert not p2.has_permission(request, view)
        assert not p3.has_permission(request, view)
        
        # Authenticated but missing org/batch kwargs
        request.user = self.admin
        view_empty = type("V", (), {"kwargs": {}})()
        assert not p1.has_permission(request, view_empty)
        assert not p2.has_permission(request, view_empty)
        assert not p3.has_permission(request, view_empty)
        
        # Enrolled student missing batch_pk
        p3_view = type("V", (), {"kwargs": {"org_pk": self.org.id}})()
        # Create non-staff user
        non_staff = User.objects.create_user(email="non_staff@test.com", password="password")
        request.user = non_staff
        assert not p3.has_permission(request, p3_view)

