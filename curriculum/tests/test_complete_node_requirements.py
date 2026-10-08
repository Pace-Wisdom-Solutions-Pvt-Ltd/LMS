# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from curriculum.models import (
    Course, Module, Node, Task, TaskSubmission, Quiz, QuizSubmission, StudentNodeProgress,
)
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role
from accounts.models import User


@pytest.fixture
def setup(db):
    org = Organization.objects.create(name="Complete Org", slug="complete-org")
    student_role, _ = Role.objects.get_or_create(name="student")
    student = User.objects.create_user(email="student@complete.com", password="password123")
    OrganizationMember.objects.create(user=student, organization=org, role=student_role)

    course = Course.objects.create(organization=org, title="Course", status="Published")
    module = Module.objects.create(course=course, title="Module")
    batch = Batch.objects.create(
        organization=org,
        name="Batch",
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
    )
    batch.courses.add(course)
    BatchStudent.objects.create(batch=batch, student=student, course=course)

    client = APIClient()
    client.force_authenticate(user=student)
    return {"client": client, "student": student, "module": module}


def _complete(setup, node):
    return setup["client"].post(reverse("node-complete", kwargs={"node_id": node.id}), {}, format="json")


def _is_completed(setup, node):
    return StudentNodeProgress.objects.filter(student=setup["student"], node=node, status="Completed").exists()


def test_node_without_requirements_can_be_completed(setup):
    node = Node.objects.create(module=setup["module"], title="Reading")

    assert _complete(setup, node).status_code == status.HTTP_200_OK
    assert _is_completed(setup, node)


def test_task_node_without_submission_cannot_be_completed(setup):
    node = Node.objects.create(module=setup["module"], title="Task Node")
    Task.objects.create(node=node, title="Task")

    response = _complete(setup, node)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert not _is_completed(setup, node)


@pytest.mark.parametrize("submission_status", ["Pending", "Rejected", "Needs Manual Review"])
def test_task_node_with_unapproved_submission_cannot_be_completed(setup, submission_status):
    node = Node.objects.create(module=setup["module"], title="Task Node")
    task = Task.objects.create(node=node, title="Task")
    TaskSubmission.objects.create(task=task, student=setup["student"], status=submission_status)

    assert _complete(setup, node).status_code == status.HTTP_400_BAD_REQUEST
    assert not _is_completed(setup, node)


@pytest.mark.parametrize("submission_status", ["Approved", "Graded"])
def test_task_node_with_approved_submission_can_be_completed(setup, submission_status):
    node = Node.objects.create(module=setup["module"], title="Task Node")
    task = Task.objects.create(node=node, title="Task")
    TaskSubmission.objects.create(task=task, student=setup["student"], status=submission_status)

    assert _complete(setup, node).status_code == status.HTTP_200_OK
    assert _is_completed(setup, node)


def test_quiz_node_without_attempt_cannot_be_completed(setup):
    node = Node.objects.create(module=setup["module"], title="Quiz Node")
    Quiz.objects.create(node=node, name="Quiz")

    assert _complete(setup, node).status_code == status.HTTP_400_BAD_REQUEST
    assert not _is_completed(setup, node)


def test_quiz_node_with_failed_attempt_cannot_be_completed(setup):
    node = Node.objects.create(module=setup["module"], title="Quiz Node")
    quiz = Quiz.objects.create(node=node, name="Quiz")
    QuizSubmission.objects.create(quiz=quiz, student=setup["student"], status="Failed", passed=False, score=10)

    assert _complete(setup, node).status_code == status.HTTP_400_BAD_REQUEST


def test_quiz_node_requires_every_quiz_passed(setup):
    node = Node.objects.create(module=setup["module"], title="Quiz Node")
    first = Quiz.objects.create(node=node, name="First")
    second = Quiz.objects.create(node=node, name="Second")
    QuizSubmission.objects.create(quiz=first, student=setup["student"], status="Passed", passed=True, score=100)

    assert _complete(setup, node).status_code == status.HTTP_400_BAD_REQUEST

    QuizSubmission.objects.create(quiz=second, student=setup["student"], status="Passed", passed=True, score=90)

    assert _complete(setup, node).status_code == status.HTTP_200_OK
    assert _is_completed(setup, node)
