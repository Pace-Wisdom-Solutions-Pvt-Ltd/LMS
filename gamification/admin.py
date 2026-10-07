# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib import admin
from .models import GamificationProfile

@admin.register(GamificationProfile)
class GamificationProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'organization_member', 'total_points', 'current_level', 'created_at')
    search_fields = ('organization_member__user__email', 'organization_member__user__first_name', 'organization_member__user__last_name')
    list_filter = ('current_level', 'organization_member__organization')
