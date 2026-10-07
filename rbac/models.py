# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import uuid
from django.db import models
from accounts.models import User


from lms_core.models import SoftDeleteMixin

class Role(SoftDeleteMixin):
    """
    Defines the available roles in the system.
    Examples: 'Admin', 'Teacher', 'Student'
    """

    ROLE_CHOICES = (
        ("superadmin", "Super-Admin"),
        ("org_admin", "Org Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    )
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=False)
    description = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(is_deleted=False),
                name='unique_active_role_name'
            )
        ]

    def __str__(self):
        return str(getattr(self, "get_name_display", lambda: self.name)())


class UserRole(SoftDeleteMixin):
    """
    The Multi-Role Bridge Table.
    Maps a User to one or more Roles globally.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="user_roles")

    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'role'],
                condition=models.Q(is_deleted=False),
                name='unique_active_user_role'
            )
        ]

    def __str__(self):
        return f"{getattr(self.user, 'email', 'Unknown User')} - {getattr(self.role, 'name', 'Unknown Role')}"
