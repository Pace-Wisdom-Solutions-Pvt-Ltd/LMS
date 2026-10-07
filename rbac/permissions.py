# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework.permissions import BasePermission

# ── helpers ───────────────────────────────────────────────────────────────────


def _get_user_roles(request):
    """
    Return (and cache) the set of role names for the authenticated user on the
    current request object.  Caching on `request._cached_role_names` prevents
    repeated DB hits when multiple permission classes are evaluated for a single
    view (N+1 protection).
    """
    if not hasattr(request, "_cached_role_names"):
        if request.user and request.user.is_authenticated:
            request._cached_role_names = set(
                request.user.roles.select_related("role").values_list(
                    "role__name", flat=True
                )
            )
        else:
            request._cached_role_names = set()
    return request._cached_role_names


# ── permission classes ────────────────────────────────────────────────────────


class IsSuperAdmin(BasePermission):
    """
    Grants access only to users where Django's built-in is_superuser=True.
    This maps directly to the 'superadmin' concept — no Role lookup needed.
    """

    message = "Access restricted to Super-Admins only."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_superuser
        )


class IsAdmin(BasePermission):
    """
    Grants access to users with the 'admin' role in the UserRole table,
    OR to superusers (who implicitly have all privileges).
    """

    message = "Access restricted to Admins only."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return "admin" in _get_user_roles(request)


class IsOrgAdmin(BasePermission):
    """
    Grants access to users with the 'org_admin' role in the UserRole table,
    OR to superusers.
    """

    message = "Access restricted to Organization Admins only."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
            
        # Check global UserRole
        if "org_admin" in _get_user_roles(request):
            return True
            
        # Check OrganizationMember roles
        from organizations.models import OrganizationMember
        return OrganizationMember.objects.filter(
            user=request.user,
            roles__name="org_admin",
            is_active=True
        ).exists()


class IsTeacher(BasePermission):
    """
    Grants access to users with the 'teacher' role in the UserRole table,
    OR to superusers.
    """

    message = "Access restricted to Teachers only."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
            
        # Check global UserRole
        if "teacher" in _get_user_roles(request):
            return True
            
        # Check OrganizationMember roles
        from organizations.models import OrganizationMember
        return OrganizationMember.objects.filter(
            user=request.user,
            roles__name="teacher",
            is_active=True
        ).exists()


class IsStudent(BasePermission):
    """
    Grants access to users with the 'student' role in the UserRole table,
    OR to superusers.
    """

    message = "Access restricted to Students only."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
            
        # Check global UserRole
        if "student" in _get_user_roles(request):
            return True
            
        # Check OrganizationMember roles or active batch enrollments
        from organizations.models import OrganizationMember
        from django.db.models import Q
        return OrganizationMember.objects.filter(
            user=request.user,
            is_active=True
        ).filter(
            Q(roles__name="student") | Q(batch_enrollments__is_active=True, batch_enrollments__is_deleted=False)
        ).exists()


class IsSelf(BasePermission):
    """
    Grants access if the object being accessed is the authenticated user themselves.
    """

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj == request.user)
