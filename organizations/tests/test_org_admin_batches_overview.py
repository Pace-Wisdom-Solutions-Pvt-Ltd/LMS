# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from organizations.models import Organization, Batch, BatchStudent, OrganizationMember
from rbac.models import Role, UserRole
from curriculum.models import Course, Module, Node, Task, TaskSubmission, Quiz, QuizSubmission

User = get_user_model()
TEST_VAL = "testpassword123"

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data():
    # Roles
    _ = Role.objects.get_or_create(name="superadmin")[0]
    org_admin_role, _ = Role.objects.get_or_create(name="org_admin")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    student_role, _ = Role.objects.get_or_create(name="student")

    # Organization
    org = Organization.objects.create(name="Test Org", slug="test-org")

    admin_user = User.objects.create_user(email="admin@test.com", password=TEST_VAL)
    OrganizationMember.objects.create(organization=org, user=admin_user, role=org_admin_role)
    UserRole.objects.create(user=admin_user, role=org_admin_role)

    teacher_user = User.objects.create_user(email="teacher@test.com", password=TEST_VAL, first_name="teacher")
    OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    UserRole.objects.create(user=teacher_user, role=teacher_role)

    student_user = User.objects.create_user(email="student@test.com", password=TEST_VAL)
    OrganizationMember.objects.create(organization=org, user=student_user, role=student_role)
    UserRole.objects.create(user=student_user, role=student_role)

    # Course / Modules / Nodes
    course = Course.objects.create(organization=org, title="Test Course", status="Published")
    course.teachers.add(teacher_user)

    module = Module.objects.create(course=course, title="Module 1", sequence_order=1)
    
    node1 = Node.objects.create(module=module, title="Node 1", sequence_order=1)
    task1 = Task.objects.create(node=node1, title="Task 1")

    node2 = Node.objects.create(module=module, title="Node 2", sequence_order=2)
    task2 = Task.objects.create(node=node2, title="Task 2")

    quiz_node = Node.objects.create(module=module, title="Quiz Node", sequence_order=3)
    quiz = Quiz.objects.create(node=quiz_node, name="Test Quiz")

    # Batch
    batch = Batch.objects.create(
        organization=org,
        name="Batch A - 2026",
        start_date=timezone.now().date(),
        end_date=(timezone.now() + timedelta(days=30)).date()
    )
    batch.courses.add(course)

    # Enroll student in batch
    BatchStudent.objects.create(batch=batch, student=student_user)

    # Submissions
    # 1. Overdue Task submission (submitted 3 days ago, status='Pending')
    three_days_ago = timezone.now() - timedelta(days=3)
    sub1 = TaskSubmission.objects.create(
        task=task1,
        student=student_user,
        payload={"text": "hello"},
        status="Pending"
    )
    # Force submitted_at to be 3 days ago for test
    TaskSubmission.objects.filter(id=sub1.id).update(submitted_at=three_days_ago)

    # 2. Approved Task submission
    TaskSubmission.objects.create(
        task=task2,
        student=student_user,
        payload={"text": "world"},
        status="Approved",
        graded_at=timezone.now()
    )

    # 3. Passed Quiz submission (Completed)
    QuizSubmission.objects.create(
        quiz=quiz,
        student=student_user,
        status="Passed",
        passed=True,
        score=100.0,
        total_questions=10,
        correct_answers=10
    )

    # 4. Failed Quiz submission (Pending completion)
    QuizSubmission.objects.create(
        quiz=quiz,
        student=student_user,
        status="Failed",
        passed=False,
        score=20.0,
        total_questions=10,
        correct_answers=2
    )

    return {
        "org": org,
        "admin": admin_user,
        "teacher": teacher_user,
        "student": student_user,
        "batch": batch,
        "course": course,
        "quiz": quiz
    }

