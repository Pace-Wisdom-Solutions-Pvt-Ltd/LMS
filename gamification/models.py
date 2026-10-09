# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import hashlib
from django.db import models
from django.conf import settings
from organizations.models import Organization, OrganizationMember
from curriculum.models import Course
from lms_core.models import SoftDeleteMixin


class GamificationProfile(SoftDeleteMixin):
    """
    User's points and level progression within an organization.
    """
    organization_member = models.OneToOneField(
        OrganizationMember, 
        on_delete=models.CASCADE, 
        related_name="gamification_profile"
    )
    total_points = models.IntegerField(default=0)
    current_level = models.CharField(max_length=255, default="Beginner")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization_member.user.email} - {self.total_points} pts"


class NodeCompletionReward(models.Model):
    """
    Record of points awarded for completing a node. The unique constraint
    guarantees a member is rewarded at most once per node.
    """
    organization_member = models.ForeignKey(
        OrganizationMember,
        on_delete=models.CASCADE,
        related_name="node_completion_rewards"
    )
    node = models.ForeignKey(
        "curriculum.Node",
        on_delete=models.CASCADE,
        related_name="completion_rewards"
    )
    points = models.IntegerField()
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization_member", "node"],
                name="unique_node_completion_reward"
            )
        ]

    def __str__(self):
        return f"{self.organization_member.user.email} - node {self.node_id} - {self.points} pts"


class CertificateTemplate(SoftDeleteMixin):
    """
    Template for issued certificates. Configurable via Django Admin.
    """
    name = models.CharField(max_length=255, default="Standard Completion Template")
    title = models.CharField(max_length=255, default="Certificate of Completion")
    subtitle = models.CharField(max_length=255, default="This is proudly presented to")
    completion_text = models.TextField(
        default="for successfully completing the prescribed course and fulfilling all curriculum and assessment requirements."
    )
    signatory_title = models.CharField(max_length=255, default="Authorized Signatory")
    signatory_name = models.CharField(max_length=255, default="Director of Academics")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="certificate_templates",
        null=True,
        blank=True
    )
    is_default = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        org_name = self.organization.name if self.organization else "Global"
        return f"{self.name} ({org_name})"


class Certificate(SoftDeleteMixin):
    """
    User-level certificate awarded upon course/assessment completion.
    """
    CERT_TYPE_CHOICES = (
        ('Course', 'Course'),
        ('Assessment', 'Assessment'),
    )

    certificate_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Verification code, e.g. CERT-C-1-A8F7F314"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    template = models.ForeignKey(
        CertificateTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_certificates"
    )
    certificate_type = models.CharField(
        max_length=50,
        choices=CERT_TYPE_CHOICES,
        default='Course'
    )
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'course'],
                condition=models.Q(is_deleted=False),
                name='unique_active_gamification_cert_student_course'
            ),
            models.UniqueConstraint(
                fields=['certificate_id'],
                condition=models.Q(is_deleted=False),
                name='unique_active_gamification_cert_code'
            )
        ]
        ordering = ['-issued_at']

    def __str__(self):
        return f"{self.certificate_id} - {self.student.email} - {self.course.title}"

    @classmethod
    def generate_certificate_code(cls, course_id, student_id):
        raw = f"{course_id}-{student_id}"
        token = hashlib.sha256(raw.encode()).hexdigest()[:8].upper()
        return f"CERT-C-{course_id}-{token}"
