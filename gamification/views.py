# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from accounts.models import User
from curriculum.models import Course
from organizations.models import Organization, OrganizationMember
from .models import Certificate, CertificateTemplate
from .serializers import CertificateSerializer, CertificateTemplateSerializer
from django.http import HttpResponse
from .utils import (
    get_or_create_course_certificate,
    is_course_completed_for_student,
    generate_certificate_pdf,
    render_certificate_html,
)


@extend_schema(tags=['Certificates'])
class UserCertificatesAPIView(APIView):
    """
    User-level certificate endpoint: Returns certificates earned by a user by UUID.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="User Certificates by UUID",
        description="Retrieve all certificates earned by a user across organizations or filtered by organization.",
        parameters=[
            OpenApiParameter(
                name='org_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Optional organization ID filter'
            ),
            OpenApiParameter(
                name='type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by type ('Course' or 'Assessment')"
            ),
        ],
        responses={200: CertificateSerializer(many=True)}
    )
    def get(self, request, user_id=None):
        # Resolve target user
        if user_id is None or str(user_id).lower() == 'me':
            target_user = request.user
        else:
            if str(request.user.id) != str(user_id) and not request.user.is_staff and not request.user.is_superuser:
                return Response(
                    {"detail": "You do not have permission to view this user's certificates."},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_user = get_object_or_404(User, id=user_id, is_deleted=False)

        org_id = request.query_params.get('org_id')
        cert_type = request.query_params.get('type')

        # Check and auto-issue certificates for completed enrolled courses
        self._sync_completed_courses(target_user, org_id)

        qs = Certificate.objects.filter(student=target_user, is_deleted=False)
        if org_id:
            qs = qs.filter(organization_id=org_id)
        if cert_type:
            qs = qs.filter(certificate_type__iexact=cert_type)

        qs = qs.select_related('course', 'organization', 'template', 'student').order_by('-issued_at')
        serializer = CertificateSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def _sync_completed_courses(self, user, org_id=None):
        """Attempts to issue certificates for any courses the user completed that don't have one yet."""
        courses_qs = Course.objects.filter(is_deleted=False, status='Published')
        if org_id:
            courses_qs = courses_qs.filter(organization_id=org_id)

        # Only evaluate courses the user is enrolled in
        enrolled_course_ids = OrganizationMember.objects.filter(
            user=user,
            is_active=True,
            is_deleted=False
        ).values_list('batches__courses__id', flat=True)

        for course in courses_qs.filter(id__in=set(filter(None, enrolled_course_ids))):
            get_or_create_course_certificate(user, course)