@pytest.mark.django_db
def test_org_admin_batches_overview_api(api_client, setup_data):
    org = setup_data["org"]
    admin = setup_data["admin"]
    batch = setup_data["batch"]
    course = setup_data["course"]
    student = setup_data["student"]
    teacher = setup_data["teacher"]

    url = reverse("org-admin-batches-overview", kwargs={"org_pk": org.id})
    api_client.force_authenticate(user=admin)

    # 1. Scenario A: List batches
    resp = api_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.data) == 1
    assert resp.data[0]["id"] == batch.id
    assert resp.data[0]["name"] == "Batch A - 2026"
    assert resp.data[0]["courses_count"] == 1
    assert resp.data[0]["students_count"] == 1
    assert resp.data[0]["overdue_reviews_count"] == 1  # only sub1 is overdue (> 2 days)

    # 2. Scenario B: List courses under batch
    resp = api_client.get(url, {"batch_id": batch.id})
    assert resp.status_code == status.HTTP_200_OK
    courses_info = resp.data["courses"]
    assert len(courses_info) == 1
    assert courses_info[0]["id"] == course.id
    assert courses_info[0]["trainer_name"] == "teacher"  # from teacher_user's name/username
    assert courses_info[0]["students_enrolled_count"] == 1
    assert courses_info[0]["overdue_reviews_count"] == 1
    assert courses_info[0]["review_status"] == "1 overdue"

    # 3. Scenario C: List students & teacher progress under course in batch
    # Enroll a second student with 0 submissions
    student2 = User.objects.create_user(email="student2@test.com", password=TEST_VAL)
    student2_role = Role.objects.get(name="student")
    OrganizationMember.objects.create(organization=org, user=student2, role=student2_role)
    UserRole.objects.create(user=student2, role=student2_role)
    BatchStudent.objects.create(batch=batch, student=student2)

    resp = api_client.get(url, {"batch_id": batch.id, "course_id": course.id})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["batch_id"] == batch.id
    assert resp.data["course_id"] == course.id
    
    students_info = resp.data["students"]
    assert len(students_info) == 2
    
    s1_info = next(s for s in students_info if s["student_id"] == student.id)
    assert s1_info["progress"] == "1/2"  # 1 approved/graded out of 2 total tasks
    assert s1_info["evaluation_percentage"] == 50
    assert "Overdue" in s1_info["review_status"]

    s2_info = next(s for s in students_info if s["student_id"] == student2.id)
    assert s2_info["progress"] == "0/2"
    assert s2_info["evaluation_percentage"] == 0
    assert s2_info["review_status"] == "No Submissions"

    # 4. Scenario D: View detail of student
    resp = api_client.get(url, {"batch_id": batch.id, "course_id": course.id, "student_id": str(student.id)})
    assert resp.status_code == status.HTTP_200_OK
    assert "modules" in resp.data  # detailed progress serialized structure

    # 5. Permission restriction tests
    api_client.force_authenticate(user=teacher)
    resp = api_client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    api_client.force_authenticate(user=student)
    resp = api_client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_pending_evaluations_enhanced(api_client, setup_data):
    org = setup_data["org"]
    teacher = setup_data["teacher"]

    url = reverse("pending-evaluations", kwargs={"org_id": org.id})
    api_client.force_authenticate(user=teacher)

    # 1. GET pending assessments
    resp = api_client.get(url, {"type": "assessment", "status": "pending"})
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data.get("results", resp.data)
    assert len(results) >= 1
    assert results[0]["status"] == "Pending"
    assert "node_title" in results[0]
    assert "module_title" in results[0]

    # 2. GET completed assessments
    resp = api_client.get(url, {"type": "assessment", "status": "completed"})
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data.get("results", resp.data)
    assert len(results) >= 1
    assert results[0]["status"] == "Approved"

    # 3. GET pending quizzes
    resp = api_client.get(url, {"type": "quiz", "status": "pending"})
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data.get("results", resp.data)
    assert len(results) >= 1
    assert results[0]["status"] == "Failed"
    assert "node_title" in results[0]
    assert "module_title" in results[0]

    # 4. GET completed quizzes
    resp = api_client.get(url, {"type": "quiz", "status": "completed"})
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data.get("results", resp.data)
    assert len(results) >= 1
    assert results[0]["status"] == "Passed"
