# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Role, UserRole


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description"]
        read_only_fields = ["id"]


class UserRoleSerializer(serializers.ModelSerializer):
    """
    Write  → accepts user (UUID) and role (pk integer).
    Read   → returns nested User and Role objects for rich display.
    Validation prevents duplicate assignments with a clean DRF error.
    """

    # ── read representations ──────────────────────────────────────────────────
    user_detail = UserSerializer(source="user", read_only=True)
    role_detail = RoleSerializer(source="role", read_only=True)

    # ── write fields ──────────────────────────────────────────────────────────
    user = serializers.PrimaryKeyRelatedField(
        queryset=__import__("accounts.models", fromlist=["User"]).User.objects.all(),
        write_only=True,
    )
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        write_only=True,
    )

    class Meta:
        model = UserRole
        fields = [
            "id",
            "user",
            "role",
            "user_detail",
            "role_detail",
            "assigned_at",
        ]
        read_only_fields = ["id", "assigned_at", "user_detail", "role_detail"]

    def validate(self, attrs):
        user = attrs.get("user")
        role = attrs.get("role")
        if UserRole.objects.filter(user=user, role=role).exists():
            raise serializers.ValidationError(
                f"User '{user.email}' already has the '{role.name}' role assigned."
            )
        return attrs
