# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import path
from .views import AdminDashboardView, TeacherDashboardView, StudentDashboardView


urlpatterns = [
    path(
        'analytics/<int:org_id>/daily-metrics/',
        AdminDashboardView.as_view(),
        name='admin_dashboard',
    ),
    path(
        '<int:org_id>/batches/<int:batch_id>/analytics/',
        TeacherDashboardView.as_view(),
        name='teacher_dashboard',
    ),
    path(
        '<int:org_id>/students/me/dashboard/',
        StudentDashboardView.as_view(),
        name='student_dashboard',
    ),
]
