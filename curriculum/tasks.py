# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from celery import shared_task
from django.utils import timezone
import logging

from .models import AssignmentSubmission, Assessment, StudentNodeProgress, NEEDS_MANUAL_REVIEW

logger = logging.getLogger(__name__)


def _evaluate_standard_assignments(submission, assessment, expected_schema):
    """Helper to evaluate MCQ and Short Answer assignments to reduce complexity."""
    student_payload = submission.payload or {}
    score = 0
    passed = False

    if assessment.assignment_type == 'MCQ':
        correct_id = expected_schema.get('correct_option_id')
        points = expected_schema.get('points', 0)
        selected_id = student_payload.get('selected_option_id')

        if str(selected_id) == str(correct_id):
            score = points
            passed = True

    elif assessment.assignment_type == 'Short Answer':
        keywords = expected_schema.get('required_keywords', [])
        points = expected_schema.get('points', 0)
        text = student_payload.get('answer_text', '').lower()

        if all(k.lower() in text for k in keywords):
            score = points
            passed = True

    # Process the score
    submission.awarded_score = score
    submission.status = 'Graded'
    submission.graded_at = timezone.now()
    submission.save()

    
    if passed or (assessment.passing_score_percentage is not None and score >= assessment.passing_score_percentage):
        progress, _ = StudentNodeProgress.objects.get_or_create(
            student=submission.student,
            node=assessment.node
        )
        progress.status = 'Completed'
        progress.save()


@shared_task
def auto_evaluate_submission(submission_id):
    """
    Background worker task to automatically evaluate a student's AssignmentSubmission.
    """
    try:
        submission = AssignmentSubmission.objects.select_related('assessment', 'student', 'assessment__node').get(id=submission_id)
    except AssignmentSubmission.DoesNotExist:
        logger.error(f"Submission {submission_id} not found.")
        return

    # Ensure it hasn't been evaluated already
    if submission.status != 'Pending':
        return

    assessment = submission.assessment
    expected_schema = assessment.expected_answer_schema or {}

    # Handle auto-evaluable types
    if assessment.assignment_type in ['MCQ', 'Short Answer']:
        _evaluate_standard_assignments(submission, assessment, expected_schema)

    # Routing for types requiring manual review
    elif assessment.assignment_type == 'FileUpload':
        submission.status = NEEDS_MANUAL_REVIEW
        submission.save()

    return f"Processed Submission ID: {submission_id} | Status: {submission.status}"
