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

@pytest.mark.django_db
class TestTeacherDashboard:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="teacher@lms.com", username="teacher", password="password")
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        
        # Ensure roles exist
        self.org_admin_role, _ = Role.objects.get_or_create(name='org_admin')
        self.teacher_role, _ = Role.objects.get_or_create(name='teacher')
        self.student_role, _ = Role.objects.get_or_create(name='student')
        
        # Add teacher to org
        OrganizationMember.objects.create(organization=self.org, user=self.user, role=self.teacher_role)
        self.client.force_authenticate(user=self.user)

    def test_teacher_dashboard_counts(self):
        # 1. Setup assigned Batch and Course for self.user (teacher)
        batch = Batch.objects.create(organization=self.org, name="Teacher Batch", start_date="2026-01-01", end_date="2026-12-31")
        course = Course.objects.create(organization=self.org, title="Teacher Course")
        
        member = OrganizationMember.objects.get(organization=self.org, user=self.user)
        member.batches.add(batch)
        course.teachers.add(self.user)

        # 2. Add students to THIS teacher's batch/course
        student1 = User.objects.create_user(email="s1@lms.com", username="s1", password="password")
        OrganizationMember.objects.create(organization=self.org, user=student1, role=self.student_role)
        BatchStudent.objects.create(batch=batch, student=student1, course=course)
        
        student2 = User.objects.create_user(email="s2@lms.com", username="s2", password="password")
        OrganizationMember.objects.create(organization=self.org, user=student2, role=self.student_role)
        BatchStudent.objects.create(batch=batch, student=student2)

        # 3. Add ANOTHER teacher with their own batch/students (to verify isolation)
        other_teacher = User.objects.create_user(email="other@lms.com", username="other", password="password")
        other_batch = Batch.objects.create(organization=self.org, name="Other Batch", start_date="2026-01-01", end_date="2026-12-31")
        om = OrganizationMember.objects.create(organization=self.org, user=other_teacher, role=self.teacher_role)
        om.batches.add(other_batch)
        
        other_student = User.objects.create_user(email="os@lms.com", username="os", password="password")
        OrganizationMember.objects.create(organization=self.org, user=other_student, role=self.student_role)
        BatchStudent.objects.create(batch=other_batch, student=other_student)

        # 4. Verify self.user's dashboard
        url = reverse('teacher-dashboard', kwargs={'org_pk': self.org.id, 'teacher_id': self.user.id})
        resp = self.client.get(url)
        
        assert resp.status_code == 200
        assert resp.data['student_count'] == 2
        assert resp.data['batch_count'] == 1
        assert resp.data['course_count'] == 1
        assert 'staff_count' not in resp.data

        # 5. Verify other_teacher's dashboard
        url = reverse('teacher-dashboard', kwargs={'org_pk': self.org.id, 'teacher_id': other_teacher.id})
        resp = self.client.get(url)
        
        assert resp.status_code == 200
        assert resp.data['student_count'] == 1
        assert resp.data['batch_count'] == 1
        assert resp.data['course_count'] == 0

    def test_teacher_dashboard_uses_member_course_and_batch_fallback_assignments(self):
        batch = Batch.objects.create(organization=self.org, name="Fallback Batch", start_date="2026-01-01", end_date="2026-12-31")
        course = Course.objects.create(organization=self.org, title="Fallback Course")

        member = OrganizationMember.objects.get(organization=self.org, user=self.user)
        member.batches.add(batch)
        member.course = course
        member.save()

        batch.courses.add(course)

        student = User.objects.create_user(email="fallback-student@lms.com", username="fallback-student", password="password")
        OrganizationMember.objects.create(organization=self.org, user=student, role=self.student_role)
        BatchStudent.objects.create(batch=batch, student=student)

        url = reverse('teacher-dashboard', kwargs={'org_pk': self.org.id, 'teacher_id': self.user.id})
        resp = self.client.get(url)

        assert resp.status_code == 200
        assert resp.data['student_count'] == 1
        assert resp.data['batch_count'] == 1
        assert resp.data['course_count'] == 1

    def test_teacher_dashboard_counts_same_student_once_across_multiple_batches(self):
        course = Course.objects.create(organization=self.org, title="Shared Course")
        batch_one = Batch.objects.create(organization=self.org, name="Batch One", start_date="2026-01-01", end_date="2026-12-31")
        batch_two = Batch.objects.create(organization=self.org, name="Batch Two", start_date="2026-01-01", end_date="2026-12-31")
        batch_one.courses.add(course)
        batch_two.courses.add(course)
        course.teachers.add(self.user)

        student = User.objects.create_user(email="shared-student@lms.com", username="shared-student", password="password")
        OrganizationMember.objects.create(organization=self.org, user=student, role=self.student_role)
        BatchStudent.objects.create(batch=batch_one, student=student)
        BatchStudent.objects.create(batch=batch_two, student=student)

        url = reverse('teacher-dashboard', kwargs={'org_pk': self.org.id, 'teacher_id': self.user.id})
        resp = self.client.get(url)

        assert resp.status_code == 200
        assert resp.data['student_count'] == 1
        assert resp.data['batch_count'] == 2
        assert resp.data['course_count'] == 1
