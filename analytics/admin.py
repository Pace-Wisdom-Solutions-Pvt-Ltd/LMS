# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib import admin
from .models import DailyOrgMetrics, DailyBatchMetrics


@admin.register(DailyOrgMetrics)
class DailyOrgMetricsAdmin(admin.ModelAdmin):
    list_display = ('id', 'organization', 'date', 'total_active_users', 'total_certificates_issued')
    search_fields = ('organization__name',)
    list_filter = ('organization', 'date')


@admin.register(DailyBatchMetrics)
class DailyBatchMetricsAdmin(admin.ModelAdmin):
    list_display = ('id', 'batch', 'date', 'avg_assignment_score', 'students_at_risk_count')
    search_fields = ('batch__name',)
    list_filter = ('batch', 'date')
