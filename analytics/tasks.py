# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum
from analytics.models import DailyOrgMetrics, DailyBatchMetrics
from organizations.models import Organization, Batch
from accounts.models import User
from curriculum.models import StudentNodeProgress, AssignmentSubmission, TaskSubmission, QuizSubmission

AT_RISK_SCORE_THRESHOLD = 50


def _student_score_totals(batch):
    """
    Return {student_uuid: [score_sum, score_count]} for students actively enrolled
    in the batch, combining graded assignments, scored tasks and quiz attempts.
    All three are scored out of 100. Uses one grouped query per submission type.
    """
    enrolled = {
        'student__batch_enrollments__batch': batch,
        'student__batch_enrollments__is_active': True,
        'student__batch_enrollments__is_deleted': False,
    }
    sources = (
        (AssignmentSubmission.objects.filter(status='Graded', awarded_score__isnull=False, **enrolled), 'awarded_score'),
        (TaskSubmission.objects.filter(status__in=['Approved', 'Graded'], awarded_score__isnull=False, **enrolled), 'awarded_score'),
        (QuizSubmission.objects.filter(score__isnull=False, **enrolled), 'score'),
    )
    totals = {}
    for queryset, field in sources:
        rows = queryset.values('student').annotate(score_sum=Sum(field), score_count=Count('id'))
        for row in rows:
            entry = totals.setdefault(row['student'], [0.0, 0])
            entry[0] += float(row['score_sum'])
            entry[1] += row['score_count']
    return totals

@shared_task
def calculate_daily_analytics():
    """
    Cron job task to run every night at midnight.
    Calculates metrics for all organizations and active batches.
    """
    yesterday = timezone.now().date() - timedelta(days=1)
    
    # 1. ORG LEVEL METRICS
    orgs = Organization.objects.filter(is_active=True)
    for org in orgs:
        # Calculate active vs inactive users
        members = org.members.all()
        total_active = members.filter(user__is_active=True).count()  # Fixed filter to use User's is_active
        total_inactive = members.filter(user__is_active=False).count()

        # Total certificates issued (certificates feature removed in open-source edition)
        total_certs = 0
        
        # Calculate Average Course Completion Rate
        # Example metric calculation strategy:
        total_completed = StudentNodeProgress.objects.filter(
            student__organization=org,
            status='Completed'
        ).count()
        total_nodes = StudentNodeProgress.objects.filter(
            student__organization=org
        ).count()
        
        avg_completion_rate = (total_completed / total_nodes * 100) if total_nodes > 0 else 0.0

        DailyOrgMetrics.objects.update_or_create(
            organization=org,
            date=yesterday,
            defaults={
                'total_active_users': total_active,
                'total_inactive_users': total_inactive,
                'avg_course_completion_rate': round(avg_completion_rate, 2),
                'total_certificates_issued': total_certs
            }
        )

    # 2. BATCH LEVEL METRICS
    batches = Batch.objects.filter(is_active=True)
    for batch in batches:
        # Average score across assignments, tasks and quizzes for students in this batch
        score_totals = _student_score_totals(batch)
        total_sum = sum(entry[0] for entry in score_totals.values())
        total_count = sum(entry[1] for entry in score_totals.values())
        avg_score = (total_sum / total_count) if total_count else None
        
        # Identify Drop-off node (where most users are "locked" or "In Progress" and haven't finished)
        # We query the Node with the highest count of In_Progress statuses.
        drop_off = StudentNodeProgress.objects.filter(
            student__batch_enrollments__batch=batch,
            status='In_Progress'
        ).values('node_id').annotate(count=Count('node_id')).order_by('-count').first()
        
        # We use node_id if drop_off exists
        top_drop_node_id = drop_off['node_id'] if drop_off else None

        # Students requiring intervention (average score below the threshold)
        at_risk_students = sum(
            1 for score_sum, score_count in score_totals.values()
            if score_sum / score_count < AT_RISK_SCORE_THRESHOLD
        )

        DailyBatchMetrics.objects.update_or_create(
            batch=batch,
            date=yesterday,
            defaults={
                'avg_assignment_score': round(avg_score, 2) if avg_score else 0.0,
                'top_drop_off_node_id': top_drop_node_id,
                'students_at_risk_count': at_risk_students
            }
        )
