# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from curriculum.tasks import auto_evaluate_submission
from curriculum.models import Course, Module, Node, Assessment, AssignmentSubmission, StudentNodeProgress, NEEDS_MANUAL_REVIEW
from organizations.models import Organization
from django.contrib.auth import get_user_model
from conftest import TEST_PASSWORD

User = get_user_model()

@pytest.fixture
def task_setup(db):
    org = Organization.objects.create(name="Task Org", slug="task-org")
    course = Course.objects.create(organization=org, title="Task Course")
    module = Module.objects.create(course=course, title="Task Module")
    node = Node.objects.create(module=module, title="Task Node")
    student = User.objects.create_user(email="student_task@test.com", password=TEST_PASSWORD)
    return {
        "node": node,
        "student": student
    }

@pytest.mark.django_db
def test_auto_evaluate_mcq_correct(task_setup):
    assessment = Assessment.objects.create(
        node=task_setup["node"],
        assignment_type="MCQ",
        expected_answer_schema={"correct_option_id": 1, "points": 10},
        passing_score_percentage=50
    )
    submission = AssignmentSubmission.objects.create(
        assessment=assessment,
        student=task_setup["student"],
        payload={"selected_option_id": 1}
    )
    
    auto_evaluate_submission(submission.id)
    submission.refresh_from_db()
    
    assert submission.status == "Graded"
    assert submission.awarded_score == 10
    assert StudentNodeProgress.objects.filter(student=task_setup["student"], node=task_setup["node"], status="Completed").exists()

@pytest.mark.django_db
def test_auto_evaluate_mcq_incorrect(task_setup):
    assessment = Assessment.objects.create(
        node=task_setup["node"],
        assignment_type="MCQ",
        expected_answer_schema={"correct_option_id": 1, "points": 10},
        passing_score_percentage=50
    )
    submission = AssignmentSubmission.objects.create(
        assessment=assessment,
        student=task_setup["student"],
        payload={"selected_option_id": 2}
    )
    
    auto_evaluate_submission(submission.id)
    submission.refresh_from_db()
    
    assert submission.status == "Graded"
    assert submission.awarded_score == 0
    assert not StudentNodeProgress.objects.filter(student=task_setup["student"], node=task_setup["node"], status="Completed").exists()

@pytest.mark.django_db
def test_auto_evaluate_short_answer_correct(task_setup):
    assessment = Assessment.objects.create(
        node=task_setup["node"],
        assignment_type="Short Answer",
        expected_answer_schema={"required_keywords": ["Django", "Python"], "points": 20},
        passing_score_percentage=100
    )
    submission = AssignmentSubmission.objects.create(
        assessment=assessment,
        student=task_setup["student"],
        payload={"answer_text": "I love Django and Python!"}
    )
    
    auto_evaluate_submission(submission.id)
    submission.refresh_from_db()
    
    assert submission.status == "Graded"
    assert submission.awarded_score == 20

@pytest.mark.django_db
def test_auto_evaluate_manual_review_types(task_setup):
    for a_type in ["FileUpload"]:
        # Use a new node for each assessment due to OneToOneField constraint
        new_node = Node.objects.create(module=task_setup["node"].module, title=f"Node {a_type}")
        assessment = Assessment.objects.create(
            node=new_node,
            assignment_type=a_type
        )
        submission = AssignmentSubmission.objects.create(
            assessment=assessment,
            student=task_setup["student"],
            payload={}
        )
        
        auto_evaluate_submission(submission.id)
        submission.refresh_from_db()
        assert submission.status == NEEDS_MANUAL_REVIEW

@pytest.mark.django_db
def test_auto_evaluate_not_found():
    # Should not raise error, just log
    auto_evaluate_submission(99999)

@pytest.mark.django_db
def test_auto_evaluate_already_processed(task_setup):
    assessment = Assessment.objects.create(node=task_setup["node"], assignment_type="MCQ")
    submission = AssignmentSubmission.objects.create(
        assessment=assessment,
        student=task_setup["student"],
        status="Graded",
        payload={}
    )
    result = auto_evaluate_submission(submission.id)
    assert result is None
