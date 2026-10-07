# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from accounts.models import User
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role
from curriculum.models import Course, Module, Node, Task, TaskSubmission, StudentNodeProgress

@pytest.mark.django_db
class TestTeacherDashboardEnhanced:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(email="admin@lms.com", username="admin", password="password", is_superuser=True, first_name="Admin", last_name="User")
        self.teacher = User.objects.create_user(email="teacher@lms.com", username="teacher", password="password", first_name="Teacher", last_name="User")
        self.student = User.objects.create_user(email="student@lms.com", username="student", password="password", first_name="Student", last_name="User")
        
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.role, _ = Role.objects.get_or_create(name='teacher')
        
        # Assign teacher to org
        self.member = OrganizationMember.objects.create(
            user=self.teacher, organization=self.org, role=self.role
        )
        
        # Create course, module, node
        self.course = Course.objects.create(organization=self.org, title="Course")
        self.module = Module.objects.create(course=self.course, title="Module")
        self.node1 = Node.objects.create(module=self.module, title="Node 1", sequence_order=1)
        self.node2 = Node.objects.create(module=self.module, title="Node 2", sequence_order=2)
        
        self.course.teachers.add(self.member)
        
        # Assign student to course/org
        student_role, _ = Role.objects.get_or_create(name='student')
        self.student_member = OrganizationMember.objects.create(
            user=self.student, organization=self.org, role=student_role
        )
        self.batch = Batch.objects.create(
            organization=self.org, 
            name="Batch", 
            start_date="2026-01-01",
            end_date="2026-12-31"
        )
        self.batch.courses.add(self.course)
        BatchStudent.objects.create(batch=self.batch, student=self.student_member, course=self.course)

        self.client.force_authenticate(user=self.teacher)

    def test_dashboard_metrics(self):
        # 1. Add a pending submission
        task = Task.objects.create(node=self.node1, title="Task1")
        TaskSubmission.objects.create(task=task, student=self.student_member, status='Pending', payload={})
        
        # 2. Add some progress
        StudentNodeProgress.objects.create(student=self.student_member, node=self.node1, status='Completed')
        # Completion for this student should be 50% (1/2 nodes)

        url = reverse('teacher-dashboard', kwargs={'org_pk': self.org.id, 'teacher_id': self.teacher.id})
        resp = self.client.get(url)
        
        assert resp.status_code == 200
        data = resp.data
        assert data['student_count'] == 1
        assert data['course_count'] == 1
        assert data['pending_evaluations_count'] == 1
        assert data['average_completion_percentage'] == 50
        assert len(data['recent_submissions']) == 1
        assert data['recent_submissions'][0]['status'] == 'Pending'
