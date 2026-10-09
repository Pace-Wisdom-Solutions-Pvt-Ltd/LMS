# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import path
from .views import (
    UserCertificatesAPIView,
    OrganizationCertificatesAPIView,
    CourseCertificateClaimAPIView,
    CertificateDetailAPIView,
    CertificateDownloadAPIView,
    CertificatePdfDownloadAPIView,
    CertificateHtmlPreviewAPIView,
    CertificateTemplateAPIView,
)

urlpatterns = [
    # ── User-Level Certificates (by user UUID) ──
    path('users/<uuid:user_id>/certificates/', UserCertificatesAPIView.as_view(), name='user-certificates'),
    path('users/me/certificates/', UserCertificatesAPIView.as_view(), name='current-user-certificates'),

    # ── Org-Level Certificates ──
    path('organizations/<int:org_id>/certificates/', OrganizationCertificatesAPIView.as_view(), name='organization-certificates'),
    path('organizations/<int:org_id>/certificates/<int:certificate_id>/download/', CertificateDownloadAPIView.as_view(), name='organization-certificate-download'),
    path('organizations/<int:org_id>/courses/<int:course_id>/certificate/', CourseCertificateClaimAPIView.as_view(), name='course-certificate-claim'),
    path('organizations/<int:org_id>/courses/<int:course_id>/claim-certificate/', CourseCertificateClaimAPIView.as_view(), name='course-certificate-claim-legacy'),
    path('organizations/<int:org_id>/certificate-template/', CertificateTemplateAPIView.as_view(), name='organization-certificate-template'),

    # ── Verification, HTML Preview & PDF Download ──
    path('certificates/<str:certificate_id>/download/', CertificatePdfDownloadAPIView.as_view(), name='certificate-pdf-download'),
    path('certificates/<str:certificate_id>/html/', CertificateHtmlPreviewAPIView.as_view(), name='certificate-html-preview'),
    path('certificates/<str:certificate_id>/preview/', CertificateHtmlPreviewAPIView.as_view(), name='certificate-html-preview-alias'),
    path('certificates/<str:certificate_id>/', CertificateDetailAPIView.as_view(), name='certificate-detail'),
]
