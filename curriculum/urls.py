# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import path
from .views import (
    CourseListCreateAPIView,
    CourseDetailAPIView,
    ModuleListCreateAPIView,
    ModuleDetailAPIView,
    NodeCreateAPIView,
    NodeDetailAPIView,
    NodeContentUpdateAPIView,
    RoadmapRetrieveAPIView,
    CompleteNodeAPIView,
    PendingEvaluationsAPIView,
    AssignmentSubmissionAPIView,
    GradeSubmissionAPIView,
    TaskSubmissionAPIView,
    QuizSubmissionAPIView,
    LearnerProgressAPIView,
    ExportAllLearnersProgressAPIView,
    TeacherTaskSubmissionsAPIView,
    StudentEnrolledCourseListAPIView,
    NodeSubmissionDetailAPIView,
    TeacherTaskReviewAPIView,
    StudentTaskResultAPIView,
    StudentPersonalProgressAPIView,
)

urlpatterns = [
    # ── ADMIN & TEACHER ROADMAP MANAGEMENT ─────────────────────────────────────
    path('organizations/<int:org_id>/courses/', CourseListCreateAPIView.as_view(), name='course-list-create'),
    path('organizations/<int:org_id>/courses/<int:course_id>/', CourseDetailAPIView.as_view(), name='course-detail'),
    path('organizations/<int:org_id>/courses/<int:course_id>/modules/', ModuleListCreateAPIView.as_view(), name='module-list-create'),
    path('organizations/<int:org_id>/courses/<int:course_id>/modules/<int:module_id>/', ModuleDetailAPIView.as_view(), name='module-detail'),
    path('organizations/<int:org_id>/courses/<int:course_id>/modules/<int:module_id>/nodes/', NodeCreateAPIView.as_view(), name='node-create'),
    path('organizations/<int:org_id>/courses/<int:course_id>/modules/<int:module_id>/nodes/<int:node_id>/', NodeDetailAPIView.as_view(), name='node-detail'),
    path('organizations/<int:org_id>/nodes/<int:node_id>/content/', NodeContentUpdateAPIView.as_view(), name='node-content-update'),

    # ── STUDENT CONSUMPTION ───────────────────────────────────────────────────
    path('organizations/<int:org_id>/courses/<int:course_id>/roadmap/', RoadmapRetrieveAPIView.as_view(), name='course-roadmap'),
    path('organizations/<int:org_id>/pending-evaluations/', PendingEvaluationsAPIView.as_view(), name='pending-evaluations'),
    path('nodes/<int:node_id>/complete/', CompleteNodeAPIView.as_view(), name='node-complete'),
    path('nodes/<int:node_id>/submit/', AssignmentSubmissionAPIView.as_view(), name='assignment-submission'),
    path('submissions/<int:submission_id>/grade/', GradeSubmissionAPIView.as_view(), name='grade-submission'),
    path('organizations/<int:org_id>/submissions/tasks/<int:submission_id>/review/', TeacherTaskReviewAPIView.as_view(), name='teacher-task-review'),

    # ── TASK & QUIZ SUBMISSIONS ────────────────────────────────────────────────
    path('nodes/<int:node_id>/task/submit/', TaskSubmissionAPIView.as_view(), name='task-submission'),
    path('nodes/<int:node_id>/task/all-submissions/', TeacherTaskSubmissionsAPIView.as_view(), name='teacher-task-submissions'),
    path('nodes/<int:node_id>/task/result/', StudentTaskResultAPIView.as_view(), name='student-task-result'),
    path('quizzes/<int:quiz_id>/submit/', QuizSubmissionAPIView.as_view(), name='quiz-submission'),

    # ── TEACHER DASHBOARD / PROGRESS ───────────────────────────────────────────
    path('organizations/<int:org_id>/learner-progress/export/', ExportAllLearnersProgressAPIView.as_view(), name='export-all-learners-progress'),
    path('organizations/<int:org_id>/learner-progress/', LearnerProgressAPIView.as_view(), name='learner-progress'),
    path('organizations/<int:org_id>/node-submission-details/', NodeSubmissionDetailAPIView.as_view(), name='node-submission-detail'),
    path('organizations/<int:org_id>/my-courses/', StudentEnrolledCourseListAPIView.as_view(), name='student-enrolled-courses'),
    path('organizations/<int:org_id>/my-progress/', StudentPersonalProgressAPIView.as_view(), name='student-personal-progress'),
]
