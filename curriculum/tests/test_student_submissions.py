# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from datetime import timedelta

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from organizations.models import Organization, Batch, BatchStudent
from curriculum.models import Course, Module, Node, Task, Quiz, QuizQuestion, QuizOption, TaskSubmission, QuizSubmission, StudentNodeProgress

User = get_user_model()

@pytest.fixture
def setup_data(db):
    org = Organization.objects.create(name="Test Org", slug="test-org")
    course = Course.objects.create(organization=org, title="Test Course")
    module = Module.objects.create(course=course, title="Test Module")
    node = Node.objects.create(module=module, title="Test Node")
    task = Task.objects.create(node=node, title="Test Task", allow_paragraph=True)
    
    quiz = Quiz.objects.create(node=node, name="Test Quiz")
    q1 = QuizQuestion.objects.create(quiz=quiz, question_text="What is Python?")
    o1 = QuizOption.objects.create(question=q1, option_text="A snake", is_correct=False)
    o2 = QuizOption.objects.create(question=q1, option_text="A language", is_correct=True)
    
    student = User.objects.create_user(email="student@test.com", password="password123")

    # enroll the student in an active batch spanning today so course access is
    # granted (see _student_course_access_error_message)
    today = timezone.localdate()
    batch = Batch.objects.create(
        organization=org, name="Test Batch", is_active=True,
        start_date=today - timedelta(days=1), end_date=today + timedelta(days=30),
    )
    batch.courses.add(course)
    BatchStudent.objects.create(batch=batch, student=student, course=course, is_active=True)

    return {
        "org": org,
        "course": course,
        "node": node,
        "task": task,
        "quiz": quiz,
        "q1": q1,
        "o1": o1,
        "o2": o2,
        "student": student
    }

@pytest.mark.django_db
def test_task_submission(setup_data):
    client = APIClient()
    client.force_authenticate(user=setup_data["student"])
    
    url = f"/api/nodes/{setup_data['node'].id}/task/submit/"
    data = {"payload": {"answer": "This is my task submission."}}
    
    response = client.post(url, data, format='json')
    if response.status_code != status.HTTP_201_CREATED:
        print(f"DEBUG TaskSubmission Error: {response.data}")
    assert response.status_code == status.HTTP_201_CREATED
    assert TaskSubmission.objects.filter(student=setup_data["student"], task=setup_data["task"]).exists()

@pytest.mark.django_db
def test_get_task_submissions(setup_data):
    client = APIClient()
    client.force_authenticate(user=setup_data["student"])
    
    TaskSubmission.objects.create(
        task=setup_data["task"],
        student=setup_data["student"],
        payload={"answer": "First attempt"}
    )
    
    url = f"/api/nodes/{setup_data['node'].id}/task/submit/"
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["payload"]["answer"] == "First attempt"

@pytest.mark.django_db
def test_quiz_submission(setup_data):
    client = APIClient()
    client.force_authenticate(user=setup_data["student"])
    
    url = f"/api/quizzes/{setup_data['quiz'].id}/submit/"
    data = {
        "answers": [
            {
                "question": setup_data["q1"].id,
                "selected_option": setup_data["o2"].id
            }
        ]
    }
    
    response = client.post(url, data, format='json')
    if response.status_code != status.HTTP_201_CREATED:
        print(f"DEBUG QuizSubmission Error: {response.data}")
    assert response.status_code == status.HTTP_201_CREATED
    assert float(response.data["score"]) == 100
    assert response.data["correct_answers"] == 1
    assert QuizSubmission.objects.filter(student=setup_data["student"], quiz=setup_data["quiz"]).exists()


@pytest.mark.django_db
def test_quiz_submission_multi_correct(setup_data):
    client = APIClient()
    client.force_authenticate(user=setup_data["student"])
    q1 = setup_data["q1"]
    q1.allow_multiple_correct = True
    q1.save()
    extra = QuizOption.objects.create(question=q1, option_text="Also correct", is_correct=True)

    url = f"/api/quizzes/{setup_data['quiz'].id}/submit/"
    data = {
        "answers": [
            {
                "question": q1.id,
                "selected_options": [setup_data["o2"].id, extra.id]
            }
        ]
    }

    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert float(response.data["score"]) == 100
    assert response.data["correct_answers"] == 1


@pytest.mark.django_db
def test_roadmap_hides_correct_answers(setup_data):
    client = APIClient()
    client.force_authenticate(user=setup_data["student"])
    
    url = f"/api/organizations/{setup_data['org'].id}/courses/{setup_data['course'].id}/roadmap/"
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    # Navigate to the quiz options in the nested response
    module_data = response.data["modules"][0]
    node_data = module_data["nodes"][0]
    quiz_data = node_data["quizzes"][0]
    option_data = quiz_data["questions"][0]["options"][0]
    
    # Crucial security check: is_correct should NOT be in the response for students
    assert "is_correct" not in option_data

@pytest.mark.django_db
def test_grade_task_submission(setup_data):
    client = APIClient()
    # Need admin/teacher to grade
    admin = User.objects.create_superuser(email="admin_grade@test.com", password="password123")
    client.force_authenticate(user=admin)
    
    submission = TaskSubmission.objects.create(
        task=setup_data["task"],
        student=setup_data["student"],
        payload={"answer": "To be graded"}
    )
    
    url = f"/api/submissions/{submission.id}/grade/"
    data = {
        "awarded_score": 85,
        "feedback": "Good job!"
    }
    
    response = client.patch(url, data, format='json')
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "Graded"
    assert response.data["awarded_score"] == 85
    assert response.data["feedback"] == "Good job!"
    assert response.data["graded_at"] is not None

@pytest.mark.django_db
def test_learner_progress_tracking(setup_data):
    from organizations.models import Batch, BatchStudent
    client = APIClient()
    org = setup_data["org"]
    course = setup_data["course"]
    student = setup_data["student"]
    
    # 1. Enroll student in a batch for the course
    batch = Batch.objects.create(
        organization=org, 
        name="Test Batch", 
        start_date="2026-01-01", 
        end_date="2026-12-31"
    )
    batch.courses.add(course)
    BatchStudent.objects.create(batch=batch, student=student, course=course)
    
    # 2. Activity: Complete a node and submit a task
    node = setup_data["node"]
    StudentNodeProgress.objects.create(student=student, node=node, status='Completed')
    TaskSubmission.objects.create(task=node.task, student=student, payload={"q": "a"})
    
    # Authenticate as teacher/admin
    teacher = User.objects.create_superuser(email="teacher_dashboard@test.com", password="password123")
    from organizations.models import OrganizationMember
    from rbac.models import Role
    admin_role, _ = Role.objects.get_or_create(name='org_admin')
    OrganizationMember.objects.create(organization=org, user=teacher, role=admin_role)
    client.force_authenticate(user=teacher)
    
    url = f"/api/organizations/{org.id}/learner-progress/"
    response = client.get(url, {"teacher_id": teacher.id})
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) >= 1
    
    progress = response.data[0]
    assert progress["learner_name"] in [student.get_full_name(), student.email]
    assert progress["course_title"] == course.title
    # node is 1 of 1 in our setup data
    assert progress["completion_percentage"] == 100
    assert progress["modules_progress"] == "1/1"
    assert progress["last_activity"] is not None
    assert progress["pending_tasks_count"] == 1
