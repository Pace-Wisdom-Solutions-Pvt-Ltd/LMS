# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from curriculum.models import Course, Module, Node, Quiz, QuizQuestion, QuizOption, StudentNodeProgress, QuizSubmission
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role
from accounts.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    org = Organization.objects.create(name="Test Org", slug="test-org")
    
    # Create roles
    admin_role, _ = Role.objects.get_or_create(name="org_admin")
    student_role, _ = Role.objects.get_or_create(name="student")
    
    # Create users
    admin_user = User.objects.create_user(email="admin@test.com", password="password123", first_name="Admin", last_name="User")
    student_user = User.objects.create_user(email="student@test.com", password="password123", first_name="Student", last_name="User")
    
    # Org memberships
    OrganizationMember.objects.create(user=admin_user, organization=org, role=admin_role)
    OrganizationMember.objects.create(user=student_user, organization=org, role=student_role)
    
    # Course and Node
    course = Course.objects.create(organization=org, title="Test Course", status="Published")
    module = Module.objects.create(course=course, title="Test Module")
    node = Node.objects.create(module=module, title="Test Node")
    
    # Batch and Enrollment
    batch = Batch.objects.create(
        organization=org,
        name="Test Batch",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
    )
    batch.courses.add(course)
    BatchStudent.objects.create(batch=batch, student=student_user, course=course)
    
    return {
        "org": org,
        "admin": admin_user,
        "student": student_user,
        "course": course,
        "module": module,
        "node": node,
        "batch": batch
    }

@pytest.mark.django_db
def test_dynamic_mcq_creation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data["admin"])
    org_id = setup_data["org"].id
    course_id = setup_data["course"].id
    module_id = setup_data["module"].id
    
    url = reverse('node-create', kwargs={'org_id': org_id, 'course_id': course_id, 'module_id': module_id})
    
    # Test creating a node with only 2 options (Yes/No)
    data = {
        "title": "Yes/No Node",
        "quiz_name": "Yes/No Quiz",
        "quiz_question_text": "Is this working?",
        "quiz_option_a": "Yes",
        "quiz_option_b": "No",
        "quiz_option_c": "",  # Empty
        "quiz_option_d": "",  # Empty
        "quiz_correct_option": "a"
    }
    
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
    node_id = response.data['id']
    node = Node.objects.get(id=node_id)
    quiz = node.quizzes.first()
    assert quiz.questions.first().options.count() == 2

@pytest.mark.django_db
def test_quiz_score_in_roadmap(api_client, setup_data):
    student = setup_data["student"]
    node = setup_data["node"]
    org = setup_data["org"]
    course = setup_data["course"]
    
    # Create a quiz for the node
    quiz = Quiz.objects.create(node=node, name="Test Quiz")
    q1 = QuizQuestion.objects.create(quiz=quiz, question_text="Q1")
    opt1 = QuizOption.objects.create(question=q1, option_text="Correct", is_correct=True)
    QuizOption.objects.create(question=q1, option_text="Wrong", is_correct=False)
    
    api_client.force_authenticate(user=student)
    
    # Submit quiz
    submit_url = reverse('quiz-submission', kwargs={'quiz_id': quiz.id})
    payload = {
        "answers": [
            {"question": q1.id, "selected_option": opt1.id}
        ]
    }
    response = api_client.post(submit_url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert float(response.data['score']) == 100
    
    # Verify node progress is now 'Completed'
    progress = StudentNodeProgress.objects.get(student=student, node=node)
    assert progress.status == 'Completed'
    
    # Check Roadmap API
    roadmap_url = reverse('course-roadmap', kwargs={'org_id': org.id, 'course_id': course.id})
    response = api_client.get(roadmap_url)
    assert response.status_code == status.HTTP_200_OK
    
    # Find the node in the roadmap
    module_data = response.data['modules'][0]
    node_data = module_data['nodes'][0]
    
    assert node_data['progress']['status'] == 'Completed'
    assert float(node_data['progress']['quiz_score']) == 100


@pytest.mark.django_db
def test_roadmap_includes_quiz_timer(api_client, setup_data):
    student = setup_data["student"]
    node = setup_data["node"]
    org = setup_data["org"]
    course = setup_data["course"]

    quiz = Quiz.objects.create(node=node, name="Timed Quiz", timer_minutes=25)
    QuizQuestion.objects.create(quiz=quiz, question_text="Timer Q")

    api_client.force_authenticate(user=student)
    roadmap_url = reverse('course-roadmap', kwargs={'org_id': org.id, 'course_id': course.id})
    response = api_client.get(roadmap_url)
    assert response.status_code == status.HTTP_200_OK

    module_data = response.data['modules'][0]
    node_data = module_data['nodes'][0]
    assert node_data['quizzes'][0]['timer_minutes'] == 25
