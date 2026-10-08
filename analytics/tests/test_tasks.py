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

@pytest.mark.django_db
def test_batch_avg_score_is_scoped_to_batch_students():
    """Batches in the same organization must not share an org-wide average."""
    from curriculum.models import Assessment
    yesterday = timezone.now().date() - timedelta(days=1)
    org = Organization.objects.create(name="Scoped Org", is_active=True)
    student_role, _ = Role.objects.get_or_create(name="student", defaults={"description": "Student role"})
    course = Course.objects.create(title="Scoped Course", organization=org)
    module = Module.objects.create(title="Scoped Module", course=course)
    node = Node.objects.create(module=module, title="Scoped Node", sequence_order=1)
    assessment = Assessment.objects.create(node=node, assignment_type='MCQ', prompt='Scoped', passing_score_percentage=50)

    batches = []
    for name, score in (("Batch A", 90), ("Batch B", 30)):
        batch = Batch.objects.create(
            name=name,
            is_active=True,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=30),
            organization=org,
        )
        user = User.objects.create(email=f"{name.replace(' ', '').lower()}@scoped.com", username=name)
        OrganizationMember.objects.create(organization=org, user=user, role=student_role)
        BatchStudent.objects.create(batch=batch, student=user)
        AssignmentSubmission.objects.create(assessment=assessment, student=user, awarded_score=score, status="Graded", payload={})
        batches.append(batch)

    calculate_daily_analytics()

    assert DailyBatchMetrics.objects.get(batch=batches[0], date=yesterday).avg_assignment_score == pytest.approx(90.0)
    assert DailyBatchMetrics.objects.get(batch=batches[1], date=yesterday).avg_assignment_score == pytest.approx(30.0)


def _make_batch_with_students(name, count):
    org = Organization.objects.create(name=f"{name} Org", is_active=True)
    student_role, _ = Role.objects.get_or_create(name="student", defaults={"description": "Student role"})
    batch = Batch.objects.create(
        name=name,
        is_active=True,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=30),
        organization=org,
    )
    course = Course.objects.create(title=f"{name} Course", organization=org)
    module = Module.objects.create(title=f"{name} Module", course=course)
    users = []
    for i in range(count):
        user = User.objects.create(email=f"{name.lower()}{i}@example.com", username=f"{name.lower()}{i}")
        OrganizationMember.objects.create(organization=org, user=user, role=student_role)
        BatchStudent.objects.create(batch=batch, student=user)
        users.append(user)
    return batch, module, users


@pytest.mark.django_db
def test_batch_metrics_include_task_and_quiz_scores():
    from curriculum.models import Task, TaskSubmission, Quiz, QuizSubmission
    yesterday = timezone.now().date() - timedelta(days=1)
    batch, module, (task_student, quiz_student) = _make_batch_with_students("Mixed", 2)

    task_node = Node.objects.create(module=module, title="Task Node", sequence_order=1)
    task = Task.objects.create(node=task_node, title="Task")
    TaskSubmission.objects.create(task=task, student=task_student, status="Approved", awarded_score=80)
    # Pending tasks without a score are not counted
    TaskSubmission.objects.create(task=task, student=task_student, status="Pending")

    quiz_node = Node.objects.create(module=module, title="Quiz Node", sequence_order=2)
    quiz = Quiz.objects.create(node=quiz_node, name="Quiz")
    QuizSubmission.objects.create(quiz=quiz, student=quiz_student, score=20, status="Failed")

    calculate_daily_analytics()

    metrics = DailyBatchMetrics.objects.get(batch=batch, date=yesterday)
    assert metrics.avg_assignment_score == pytest.approx(50.0)
    assert metrics.students_at_risk_count == 1


@pytest.mark.django_db
def test_batch_metrics_query_count_does_not_grow_with_students():
    from curriculum.models import Quiz, QuizSubmission
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    def run_with_students(name, count):
        batch, module, users = _make_batch_with_students(name, count)
        node = Node.objects.create(module=module, title=f"{name} Node", sequence_order=1)
        quiz = Quiz.objects.create(node=node, name=f"{name} Quiz")
        for user in users:
            QuizSubmission.objects.create(quiz=quiz, student=user, score=40, status="Failed")
        with CaptureQueriesContext(connection) as ctx:
            calculate_daily_analytics()
        Batch.objects.filter(id=batch.id).update(is_active=False)
        Organization.objects.filter(id=batch.organization_id).update(is_active=False)
        return len(ctx.captured_queries), batch

    small_queries, _ = run_with_students("Small", 2)
    large_queries, large_batch = run_with_students("Large", 12)

    assert large_queries == small_queries
    yesterday = timezone.now().date() - timedelta(days=1)
    assert DailyBatchMetrics.objects.get(batch=large_batch, date=yesterday).students_at_risk_count == 12
