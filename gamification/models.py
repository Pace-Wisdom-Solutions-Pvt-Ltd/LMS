# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import models
from organizations.models import OrganizationMember
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
