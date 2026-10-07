# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import CustomUserManager
from lms_core.utils_storage import organization_directory_path


from lms_core.models import SoftDeleteMixin

class User(AbstractBaseUser, PermissionsMixin, SoftDeleteMixin):
    """
    Core User model. Contains only global identity information.
    Authentication is handled by email instead of username.
    """

    STATUS_PENDING = "pending"
    STATUS_REINVITED = "reinvited"
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_EXPIRED = "expired"
    STATUS_DELETED = "deleted"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_REINVITED, "Reinvited"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_DELETED, "Deleted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=False)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        help_text="Current lifecycle status for the user account.",
    )
    profile_picture = models.ImageField(upload_to=organization_directory_path, blank=True, null=True, max_length=500)
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into this admin site.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active.",
    )
    date_joined = models.DateTimeField(default=timezone.now)

    # Invite / reinvite tracking
    reinvite_count = models.PositiveIntegerField(default=0, help_text="Number of times a reinvite has been sent.")
    last_invited_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the most recent invite/reinvite.")

    # We use email for authentication instead of a username
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def get_short_name(self):
        return self.first_name

    objects = CustomUserManager()

    def __init__(self, *args, **kwargs):
        kwargs.pop("username", None)
        super().__init__(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['email'],
                condition=models.Q(is_deleted=False),
                name='unique_active_email'
            )
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def effective_status(self):
        """
        Normalize status for API consumers when the lifecycle field and
        Django's active flag drift out of sync.
        """
        if self.status == self.STATUS_DELETED:
            return self.STATUS_DELETED
        if self.is_active:
            return self.STATUS_ACTIVE
        if self.status in {self.STATUS_PENDING, self.STATUS_REINVITED}:
            from django.utils import timezone
            reference_time = self.last_invited_at or self.date_joined
            if reference_time and (timezone.now() - reference_time).total_seconds() >= 7 * 86400:
                return self.STATUS_EXPIRED
        if self.status in {self.STATUS_PENDING, self.STATUS_REINVITED, self.STATUS_EXPIRED}:
            return self.status
        return self.STATUS_ACTIVE if self.is_active else self.STATUS_INACTIVE

    def delete(self, using=None, keep_parents=False):
        self.status = self.STATUS_DELETED
        self.is_active = False
        super().delete(using=using, keep_parents=keep_parents)


class InviteToken(models.Model):
    """
    DB-backed invite token record.  Allows old tokens to be revoked before
    issuing a fresh one (re-invite flow).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invite_tokens',
    )
    # The raw signed value produced by TimestampSigner – stored so we can
    # look it up on acceptance and mark it revoked.
    token = models.TextField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="When this token expires (created_at + 7 days).")
    is_revoked = models.BooleanField(default=False)
    is_used = models.BooleanField(default=False)
    attempt_number = models.PositiveIntegerField(default=1, help_text="1 = original invite; 2+ = re-invite.")
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sent_invites',
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='invite_tokens',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = 'revoked' if self.is_revoked else 'active'
        return f"InviteToken #{self.attempt_number} for {self.user.email} [{status}]"
