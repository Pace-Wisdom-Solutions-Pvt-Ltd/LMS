# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    inline_serializer,
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers as drf_serializers

from .models import Role, UserRole
from .serializers import RoleSerializer, UserRoleSerializer
from .permissions import IsSuperAdmin, IsAdmin, IsOrgAdmin
from rest_framework.decorators import action


# ── Role ViewSet ──────────────────────────────────────────────────────────────


@extend_schema_view(
    list=extend_schema(
        tags=["Roles"],
        summary="List roles",
        description="Returns all available roles. Restricted to **Super-Admins** and **Org-Admins**. (Org-Admins will not see the superadmin role in the results).",
    ),
    create=extend_schema(
        tags=["Roles"],
        summary="Create role",
        description="Create a new role. Restricted to **Super-Admins**.",
    ),
    retrieve=extend_schema(
        tags=["Roles"],
        summary="Retrieve role",
        description="Get a single role by ID. Restricted to **Super-Admins** and **Org-Admins**.",
    ),
    update=extend_schema(
        tags=["Roles"],
        summary="Update role",
        description="Fully update a role. Restricted to **Super-Admins**.",
    ),
    partial_update=extend_schema(
        tags=["Roles"],
        summary="Partial update role",
        description="Partially update a role. Restricted to **Super-Admins**.",
    ),
    destroy=extend_schema(
        tags=["Roles"],
        summary="Delete role",
        description="Delete a role. Restricted to **Super-Admins**.",
    ),
)
class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by("id")
    serializer_class = RoleSerializer

    # Keep the default DRF auth rule explicit so the behavior is stable even if
    # project-wide defaults change later.
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == "org_roles":
            return [(IsOrgAdmin | IsSuperAdmin)()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated and not user.is_superuser:
            qs = qs.exclude(name='superadmin')
        return qs

    @extend_schema(
        tags=["Roles"],
        summary="List roles for Org Admin",
        description="Returns roles available for Org Admins (excludes superadmin). Restricted to **Authenticated** users with appropriate roles.",
        responses={200: RoleSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="org-roles")
    def org_roles(self, request):
        """
        Custom endpoint for Org Admins to see which roles they can manage.
        Excludes the 'superadmin' role.
        """
        roles = Role.objects.exclude(name="superadmin").order_by("id")
        serializer = self.get_serializer(roles, many=True)
        return Response(serializer.data)

# ── UserRole ViewSet ──────────────────────────────────────────────────────────


@extend_schema_view(
    list=extend_schema(
        tags=["User Role Assignments"],
        summary="List role assignments",
        description=(
            "Returns all user-role assignments.\n\n"
            "**Filters:**\n"
            "- `?user={uuid}` — filter by user UUID\n"
            "- `?role={role_name}` — filter by role name (`superadmin`, `teacher`, `student`)"
        ),
        parameters=[
            OpenApiParameter(
                "user", OpenApiTypes.UUID, description="Filter by user UUID"
            ),
            OpenApiParameter(
                "role", OpenApiTypes.STR, description="Filter by role name"
            ),
        ],
    ),
    create=extend_schema(
        tags=["User Role Assignments"],
        summary="Assign role to user",
        description=(
            "Assigns a role to a user. Requires **Admin** or **Super-Admin** role.\n\n"
            "Submitting a duplicate assignment returns a `400` validation error."
        ),
    ),
    retrieve=extend_schema(
        tags=["User Role Assignments"],
        summary="Retrieve role assignment",
        description="Get a single role assignment by UUID. Requires **Admin** or **Super-Admin** role.",
    ),
    destroy=extend_schema(
        tags=["User Role Assignments"],
        summary="Revoke role from user",
        description="Removes a role assignment from a user. Requires **Admin** or **Super-Admin** role.",
        responses={
            200: inline_serializer(
                name="RevokeRoleResponse",
                fields={"detail": drf_serializers.CharField()},
            )
        },
    ),
)
class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = UserRole.objects.select_related("user", "role").order_by("assigned_at")
    serializer_class = UserRoleSerializer
    permission_classes = [IsAdmin | IsOrgAdmin]
    # PUT/PATCH don't make sense for a bridge table — disable them
    http_method_names = ["get", "post", "delete", "head", "options"]

    ORG_ADMIN_SELF_MOD_ERROR = "Organization Admins cannot modify their own roles."
    ORG_ADMIN_OUT_OF_SCOPE_ERROR = "You can only manage roles for users within your organization."

    def _is_org_admin(self, request):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return False
        from organizations.models import OrganizationMember
        return OrganizationMember.objects.filter(
            user=request.user,
            role__name="org_admin",
            is_active=True
        ).exists()

    def _validate_org_admin_permission(self, request, target_user, role_to_assign=None, role_to_revoke=None, custom_superadmin_msg=None):
        if not self._is_org_admin(request):
            return

        if target_user == request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(self.ORG_ADMIN_SELF_MOD_ERROR)

        # Check superadmin constraints
        if (role_to_assign and role_to_assign.name == "superadmin") or (role_to_revoke and role_to_revoke.name == "superadmin"):
            from rest_framework.exceptions import PermissionDenied
            msg = custom_superadmin_msg or "Organization Admins cannot manage the superadmin role."
            raise PermissionDenied(msg)

        from organizations.models import OrganizationMember
        my_orgs = OrganizationMember.objects.filter(
            user=request.user,
            role__name="org_admin",
            is_active=True
        ).values_list("organization_id", flat=True)

        if not OrganizationMember.objects.filter(user=target_user, organization_id__in=my_orgs).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(self.ORG_ADMIN_OUT_OF_SCOPE_ERROR)

    def get_queryset(self):
        qs = super().get_queryset()
        user_param = self.request.query_params.get("user")
        role_name = self.request.query_params.get("role")
        
        if user_param:
            import uuid
            try:
                uuid.UUID(str(user_param))
                qs = qs.filter(user__id=user_param)
            except (ValueError, TypeError):
                qs = qs.filter(user__email=user_param)
                
        if role_name:
            qs = qs.filter(role__name=role_name)
            
        request = self.request
        if self._is_org_admin(request):
            # Exclude superadmin assignments
            qs = qs.exclude(role__name="superadmin")
            
            # Restrict to users in the same organization(s)
            from organizations.models import OrganizationMember
            my_orgs = OrganizationMember.objects.filter(
                user=request.user,
                role__name="org_admin",
                is_active=True
            ).values_list("organization_id", flat=True)
            
            member_user_ids = OrganizationMember.objects.filter(
                organization_id__in=my_orgs
            ).values_list("user_id", flat=True)
            
            qs = qs.filter(user_id__in=member_user_ids)
            
        return qs

    def perform_create(self, serializer):
        user = serializer.validated_data["user"]
        role = serializer.validated_data["role"]
        
        self._validate_org_admin_permission(
            self.request,
            user,
            role_to_assign=role,
            custom_superadmin_msg="Organization Admins cannot assign the superadmin role."
        )
                
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        self._validate_org_admin_permission(
            request,
            instance.user,
            role_to_revoke=instance.role,
            custom_superadmin_msg="Organization Admins cannot revoke the superadmin role."
        )
                
        user_email = instance.user.email
        role_name = instance.role.name
        self.perform_destroy(instance)
        return Response(
            {"detail": f"Role '{role_name}' revoked from '{user_email}'."},
            status=status.HTTP_200_OK,
        )

    def _resolve_user(self, identifier):
        from accounts.models import User
        import uuid
        user = None
        # Try UUID first
        try:
            uuid.UUID(str(identifier))
            user = User.objects.filter(id=identifier).first()
        except (ValueError, TypeError):
            pass
        # Try email second
        if not user:
            user = User.objects.filter(email=identifier).first()
        return user

    def _resolve_role(self, identifier):
        role = None
        # Try integer ID first
        try:
            role_id = int(identifier)
            role = Role.objects.filter(id=role_id).first()
        except (ValueError, TypeError):
            pass
        # Try name second
        if not role:
            role = Role.objects.filter(name=identifier).first()
        return role

    @staticmethod
    def _get_request_value(request, field_names):
        for field_name in field_names:
            value = request.data.get(field_name) or request.query_params.get(field_name)
            if value:
                return value
        return None

    @staticmethod
    def _required_field_response(field_name):
        return Response(
            {field_name: ["This field is required."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def _get_user_role_for_update(self, user, old_role_id):
        user_roles = UserRole.objects.filter(user=user)
        user_roles_count = user_roles.count()

        if old_role_id:
            old_role = self._resolve_role(old_role_id)
            if not old_role:
                return None, Response(
                    {"detail": f"Old role '{old_role_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            user_role_inst = user_roles.filter(role=old_role).first()
            if not user_role_inst:
                return None, Response(
                    {
                        "detail": (
                            f"No role assignment found for user '{user.email}' "
                            f"with role '{old_role.name}'."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            return user_role_inst, None

        if user_roles_count == 1:
            return user_roles.first(), None
        if user_roles_count > 1:
            return None, Response(
                {
                    "detail": (
                        f"User '{user.email}' has multiple roles assigned. "
                        "Please specify 'old_role' to update."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None, Response(
            {
                "detail": (
                    f"User '{user.email}' has no existing role assignments to update."
                )
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    def _get_user_role_for_delete(self, user, role_id):
        role = self._resolve_role(role_id)
        if not role:
            return None, Response(
                {"detail": f"Role '{role_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_role_inst = UserRole.objects.filter(user=user, role=role).first()
        if not user_role_inst:
            return None, Response(
                {
                    "detail": (
                        f"Role '{role.name}' is not assigned to user '{user.email}'."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return user_role_inst, None

    @extend_schema(
        tags=["User Role Assignments"],
        summary="Update role",
        description=(
            "Updates a user's role assignment.\n\n"
            "Accepts `user` (UUID or email), `new_role` (ID or name) and optional `old_role` (ID or name)."
        ),
        request=inline_serializer(
            name="UpdateUserRoleRequest",
            fields={
                "user": drf_serializers.CharField(help_text="User UUID or email"),
                "new_role": drf_serializers.CharField(help_text="New Role ID or name"),
                "old_role": drf_serializers.CharField(required=False, help_text="Old Role ID or name"),
            },
        ),
        responses={200: UserRoleSerializer()},
    )
    @action(detail=False, methods=["post"], url_path="update-role")
    def update_role(self, request):
        user_id = self._get_request_value(request, ("user",))
        new_role_id = self._get_request_value(request, ("new_role", "role"))
        old_role_id = self._get_request_value(request, ("old_role",))

        if not user_id:
            return self._required_field_response("user")
        if not new_role_id:
            return self._required_field_response("new_role")

        user = self._resolve_user(user_id)
        if not user:
            return Response(
                {"detail": f"User '{user_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_role = self._resolve_role(new_role_id)
        if not new_role:
            return Response(
                {"detail": f"Role '{new_role_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_role_inst, error_response = self._get_user_role_for_update(
            user, old_role_id
        )
        if error_response:
            return error_response

        # Check permissions for Org Admin
        self._validate_org_admin_permission(
            request,
            user,
            role_to_assign=new_role,
            role_to_revoke=user_role_inst.role if user_role_inst else None,
            custom_superadmin_msg="Organization Admins cannot assign or manage the superadmin role."
        )

        # Check duplicate assignment if role is changing
        if user_role_inst.role != new_role:
            if UserRole.objects.filter(user=user, role=new_role).exists():
                return Response(
                    {"detail": f"User '{user.email}' already has the '{new_role.name}' role assigned."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user_role_inst.role = new_role
            user_role_inst.save()

        serializer = self.get_serializer(user_role_inst)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["User Role Assignments"],
        summary="Delete particular role",
        description=(
            "Deletes/revokes a specific role assignment from a user.\n\n"
            "Accepts `user` (UUID or email) and `role` (ID or name)."
        ),
        request=inline_serializer(
            name="DeleteUserRoleRequest",
            fields={
                "user": drf_serializers.CharField(help_text="User UUID or email"),
                "role": drf_serializers.CharField(help_text="Role ID or name"),
            },
        ),
        parameters=[
            OpenApiParameter("user", OpenApiTypes.STR, description="User UUID or email"),
            OpenApiParameter("role", OpenApiTypes.STR, description="Role ID or name"),
        ],
        responses={
            200: inline_serializer(
                name="DeleteUserRoleResponse",
                fields={"detail": drf_serializers.CharField()},
            )
        },
    )
    @action(detail=False, methods=["delete", "post"], url_path="delete-role")
    def delete_role(self, request):
        user_id = self._get_request_value(request, ("user",))
        role_id = self._get_request_value(request, ("role", "role_id"))

        if not user_id:
            return self._required_field_response("user")
        if not role_id:
            return self._required_field_response("role")

        user = self._resolve_user(user_id)
        if not user:
            return Response(
                {"detail": f"User '{user_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_role_inst, error_response = self._get_user_role_for_delete(user, role_id)
        if error_response:
            return error_response

        # Check permissions for Org Admin
        self._validate_org_admin_permission(
            request,
            user,
            role_to_revoke=user_role_inst.role,
            custom_superadmin_msg="Organization Admins cannot manage the superadmin role."
        )

        user_email = user_role_inst.user.email
        role_name = user_role_inst.role.name
        self.perform_destroy(user_role_inst)
        return Response(
            {"detail": f"Role '{role_name}' revoked from '{user_email}'."},
            status=status.HTTP_200_OK,
        )
