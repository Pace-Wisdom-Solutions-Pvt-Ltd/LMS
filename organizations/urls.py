# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganizationViewSet,
    OrganizationMemberViewSet,
    StaffViewSet,
    BatchViewSet,
    BatchViewSet,
    BatchStudentViewSet,
    OrganizationStudentViewSet,
    TeacherDashboardAPIView,
    OrgAdminBatchesOverviewAPIView,
)

router = DefaultRouter()
router.register(r"", OrganizationViewSet, basename="organization")

urlpatterns = [
    # Members
    path(
        "<int:org_pk>/members/",
        OrganizationMemberViewSet.as_view({"get": "list", "post": "create"}),
        name="organization-members-list",
    ),
    path(
        "<int:org_pk>/members/<int:pk>/",
        OrganizationMemberViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="organization-members-detail",
    ),
    # Staff Management
    path(
        "<int:org_pk>/staff/",
        StaffViewSet.as_view({"get": "list", "post": "create"}),
        name="organization-staff-list",
    ),
    path(
        "<int:org_pk>/staff/bulk-upload-file/",
        StaffViewSet.as_view({"post": "bulk_upload_file"}),
        name="organization-staff-bulk-upload",
    ),
    path(
        "<int:org_pk>/staff/<int:pk>/",
        StaffViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="organization-staff-detail",
    ),
    # Batches
    path(
        "<int:org_pk>/batches/",
        BatchViewSet.as_view({"get": "list", "post": "create"}),
        name="organization-batches-list",
    ),
    path(
        "<int:org_pk>/batches/<int:pk>/",
        BatchViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="organization-batches-detail",
    ),
    # Batch Students
    path(
        "<int:org_pk>/batches/<int:batch_pk>/students/",
        BatchStudentViewSet.as_view({"get": "list", "post": "create"}),
        name="organization-batch-students-list",
    ),
    path(
        "<int:org_pk>/batches/<int:batch_pk>/students/bulk-upload-file/",
        BatchStudentViewSet.as_view({"post": "bulk_upload_file"}),
        name="organization-batch-students-bulk-upload",
    ),
    path(
        "<int:org_pk>/batches/<int:batch_pk>/students/download-template/",
        BatchStudentViewSet.as_view({"get": "download_template"}),
        name="organization-batch-students-download-template",
    ),
    path(
        "<int:org_pk>/students/bulk-upload-file/",
        OrganizationStudentViewSet.as_view({"post": "bulk_upload_file"}),
        name="organization-students-bulk-upload",
    ),
    path(
        "<int:org_pk>/students/download-template/",
        OrganizationStudentViewSet.as_view({"get": "download_template"}),
        name="organization-students-download-template",
    ),
    path(
        "<int:org_pk>/students/",
        OrganizationStudentViewSet.as_view({
            "get": "list",
            "post": "create",
        }),
        name="organization-students-list",
    ),
    path(
        "<int:org_pk>/students/<str:pk>/",
        OrganizationStudentViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "delete": "destroy",
        }),
        name="organization-students-detail",
    ),
    path(
        "<int:org_pk>/batches/<int:batch_pk>/students/<str:pk>/",
        BatchStudentViewSet.as_view({
            "get": "retrieve",
            "put": "update",
            "patch": "partial_update",
            "delete": "destroy"
        }),
        name="organization-batch-students-detail",
    ),
    path(
        "<int:org_pk>/teacher-dashboard/<uuid:teacher_id>/",
        TeacherDashboardAPIView.as_view(),
        name="teacher-dashboard"
    ),
    path(
        "<int:org_pk>/batches-overview/",
        OrgAdminBatchesOverviewAPIView.as_view(),
        name="org-admin-batches-overview"
    ),
    path("", include(router.urls)),
]
