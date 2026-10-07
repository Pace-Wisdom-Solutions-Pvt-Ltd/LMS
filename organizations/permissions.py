# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import permissions
from .models import OrganizationMember, BatchStudent


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsOrgAdminOrTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        org_id = (
            view.kwargs.get("org_pk")
            or view.kwargs.get("org_id")
            or view.kwargs.get("pk")
        )
        if not org_id:
            return False

        return OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name__in=["org_admin", "teacher"],
            is_active=True,
        ).exists()


class IsOrgAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user and request.user.is_superuser:
            return True

        org_id = (
            view.kwargs.get("org_pk")
            or view.kwargs.get("org_id")
            or view.kwargs.get("pk")
        )
        if not org_id:
            return False

        return OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name="org_admin",
            is_active=True,
        ).exists()

class IsOrgAdminOrTeacherOrEnrolledStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        org_id = view.kwargs.get("org_pk") or view.kwargs.get("pk")
        if not org_id:
            return False

        # If user is OrgAdmin or Teacher, let them in
        is_staff = OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name__in=["org_admin", "teacher"],
            is_active=True,
        ).exists()
        
        if is_staff:
            return True

        # Otherwise check if they are enrolled in the requested batch
        batch_id = view.kwargs.get("batch_pk") or view.kwargs.get("pk")
        if not batch_id:
            return False
            

        membership = OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_active=True,
        ).first()
        if not membership:
            return False
        return BatchStudent.objects.filter(
            batch_id=batch_id,
            batch__organization_id=org_id,
            student=membership,
            is_active=True,
        ).exists()