@extend_schema(tags=['Certificates'])
class OrganizationCertificatesAPIView(APIView):
    """
    Organization-scoped certificates list for the logged-in student.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Organization Certificates",
        description="Returns all certificates earned by the current user within the specified organization.",
        parameters=[
            OpenApiParameter(
                name='type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by type ('Course' or 'Assessment')"
            ),
        ],
        responses={200: CertificateSerializer(many=True)}
    )
    def get(self, request, org_id):
        # Auto-sync any completed courses in this organization
        courses = Course.objects.filter(organization_id=org_id, is_deleted=False, status='Published')
        for course in courses:
            get_or_create_course_certificate(request.user, course)

        cert_type = request.query_params.get('type')
        qs = Certificate.objects.filter(
            student=request.user,
            organization_id=org_id,
            is_deleted=False
        )
        if cert_type:
            qs = qs.filter(certificate_type__iexact=cert_type)

        qs = qs.select_related('course', 'organization', 'template', 'student').order_by('-issued_at')
        serializer = CertificateSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


@extend_schema(tags=['Certificates'])
class CourseCertificateClaimAPIView(APIView):
    """
    Claim or view certificate for a specific course.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Claim / Check Course Certificate",
        description="Checks eligibility and retrieves/issues the certificate for a completed course.",
        responses={200: CertificateSerializer}
    )
    def get(self, request, org_id, course_id):
        return self._handle_claim(request, org_id, course_id)

    def post(self, request, org_id, course_id):
        return self._handle_claim(request, org_id, course_id)

    def _handle_claim(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id, is_deleted=False)
        organization = course.organization

        cert, created, reason = get_or_create_course_certificate(request.user, course, organization)
        if not cert:
            return Response(
                {
                    "eligible": False,
                    "detail": reason or "Course is not yet completed. Complete all materials and get tasks approved."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CertificateSerializer(cert, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(tags=['Certificates'])
class CertificateDetailAPIView(APIView):
    """
    Public / verification endpoint for a certificate ID (e.g. CERT-C-1-A8F7F314).
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Verify Certificate",
        description="Verify and retrieve certificate details by verification code.",
        responses={200: CertificateSerializer}
    )
    def get(self, request, certificate_id):
        cert = get_object_or_404(
            Certificate.objects.select_related('course', 'organization', 'template', 'student'),
            certificate_id=certificate_id,
            is_deleted=False
        )
        return Response(CertificateSerializer(cert, context={'request': request}).data)


@extend_schema(tags=['Certificates'])
class CertificateDownloadAPIView(APIView):
    """
    Download endpoint for a certificate within an organization.
    Defaults to streaming the backend-generated PDF, with ?format=json fallback.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Download Certificate PDF (Org Scope)",
        description="Generates and streams A4 landscape PDF certificate.",
    )
    def get(self, request, org_id, certificate_id):
        cert = get_object_or_404(
            Certificate.objects.select_related('course', 'organization', 'template', 'student'),
            id=certificate_id,
            organization_id=org_id,
            is_deleted=False
        )
        if request.GET.get('format') == 'json':
            return Response(CertificateSerializer(cert, context={'request': request}).data)

        pdf_bytes = generate_certificate_pdf(cert, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        filename = f"certificate_{cert.certificate_id}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = len(pdf_bytes)
        return response


@extend_schema(tags=['Certificates'])
class CertificatePdfDownloadAPIView(APIView):
    """
    Direct PDF download endpoint by certificate code (e.g. CERT-C-1-DEEFDA1C) or numeric ID.
    Generates and streams the high-fidelity A4 landscape PDF from the backend HTML template.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Download Certificate PDF",
        description="Generates and downloads the official PDF certificate directly from the backend HTML template.",
    )
    def get(self, request, certificate_id):
        lookup = Q(certificate_id=certificate_id)
        if str(certificate_id).isdigit():
            lookup |= Q(id=int(certificate_id))

        cert = get_object_or_404(
            Certificate.objects.select_related('course', 'organization', 'template', 'student'),
            lookup,
            is_deleted=False
        )

        pdf_bytes = generate_certificate_pdf(cert, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        filename = f"certificate_{cert.certificate_id}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = len(pdf_bytes)
        return response


@extend_schema(tags=['Certificates'])
class CertificateHtmlPreviewAPIView(APIView):
    """
    Raw HTML preview endpoint for a certificate.
    Returns the backend-rendered HTML template with all dynamic parameters.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Preview Certificate HTML",
        description="Returns the raw backend-rendered HTML template for iframe or browser preview.",
    )
    def get(self, request, certificate_id):
        lookup = Q(certificate_id=certificate_id)
        if str(certificate_id).isdigit():
            lookup |= Q(id=int(certificate_id))

        cert = get_object_or_404(
            Certificate.objects.select_related('course', 'organization', 'template', 'student'),
            lookup,
            is_deleted=False
        )

        html_content = render_certificate_html(cert, request=request)
        return HttpResponse(html_content, content_type="text/html; charset=utf-8")


@extend_schema(tags=['Certificates'])
class CertificateTemplateAPIView(APIView):
    """
    Retrieve or manage certificate template for an organization.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Certificate Template",
        responses={200: CertificateTemplateSerializer}
    )
    def get(self, request, org_id=None):
        template = CertificateTemplate.objects.filter(
            Q(organization_id=org_id) | Q(organization__isnull=True),
            is_deleted=False,
            is_default=True
        ).order_by('-organization_id').first()

        if not template:
            # Create a default template if none exists
            template = CertificateTemplate.objects.create(
                name="Default Certificate Template",
                title="Certificate of Completion",
                subtitle="This is proudly presented to",
                completion_text="for successfully completing the prescribed course and fulfilling all curriculum and assessment requirements.",
                signatory_title="Authorized Signatory",
                signatory_name="Director of Academics",
                organization_id=org_id,
                is_default=True
            )

        return Response(CertificateTemplateSerializer(template).data)
