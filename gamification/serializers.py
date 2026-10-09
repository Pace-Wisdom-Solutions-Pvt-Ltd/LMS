# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import serializers
from accounts.models import User
from curriculum.models import Course
from organizations.models import Organization
from .models import Certificate, CertificateTemplate


class CertificateTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateTemplate
        fields = [
            'id',
            'name',
            'title',
            'subtitle',
            'completion_text',
            'signatory_title',
            'signatory_name',
            'is_default',
        ]


class CertificateStudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.email


class CertificateCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'description']


class CertificateOrganizationSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'logo', 'logo_url']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None


class CertificateSerializer(serializers.ModelSerializer):
    student = CertificateStudentSerializer(read_only=True)
    course = CertificateCourseSerializer(read_only=True)
    organization = CertificateOrganizationSerializer(read_only=True)
    template = CertificateTemplateSerializer(read_only=True)
    html_content = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id',
            'certificate_id',
            'certificate_type',
            'issued_at',
            'student',
            'course',
            'organization',
            'template',
            'html_content',
            'download_url',
            'preview_url',
        ]

    def get_html_content(self, obj):
        from .utils import render_certificate_html
        request = self.context.get('request')
        try:
            return render_certificate_html(obj, request=request)
        except Exception:
            return ""

    def get_download_url(self, obj):
        request = self.context.get('request')
        path = f"/api/certificates/{obj.certificate_id}/download/"
        return request.build_absolute_uri(path) if request else path

    def get_preview_url(self, obj):
        request = self.context.get('request')
        path = f"/api/certificates/{obj.certificate_id}/html/"
        return request.build_absolute_uri(path) if request else path
