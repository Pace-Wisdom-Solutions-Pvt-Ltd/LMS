# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import models
from organizations.models import Organization, Batch

from lms_core.models import SoftDeleteMixin

class DailyOrgMetrics(SoftDeleteMixin):
    """
    Stores pre-computed daily metrics for an Organization Dashboard.
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="daily_metrics")
    date = models.DateField(db_index=True)
    total_active_users = models.IntegerField(default=0)
    total_inactive_users = models.IntegerField(default=0)
    avg_course_completion_rate = models.FloatField(default=0.0)
    total_certificates_issued = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'date'],
                condition=models.Q(is_deleted=False),
                name='unique_active_daily_org_metrics'
            )
        ]
        ordering = ['-date']

    def __str__(self):
        return f"{self.organization.name} - {self.date}"

class DailyBatchMetrics(SoftDeleteMixin):
    """
    Stores pre-computed daily metrics for a Teacher's Batch Dashboard.
    """
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="daily_metrics")
    date = models.DateField(db_index=True)
    avg_assignment_score = models.FloatField(default=0.0)
    top_drop_off_node_id = models.IntegerField(null=True, blank=True)
    students_at_risk_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['batch', 'date'],
                condition=models.Q(is_deleted=False),
                name='unique_active_daily_batch_metrics'
            )
        ]
        ordering = ['-date']

    def __str__(self):
        return f"{self.batch.name} - {self.date}"
