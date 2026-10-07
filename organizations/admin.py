# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib import admin
from .models import Organization, OrganizationMember, Batch, BatchStudent

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'contact_email', 'created_at') 
    search_fields = ('name',)

@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'organization__name', 'uuid']
    list_display = ('user', 'organization', 'role', 'uuid', 'is_active')
    list_filter = ('organization', 'role', 'is_active')
    readonly_fields = ('uuid',)

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'start_date', 'end_date', 'is_active')
    list_filter = ('organization', 'is_active')
    search_fields = ('name',)

@admin.register(BatchStudent)
class BatchStudentAdmin(admin.ModelAdmin):
    list_display = ('student', 'batch', 'student_id_number', 'course', 'is_active')
    list_filter = ('batch__organization', 'batch', 'course', 'is_active')
    search_fields = ('student__user__email', 'student_id_number')