# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib.auth import get_user_model
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from accounts.validators import validate_non_dummy_email

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Read serializer — includes the user's assigned roles as a flat list of
    role name strings so consumers don't have to traverse the bridge table.
    """

    roles = serializers.SerializerMethodField()
    organizations = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "is_active",
            "status",
            "is_superuser",
            "date_joined",
            "roles",
            "organizations",
            "reinvite_count",
            "last_invited_at",
        ]
        read_only_fields = ["id", "date_joined", "is_superuser", "roles", "organizations", "reinvite_count", "last_invited_at"]

    @extend_schema_field(serializers.ChoiceField(choices=User.STATUS_CHOICES))
    def get_status(self, obj):
        return obj.effective_status

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_roles(self, obj):
        roles = set()
        
        if hasattr(obj, 'roles'):
            for user_role in obj.roles.select_related("role").all():
                if user_role.role:
                    roles.add(user_role.role.name)
        if hasattr(obj, 'organization_memberships'):
            memberships = obj.organization_memberships.select_related("role", "organization").prefetch_related("roles").filter(
                is_active=True,
                organization__is_active=True,
            )
            for org_member in memberships:
                if org_member.role:
                    roles.add(org_member.role.name)
                # A member can hold extra roles (e.g. an org_admin who is also a student).
                roles.update(r.name for r in org_member.roles.all())

        return list(roles)

    def _build_org_map(self, memberships):
        org_map = {}
        for m in memberships:
            org_id = m.organization.id
            if org_id not in org_map:
                org_map[org_id] = {
                    "org_id": org_id,
                    "name": m.organization.name,
                    "roles": set()
                }
            for r in m.roles.all():
                org_map[org_id]["roles"].add(r.name)
            if not org_map[org_id]["roles"] and m.role:
                org_map[org_id]["roles"].add(m.role.name)
        return org_map

    def _add_superuser_roles(self, obj, org_map):
        if not getattr(obj, "is_superuser", False):
            return
            
        if not org_map:
            from organizations.models import Organization
            for org in Organization.objects.filter(is_active=True):
                org_map[org.id] = {
                    "org_id": org.id,
                    "name": org.name,
                    "roles": {"superadmin"}
                }
        else:
            for org in org_map.values():
                org["roles"].add("superadmin")

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_organizations(self, obj):
        # Fetch active organization memberships for the user
        if not hasattr(obj, 'organization_memberships'):
            return []

        memberships = obj.organization_memberships.select_related("organization", "role").prefetch_related("roles").filter(
            is_active=True,
            organization__is_active=True,
        )

        org_map = self._build_org_map(memberships)
        self._add_superuser_roles(obj, org_map)

        # Convert roles set to sorted list for each org
        return [
            {
                "org_id": org["org_id"],
                "name": org["name"],
                "role": min(org["roles"]) if org["roles"] else None,
                "roles": sorted(org["roles"]),
            }
            for org in org_map.values()
        ]


class UserInviteSerializer(serializers.ModelSerializer):
    """
    Write serializer for inviting a new user.
    """

    email = serializers.EmailField(validators=[validate_non_dummy_email])
    role_id = serializers.IntegerField(
        write_only=True,
        required=True,
        help_text="The ID of the role to assign to the invited user.",
    )
    organization_id = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True,
        help_text="The ID of the organization to assign the user to (required for non-superadmins).",
    )

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "role_id",
            "organization_id",
        ]

    def validate_email(self, value):
        from accounts.models import User
        if User.objects.filter(email=value, is_deleted=False).exists():
            raise serializers.ValidationError("email already exists")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user:
            raise serializers.ValidationError("Request context is missing.")

        user = request.user
        role_id = attrs.get("role_id")
        org_id = attrs.get("organization_id")

        from rbac.models import Role
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            raise serializers.ValidationError({"role_id": "Invalid role ID."})

        if user.is_superuser:
            # Superadmin can add anyone.
            pass
        else:
            # For org admins, they must provide an organization_id and they must be an org_admin of that org.
            if not org_id:
                raise serializers.ValidationError({"organization_id": "Organization ID is required."})

            from organizations.models import OrganizationMember
            is_org_admin = OrganizationMember.objects.filter(
                user=user,
                organization_id=org_id,
                role__name="org_admin",
                is_active=True
            ).exists()

            if not is_org_admin:
                raise serializers.ValidationError("You do not have permission to invite users to this organization.")

            if role.name not in ["org_admin", "teacher", "student"]:
                raise serializers.ValidationError({"role_id": "You can only invite org_admin, teacher, or student roles."})

        attrs["_resolved_role"] = role
        return attrs

    def create(self, validated_data):
        validated_data.pop("role_id")
        organization_id = validated_data.pop("organization_id", None)
        role = validated_data.pop("_resolved_role")

        user = User(**validated_data)
        user.set_unusable_password()
        # Ensure user is inactive until they accept the invite
        user.is_active = False
        user.status = User.STATUS_PENDING
        user.save()
        
        # Temporarily store to be processed by the view
        user._assigned_role = role
        user._assigned_organization_id = organization_id
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Write serializer for updating an existing user's profile (no password change here).
    """

    status = serializers.ChoiceField(
        choices=User.STATUS_CHOICES,
        required=False,
        help_text="Optional account status. Only administrators may change this field.",
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "is_active",
            "status",
        ]

    def validate_status(self, value):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Unable to determine permissions for status update.")
        if self.instance and request.user == self.instance:
            raise serializers.ValidationError("Only administrators may update account status.")

        try:
            from rbac.permissions import _get_user_roles
        except Exception:
            _get_user_roles = None

        is_admin = request.user.is_superuser
        if not is_admin and _get_user_roles:
            is_admin = "admin" in _get_user_roles(request)

        if not is_admin:
            raise serializers.ValidationError("Only administrators may update account status.")
        return value

    def update(self, instance, validated_data):
        status_value = validated_data.pop("status", None)
        instance = super().update(instance, validated_data)
        if status_value is not None:
            instance.status = status_value
            if status_value in [User.STATUS_PENDING, User.STATUS_REINVITED, User.STATUS_EXPIRED, User.STATUS_INACTIVE]:
                instance.is_active = False
            elif status_value == User.STATUS_ACTIVE:
                instance.is_active = True
            elif status_value == User.STATUS_DELETED:
                instance.is_active = False
                instance.is_deleted = True
            instance.save(update_fields=["status", "is_active", "is_deleted"])
        return instance


class LoginSerializer(serializers.Serializer):
    """
    Accepts an email and password to login.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ForgotPasswordSerializer(serializers.Serializer):
    """
    Accepts an email address to send a password reset link.
    """

    email = serializers.EmailField()


class AcceptInviteSerializer(serializers.Serializer):
    """
    Accepts the signed token from the invite link and sets the user's password.
    """

    token = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ResetPasswordSerializer(serializers.Serializer):
    """
    Accepts the signed token from the password reset link and sets a new passwordss.
    """

    token = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    """
    Accepts current_password, new_password, and confirm_password to change password for authenticated user.
    """

    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "New password and confirm password do not match."}
            )
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password cannot be the same as current password."}
            )
        if len(attrs["new_password"]) < 8:
            raise serializers.ValidationError(
                {"new_password": "New password must be at least 8 characters long."}
            )
        return attrs


