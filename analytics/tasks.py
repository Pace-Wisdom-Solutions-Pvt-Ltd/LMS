# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count
from analytics.models import DailyOrgMetrics, DailyBatchMetrics
from organizations.models import Organization, Batch
from accounts.models import User
from curriculum.models import StudentNodeProgress, AssignmentSubmission

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
        # Calculate average assignment score for students enrolled in this batch
        avg_score = AssignmentSubmission.objects.filter(
            student__batch_enrollments__batch=batch,
            student__batch_enrollments__is_active=True,
            student__batch_enrollments__is_deleted=False,
            status='Graded'
        ).aggregate(Avg('awarded_score'))['awarded_score__avg']
        
        # Identify Drop-off node (where most users are "locked" or "In Progress" and haven't finished)
        # We query the Node with the highest count of In_Progress statuses.
        drop_off = StudentNodeProgress.objects.filter(
            student__batch_enrollments__batch=batch,
            status='In_Progress'
        ).values('node_id').annotate(count=Count('node_id')).order_by('-count').first()
        
        # We use node_id if drop_off exists
        top_drop_node_id = drop_off['node_id'] if drop_off else None

        # Students requiring intervention (e.g., avg score below 50%)
        from organizations.models import BatchStudent
        at_risk_students = 0
        batch_students = BatchStudent.objects.filter(batch=batch, is_active=True, is_deleted=False)
        for bs in batch_students:
            s_avg = AssignmentSubmission.objects.filter(
                student=bs.student, 
                status='Graded'
            ).aggregate(Avg('awarded_score'))['awarded_score__avg']
            if s_avg is not None and s_avg < 50:
                at_risk_students += 1

        DailyBatchMetrics.objects.update_or_create(
            batch=batch,
            date=yesterday,
            defaults={
                'avg_assignment_score': round(avg_score, 2) if avg_score else 0.0,
                'top_drop_off_node_id': top_drop_node_id,
                'students_at_risk_count': at_risk_students
            }
        )
