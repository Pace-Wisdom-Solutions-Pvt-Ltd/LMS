# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from datetime import date

from django import db
from django.db import models
from rest_framework import views, response, status, permissions
from analytics.models import DailyOrgMetrics, DailyBatchMetrics
from organizations.models import Batch, BatchStudent, Organization, OrganizationMember
from gamification.models import GamificationProfile
from curriculum.models import StudentNodeProgress, Course, Node
from drf_spectacular.utils import extend_schema


class AdminDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="Admin Dashboard Analytics Overview")
    def get(self, request, org_id):
        # Fetch latest metrics assuming chronological order
        metrics = DailyOrgMetrics.objects.filter(organization_id=org_id).first()
        if not metrics:
            return response.Response({"detail": "No metrics available yet."}, status=status.HTTP_404_NOT_FOUND)

        return response.Response({
            "total_active_users": metrics.total_active_users,
            "total_inactive_users": metrics.total_inactive_users,
            "avg_course_completion_rate": metrics.avg_course_completion_rate,
            "total_certificates_issued": metrics.total_certificates_issued,
            "date_calculated": metrics.date,
        })


class TeacherDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="Teacher Dashboard Batch Analytics")
    def get(self, request, org_id, batch_id):
        metrics = DailyBatchMetrics.objects.filter(
            batch_id=batch_id,
            batch__organization_id=org_id,
        ).first()
        if not metrics:
            return response.Response({"detail": "No metrics available yet."}, status=status.HTTP_404_NOT_FOUND)

        return response.Response({
            "avg_assignment_score": metrics.avg_assignment_score,
            "top_drop_off_node_id": metrics.top_drop_off_node_id,
            "students_at_risk_count": metrics.students_at_risk_count,
            "date_calculated": metrics.date,
        })


class StudentDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="Student Gamified Dashboard")
    def get(self, request, org_id):
        user = request.user
        today = date.today()

        membership = OrganizationMember.objects.filter(
            user=user,
            organization_id=org_id,
            is_active=True,
        ).first()

        if not membership:
            return response.Response({
                "cards": {
                    "enrolled_courses": 0,
                    "upcoming_mandatory_due_dates": 0,
                    "overall_completion_percentage": 0,
                    "pending_assessments": 0,
                    "certificates_earned": 0,
                    "learning_hours_this_month": None,
                },
                "upcoming_mandatory_due_dates": [],
                "progress": [],
                "resume_learning_node_id": None,
                "gamification": {
                    "points": 0,
                    "level": "Beginner",
                    "badges": [],
                },
                "certificates": [],
            })

        # 1. Enrolled Courses and per-course progress
        enrollment_qs = BatchStudent.objects.filter(
            student=membership,
            is_active=True,
            is_deleted=False,
            batch__organization_id=org_id,
            batch__is_active=True,
            batch__is_deleted=False,
            batch__start_date__lte=today,
            batch__end_date__gte=today,
        ).select_related("batch")
        enrolled_course_ids = self._get_enrolled_course_ids(user, org_id, enrollment_qs)
        courses = Course.objects.filter(id__in=enrolled_course_ids, organization_id=org_id, status='Published').distinct()

        progress_data = []
        total_nodes_all_courses = 0
        completed_nodes_all_courses = 0

        for course in courses:
            nodes_with_content = Node.objects.filter(module__course=course).filter(
                models.Q(learning_material__isnull=False) | 
                models.Q(task__isnull=False) | 
                models.Q(assessment__isnull=False) | 
                models.Q(quizzes__isnull=False)
            ).distinct()
            
            total_nodes = nodes_with_content.count()
            if total_nodes == 0:
                continue

            completed_nodes = StudentNodeProgress.objects.filter(
                student=membership,
                node__in=nodes_with_content,
                status="Completed",
            ).count()

            perc = round((completed_nodes / total_nodes) * 100) if total_nodes > 0 else 0

            total_nodes_all_courses += total_nodes
            completed_nodes_all_courses += completed_nodes
            progress_data.append({
                "course_id": course.id,
                "course_title": course.title,
                "completion_percentage": perc,
            })

        overall_completion_percentage = (
            round((completed_nodes_all_courses / total_nodes_all_courses) * 100)
            if total_nodes_all_courses
            else 0
        )

        # 2. Last Accessed Node (Resume Learning)
        last_accessed = StudentNodeProgress.objects.filter(
            student=membership,
            node__module__course__organization_id=org_id
        ).order_by("-last_accessed").first()

        # 3. Points and rank
        profile = GamificationProfile.objects.filter(
            organization_member__user=user,
            organization_member__organization_id=org_id
        ).order_by('-total_points').first()

        pts = profile.total_points if profile else 0
        lvl = profile.current_level if profile else "Beginner"

        cards = {
            "enrolled_courses": len(progress_data),
            "upcoming_mandatory_due_dates": 0,
            "overall_completion_percentage": overall_completion_percentage,
            "pending_assessments": 0,
            "certificates_earned": 0,
            "learning_hours_this_month": None,
        }

        return response.Response({
            "cards": cards,
            "upcoming_mandatory_due_dates": [],
            "progress": progress_data,
            "resume_learning_node_id": last_accessed.node.id if last_accessed else None,
            "gamification": {
                "points": pts,
                "level": lvl,
                "badges": [],
            },
            "certificates": [],
        })

    def _get_enrolled_course_ids(self, user, org_id, enrollment_qs):
        direct_course_ids = set(
            enrollment_qs.exclude(course_id__isnull=True).values_list("course_id", flat=True)
        )
        batch_ids = enrollment_qs.values_list("batch_id", flat=True)
        batch_course_ids = set(
            Course.objects.filter(
                organization_id=org_id,
                batches__id__in=batch_ids,
            ).values_list("id", flat=True)
        )
        progress_course_ids = set(
            StudentNodeProgress.objects.filter(
                student=user,
                node__module__course__organization_id=org_id,
            ).values_list("node__module__course_id", flat=True)
        )
        return direct_course_ids | batch_course_ids | progress_course_ids
