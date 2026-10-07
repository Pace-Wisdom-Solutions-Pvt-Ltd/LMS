# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from analytics.tasks import calculate_daily_analytics
from analytics.models import DailyOrgMetrics, DailyBatchMetrics
from organizations.models import Organization, Batch, OrganizationMember, BatchStudent
from rbac.models import Role
from accounts.models import User
from curriculum.models import StudentNodeProgress, AssignmentSubmission, Node, Module, Course

@pytest.mark.django_db
def test_calculate_daily_analytics_org_metrics():
    yesterday = timezone.now().date() - timedelta(days=1)

    # Create mock organization and users
    org = Organization.objects.create(name="Test Org", is_active=True)
    active_user = User.objects.create(email="active@user.com", is_active=True, username="active_user")
    inactive_user = User.objects.create(email="inactive@user.com", is_active=False, username="inactive_user")

    # Get or create roles
    teacher_role, _ = Role.objects.get_or_create(name="teacher", defaults={"description": "Teacher role"})

    # Assign users to organization with roles
    OrganizationMember.objects.create(organization=org, user=active_user, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=inactive_user, role=teacher_role)

    # Create a Course, Module, and Node instance
    course = Course.objects.create(title="Test Course", organization=org)
    module = Module.objects.create(title="Test Module", course=course)
    node = Node.objects.create(module=module, title="Test Node", sequence_order=1)

    # Mock progress
    StudentNodeProgress.objects.create(student=active_user, node=node, status="Completed")
    StudentNodeProgress.objects.create(student=inactive_user, node=node, status="In_Progress")

    # Run the task
    calculate_daily_analytics()

    # Verify DailyOrgMetrics
    metrics = DailyOrgMetrics.objects.get(organization=org, date=yesterday)
    assert metrics.total_active_users == 1
    assert metrics.total_inactive_users == 1
    assert metrics.total_certificates_issued == 0
    assert metrics.avg_course_completion_rate == pytest.approx(50.0)

# Replace batch.students.add() with BatchStudent instances
@pytest.mark.django_db
def test_calculate_daily_analytics_batch_metrics():
    yesterday = timezone.now().date() - timedelta(days=1)

    # Create mock organization and batch
    org = Organization.objects.create(name="Test Org", is_active=True)
    batch = Batch.objects.create(
        name="Test Batch", 
        is_active=True, 
        start_date=timezone.now().date(), 
        end_date=timezone.now().date() + timedelta(days=30),
        organization=org
    )
    student1 = User.objects.create(email="student1@batch.com", username="student1")
    student2 = User.objects.create(email="student2@batch.com", username="student2")

    # Get or create roles
    student_role, _ = Role.objects.get_or_create(name="student", defaults={"description": "Student role"})

    # Assign students to organization and batch with roles
    OrganizationMember.objects.create(organization=org, user=student1, role=student_role)
    OrganizationMember.objects.create(organization=org, user=student2, role=student_role)
    BatchStudent.objects.create(batch=batch, student=student1)  # Link student1 to the batch
    BatchStudent.objects.create(batch=batch, student=student2)  # Link student2 to the batch

    # Create a Course, Module, and Node instance
    course = Course.objects.create(title="Test Course", organization=org)
    module = Module.objects.create(title="Test Module", course=course)
    node = Node.objects.create(module=module, title="Test Node", sequence_order=1)

    # Create an Assessment for the node and use it for submissions
    from curriculum.models import Assessment
    assessment = Assessment.objects.create(
        node=node,
        assignment_type='MCQ',
        prompt='Test assessment',
        passing_score_percentage=50,
    )

    # Mock assignment submissions (link to the created assessment)
    AssignmentSubmission.objects.create(assessment=assessment, student=student1, awarded_score=80, status="Graded", payload={"data": "example"})
    AssignmentSubmission.objects.create(assessment=assessment, student=student2, awarded_score=40, status="Graded", payload={"data": "example"})

    # Mock progress
    StudentNodeProgress.objects.create(student=student1, node=node, status="In_Progress")
    StudentNodeProgress.objects.create(student=student2, node=node, status="In_Progress")

    # Run the task
    calculate_daily_analytics()

    # Verify DailyBatchMetrics
    metrics = DailyBatchMetrics.objects.get(batch=batch, date=yesterday)
    assert metrics.avg_assignment_score == pytest.approx(60.0)
    assert metrics.top_drop_off_node_id == node.id
    assert metrics.students_at_risk_count == 1

    print(StudentNodeProgress.objects.filter(
        student__batch_enrollments__batch=batch,
        status='In_Progress'
    ).query)