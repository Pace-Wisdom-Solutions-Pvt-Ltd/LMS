# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib import admin
from .models import GamificationProfile, Certificate, CertificateTemplate


@admin.register(GamificationProfile)
class GamificationProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'organization_member', 'total_points', 'current_level', 'created_at')
    search_fields = ('organization_member__user__email', 'organization_member__user__first_name', 'organization_member__user__last_name')
    list_filter = ('current_level', 'organization_member__organization')


@admin.register(CertificateTemplate)
class CertificateTemplateAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'title', 'signatory_title', 'signatory_name', 'organization', 'is_default')
    search_fields = ('name', 'title', 'signatory_name', 'organization__name')
    list_filter = ('is_default', 'organization')


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('id', 'certificate_id', 'student', 'course', 'organization', 'certificate_type', 'issued_at')
    search_fields = (
        'certificate_id',
        'student__email',
        'student__first_name',
        'student__last_name',
        'course__title',
        'organization__name'
    )
    list_filter = ('certificate_type', 'organization', 'issued_at')
    readonly_fields = ('certificate_id', 'issued_at')
