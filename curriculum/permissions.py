# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import permissions
from organizations.models import OrganizationMember

class IsCourseAdminOrTeacher(permissions.BasePermission):
    """
    Grants access if:
    - User is SuperAdmin.
    - User is OrgAdmin of the course's organization.
    - User is Teacher of the organization AND assigned to the specific course.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.user.is_superuser:
            return True

        org_id = view.kwargs.get("org_id")
        if not org_id:
            return False

        # Check if user is at least a teacher in this organization
        return OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name__in=["org_admin", "teacher"],
            is_active=True,
        ).exists()

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        course = self._resolve_course(obj)
        if course is None:
            return False

        # If the course is archived, only org_admin / superuser can access it
        if course.status == 'Archived':
            return self._is_org_admin(request.user, course)

        if self._is_org_admin(request.user, course):
            return True

        return self._is_teacher_assigned_to_course(request.user, course)

    def _resolve_course(self, obj):
        from .models import Course, Module, Node
        if isinstance(obj, Course):
            return obj
        if isinstance(obj, Module):
            return obj.course
        if isinstance(obj, Node):
            return obj.module.course
        return None

    def _is_org_admin(self, user, course):
        return OrganizationMember.objects.filter(
            user=user,
            organization=course.organization,
            role__name="org_admin",
            is_active=True
        ).exists()

    def _is_teacher_assigned_to_course(self, user, course):
        if hasattr(OrganizationMember, 'batches'):
            membership = OrganizationMember.objects.prefetch_related('batches').filter(
                user=user,
                organization=course.organization,
                role__name="teacher",
                is_active=True
            ).first()
        else:
            membership = OrganizationMember.objects.select_related('batch').filter(
                user=user,
                organization=course.organization,
                role__name="teacher",
                is_active=True
            ).first()

        if not membership:
            return False

        if course.teachers.filter(user_id=user.id).exists():
            return True
        if membership.course_id == course.id:
            return True
            
        if hasattr(membership, 'batches') and membership.batches.exists():
            if membership.batches.filter(courses=course).exists():
                return True
        elif hasattr(membership, 'batch') and membership.batch:
            if membership.batch.courses.filter(id=course.id).exists():
                return True
        return False
