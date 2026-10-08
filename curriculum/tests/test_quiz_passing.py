# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from curriculum.models import Course, Module, Node, Quiz, QuizQuestion, QuizOption, StudentNodeProgress
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role
from accounts.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def quiz_setup(db):
    org = Organization.objects.create(name="Quiz Org", slug="quiz-org")
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    student_role, _ = Role.objects.get_or_create(name="student")
    admin = User.objects.create_user(email="admin@quiz.com", password="password123")
    student = User.objects.create_user(email="student@quiz.com", password="password123")
    OrganizationMember.objects.create(user=admin, organization=org, role=admin_role)
    OrganizationMember.objects.create(user=student, organization=org, role=student_role)

    course = Course.objects.create(organization=org, title="Quiz Course", status="Published")
    module = Module.objects.create(course=course, title="Quiz Module")
    node = Node.objects.create(module=module, title="Quiz Node")
    batch = Batch.objects.create(
        organization=org,
        name="Quiz Batch",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
    )
    batch.courses.add(course)
    BatchStudent.objects.create(batch=batch, student=student, course=course)

    quiz = Quiz.objects.create(node=node, name="Two Question Quiz", passing_percentage=50)
    questions = []
    for i in range(2):
        question = QuizQuestion.objects.create(quiz=quiz, question_text=f"Q{i}")
        right = QuizOption.objects.create(question=question, option_text="Right", is_correct=True)
        wrong = QuizOption.objects.create(question=question, option_text="Wrong", is_correct=False)
        questions.append((question, right, wrong))

    return {"org": org, "admin": admin, "student": student, "course": course,
            "module": module, "node": node, "quiz": quiz, "questions": questions}


def _submit(api_client, data, correct_count):
    answers = [
        {"question": q.id, "selected_option": (right if i < correct_count else wrong).id}
        for i, (q, right, wrong) in enumerate(data["questions"])
    ]
    api_client.force_authenticate(user=data["student"])
    url = reverse("quiz-submission", kwargs={"quiz_id": data["quiz"].id})
    return api_client.post(url, {"answers": answers}, format="json")


def _progress_status(data):
    progress = StudentNodeProgress.objects.filter(student=data["student"], node=data["node"]).first()
    return progress.status if progress else None


def test_quiz_below_passing_percentage_fails(api_client, quiz_setup):
    response = _submit(api_client, quiz_setup, correct_count=0)

    assert response.status_code == status.HTTP_201_CREATED
    assert float(response.data["score"]) == 0
    assert response.data["passed"] is False
    assert response.data["status"] == "Failed"
    assert _progress_status(quiz_setup) == "In_Progress"


def test_quiz_at_passing_percentage_passes(api_client, quiz_setup):
    response = _submit(api_client, quiz_setup, correct_count=1)

    assert response.status_code == status.HTTP_201_CREATED
    assert float(response.data["score"]) == 50
    assert response.data["passed"] is True
    assert response.data["status"] == "Passed"
    assert _progress_status(quiz_setup) == "Completed"


def test_failed_retake_does_not_undo_earlier_pass(api_client, quiz_setup):
    assert _submit(api_client, quiz_setup, correct_count=2).data["passed"] is True
    retake = _submit(api_client, quiz_setup, correct_count=0)

    assert retake.data["passed"] is False
    assert retake.data["attempt_number"] == 2
    assert _progress_status(quiz_setup) == "Completed"


def test_fail_then_pass_completes_node(api_client, quiz_setup):
    assert _submit(api_client, quiz_setup, correct_count=0).data["passed"] is False
    assert _submit(api_client, quiz_setup, correct_count=2).data["passed"] is True
    assert _progress_status(quiz_setup) == "Completed"


def test_passing_percentage_boundary_uses_exact_arithmetic(api_client, quiz_setup):
    # 57/100 * 100 is 56.99999... in floating point; the student must still pass at 57%.
    quiz = Quiz.objects.create(node=quiz_setup["node"], name="Hundred", passing_percentage=57)
    for i in range(100):
        question = QuizQuestion.objects.create(quiz=quiz, question_text=f"H{i}")
        QuizOption.objects.create(question=question, option_text="Right", is_correct=True)
        QuizOption.objects.create(question=question, option_text="Wrong", is_correct=False)
    answers = [
        {"question": q.id, "selected_option": q.options.get(is_correct=(i < 57)).id}
        for i, q in enumerate(quiz.questions.order_by("id"))
    ]
    api_client.force_authenticate(user=quiz_setup["student"])
    response = api_client.post(reverse("quiz-submission", kwargs={"quiz_id": quiz.id}), {"answers": answers}, format="json")

    assert response.data["correct_answers"] == 57
    assert response.data["passed"] is True


def test_quiz_passing_percentage_defaults_to_70(quiz_setup):
    quiz = Quiz.objects.create(node=quiz_setup["node"], name="Default")
    assert quiz.passing_percentage == 70


def test_node_create_accepts_quiz_passing_percentage(api_client, quiz_setup):
    api_client.force_authenticate(user=quiz_setup["admin"])
    url = reverse("node-create", kwargs={
        "org_id": quiz_setup["org"].id,
        "course_id": quiz_setup["course"].id,
        "module_id": quiz_setup["module"].id,
    })
    response = api_client.post(url, {
        "title": "Configured Quiz Node",
        "quiz_name": "Configured Quiz",
        "quiz_passing_percentage": 80,
        "quiz_question_text": "Pick A",
        "quiz_option_a": "A",
        "quiz_option_b": "B",
        "quiz_correct_option": "a",
    }, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert Node.objects.get(id=response.data["id"]).quizzes.first().passing_percentage == 80


def test_node_create_rejects_passing_percentage_above_100(api_client, quiz_setup):
    api_client.force_authenticate(user=quiz_setup["admin"])
    url = reverse("node-create", kwargs={
        "org_id": quiz_setup["org"].id,
        "course_id": quiz_setup["course"].id,
        "module_id": quiz_setup["module"].id,
    })
    response = api_client.post(url, {
        "title": "Bad Quiz Node",
        "quiz_name": "Bad Quiz",
        "quiz_passing_percentage": 150,
        "quiz_question_text": "Pick A",
        "quiz_option_a": "A",
        "quiz_option_b": "B",
        "quiz_correct_option": "a",
    }, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
