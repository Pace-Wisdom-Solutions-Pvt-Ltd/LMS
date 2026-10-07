# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import io
import pandas as pd
from rest_framework import viewsets, permissions, status, filters, mixins
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.db.models import Q
from django.http import Http404
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from accounts.models import User
from accounts.views import _send_invite_link
from rbac.models import Role
from curriculum.models import Course, TaskSubmission, StudentNodeProgress, Node, Task
from curriculum.serializers import TaskSubmissionSerializer
from .models import Organization, OrganizationMember, Batch, BatchStudent
from .serializers import (
    OrganizationSerializer, 
    OrganizationMemberSerializer, 
    OrganizationAnalyticsSerializer,
    StaffSerializer, 
    BatchSerializer, 
    BatchStudentSerializer, 
    OrganizationStudentListSerializer,
    OrganizationStudentCreateSerializer,
    BulkAddStudentSerializer,
    FileBulkUploadSerializer,
    StaffFileBulkUploadSerializer,
    StudentFileBulkUploadSerializer,
)
from .permissions import IsSuperAdmin, IsOrgAdmin, IsOrgAdminOrTeacher, IsOrgAdminOrTeacherOrEnrolledStudent

NEEDS_MANUAL_REVIEW = 'Needs Manual Review'
XLSX_EXTENSION = '.xlsx'
XLS_EXTENSION = '.xls'
CSV_EXTENSION = '.csv'

def _dedupe_batch_student_record(queryset, **filters):
    batch_student_qs = queryset.filter(**filters).order_by('-enrolled_at', '-pk')
    primary = batch_student_qs.first()
    if not primary:
        return None
    batch_student_qs.exclude(pk=primary.pk).delete()
    return primary


def _normalize_header(header):
    import re
    h = header.lower().strip()
    h = re.sub(r'\([^\)]*\)', '', h).strip()
    h = re.sub(r'[\s\-]+', '_', h)
    h = h.strip('_')
    return h


def _normalize_header(header):
    import re
    if header is None:
        return ''
    h = str(header).lower().strip()
    h = re.sub(r'\([^\)]*\)', '', h).strip()
    h = re.sub(r'[\s\-]+', '_', h)
    h = h.strip('_')
    return h


def _clean_phone(val):
    if not val or pd.isna(val):
        return ''
    if isinstance(val, float):
        val = str(int(val)) if val.is_integer() else str(val)
    val = str(val).strip()
    if val.endswith('.0'):
        val = val[:-2]
    if val.startswith('+'):
        val = val[1:]
    return val


def _parse_file_to_df(file_obj):
    file_name = file_obj.name.lower()
    try:
        if file_name.endswith(CSV_EXTENSION):
            content = file_obj.read().decode('utf-8', errors='ignore')
            df = pd.read_csv(io.StringIO(content))
        elif file_name.endswith((XLSX_EXTENSION, XLS_EXTENSION)):
            df = pd.read_excel(file_obj)
        else:
            return None, Response({"error": "Unsupported file format."}, status=400)
    except Exception as e:
        return None, Response({"error": str(e)}, status=400)

    df.columns = [_normalize_header(c) for c in df.columns]
    
    # Drop rows where all columns are either NaN or contain only empty/whitespace strings
    is_row_empty = lambda row: all(pd.isna(val) or str(val).strip() == "" for val in row)
    df = df[~df.apply(is_row_empty, axis=1)]

    if 'email' not in df.columns:
        return None, Response({"error": "Missing mandatory 'email' column"}, status=400)
        
    return df, None
@extend_schema(tags=['Organizations'])
class OrganizationViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Read-only organization endpoint scoped to member access.
    Platform-level CRUD is removed in the open-source edition.
    """
    serializer_class = OrganizationSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        return Organization.objects.filter(
            is_active=True,
            members__user=user, 
            members__is_active=True
        ).distinct()

    @action(detail=True, methods=['get'], url_path='analytics/overview')
    @extend_schema(tags=['Organization Analytics'])
    def analytics_overview(self, request, pk=None):
        org = self.get_object()

        active_memberships = OrganizationMember.objects.filter(organization=org, is_active=True)
        total_users = active_memberships.values('user').distinct().count()

        # Staff: org_admin or teacher
        total_staff = active_memberships.filter(
            roles__name__in=['org_admin', 'teacher']
        ).values('user').distinct().count()

        # Students: role student
        total_students = active_memberships.filter(
            roles__name='student'
        ).values('user').distinct().count()
        
        # Batches
        total_batches = Batch.objects.filter(organization=org).count()
        
        # Courses
        total_courses = org.courses.count()
        
        data = {
            "total_users": total_users,
            "total_staff": total_staff,
            "total_students": total_students,
            "total_batches": total_batches,
            "total_courses": total_courses
        }
        
        serializer = OrganizationAnalyticsSerializer(data)
        return Response(serializer.data)


@extend_schema(tags=['Organization Members'])
@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by member name or email'),
        ]
    )
)
class OrganizationMemberViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationMemberSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsOrgAdminOrTeacher()]
        return [IsOrgAdmin()]

    def perform_create(self, serializer):
        org_id = self.kwargs.get("org_pk")
        org = get_object_or_404(Organization, id=org_id)
        serializer.save(organization=org)

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    def get_queryset(self):
        org_id = self.kwargs.get("org_pk")
        if not org_id:
            return OrganizationMember.objects.none()

        search_query = self.request.query_params.get('search', '').strip()
        qs = OrganizationMember.objects.filter(
            Q(user__is_active=True) | Q(user__status__in=['pending', 'reinvited']),
            organization_id=org_id,
            organization__is_active=True,
            user__is_deleted=False
        ).order_by('-joined_at')
        
        if search_query:
            qs = qs.filter(
                Q(user__first_name__icontains=search_query) |
                Q(user__last_name__icontains=search_query) |
                Q(user__email__icontains=search_query)
            ).distinct()
            
        return qs


@extend_schema(tags=['Organization Staff'])
class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [IsOrgAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['user__first_name', 'user__last_name', 'joined_at']
    ordering = ['-joined_at']

    @extend_schema(
        parameters=[
            OpenApiParameter(name='search', description='Search by staff name or email', required=False, type=str),
            OpenApiParameter(name='role', description='Filter by role name (org_admin or teacher)', required=False, type=str),
            OpenApiParameter(name='batch', description='Filter by batch ID', required=False, type=int)
        ],
        description="List all staff (Admins and Teachers) in the organization. Optional 'role' and 'batch' query params to filter."
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        org_id = self.kwargs.get("org_pk")
        if not org_id:
            return OrganizationMember.objects.none()
        
        queryset = OrganizationMember.objects.filter(
            Q(user__is_active=True) | Q(user__status__in=['pending', 'reinvited']),
            organization_id=org_id,
            roles__name__in=['org_admin', 'teacher'],
            user__is_deleted=False
        ).select_related('user', 'role').prefetch_related('roles', 'batches__courses')

        role_filter = self.request.query_params.get('role')
        if role_filter:
            queryset = queryset.filter(roles__name=role_filter)

        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search_query) |
                Q(user__last_name__icontains=search_query) |
                Q(user__email__icontains=search_query)
            ).distinct()

        batch_filter = self.request.request.query_params.get('batch') if hasattr(self.request, 'request') else self.request.query_params.get('batch')
        if batch_filter:
            if hasattr(OrganizationMember, 'batches'):
                queryset = queryset.filter(batches__id=batch_filter)
            else:
                queryset = queryset.filter(batch_id=batch_filter)
            
        return queryset

    def perform_create(self, serializer):
        # organization injection happens in the serializer via context view kwargs
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    @extend_schema(
        request=StaffFileBulkUploadSerializer,
        responses={201: StaffSerializer(many=True)},
        description="Bulk upload staff (Admins/Teachers) from CSV, XLSX, or XLS files using pandas."
    )
    @action(detail=False, methods=['post'], url_path='bulk-upload-file', parser_classes=[MultiPartParser, FormParser])
    @transaction.atomic
    def bulk_upload_file(self, request, *args, **kwargs):
        org_id = self.kwargs.get("org_pk")
        org = get_object_or_404(Organization, id=org_id)

        serializer = StaffFileBulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file_obj = serializer.validated_data['file']
        default_role_name = serializer.validated_data.get('role_name', 'teacher')
        default_status = serializer.validated_data.get('status', User.STATUS_PENDING)
        
        # Extract dropdown overrides
        selected_batch_id = serializer.validated_data.get('batch_id')
        
        selected_batch = None
        if selected_batch_id:
            selected_batch = get_object_or_404(Batch, id=selected_batch_id, organization=org)

        df, error_response = _parse_file_to_df(file_obj)
        if error_response:
            return error_response

        created_staff_members = []
        for _, row in df.iterrows():
            staff_raw_info = row.to_dict()
            staff_info = {k: (v if pd.notna(v) else '') for k, v in staff_raw_info.items()}
            
            if 'email' not in staff_info or not staff_info['email']:
                continue 

            member = self._process_single_staff(
                staff_info, 
                org, 
                default_role_name,
                batch_override=selected_batch,
                default_status=default_status,
            )
            created_staff_members.append(member)

        result_serializer = StaffSerializer(created_staff_members, many=True)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    def _process_single_staff(self, staff_info, org, default_role_name, batch_override=None, default_status=None):
        if default_status is None:
            default_status = User.STATUS_PENDING
            
        email = staff_info['email']
        first_name = staff_info.get('first_name', 'Staff')
        last_name = staff_info.get('last_name', 'Member')
        
        # Handle phone_number from CSV
        phone_number = _clean_phone(staff_info.get('phone_number', ''))
        
        # Get status from CSV row or use default
        row_status = staff_info.get('status', '')
        status_value = row_status if row_status in dict(User.STATUS_CHOICES) else default_status
        
        role_name = staff_info.get('role', default_role_name)
        if role_name not in ['org_admin', 'teacher']:
            role_name = default_role_name
            
        # Use overrides if provided, else resolve from row
        batch = batch_override or self._resolve_staff_batch(staff_info, org)

        user = self._get_or_update_staff_user(email, first_name, last_name, phone_number, organization=org, status=status_value)
        
        role = Role.objects.get(name=role_name)
        return self._get_or_update_staff_member(org, user, role, batch)

    def _resolve_staff_batch(self, staff_info, org):
        batch_id = staff_info.get('batch_id')
        if batch_id and str(batch_id).isdigit():
            return Batch.objects.filter(id=batch_id, organization=org).first()
        return None

    def _get_or_update_staff_user(self, email, first_name, last_name, phone_number, organization=None, status=None):
        if status is None:
            status = User.STATUS_PENDING
            
        defaults = {
            "first_name": first_name,
            "last_name": last_name,
            "phone_number": phone_number,
            "is_active": False,
            "status": status,
        }

        user, created = User.objects.get_or_create(
            email=email,
            defaults=defaults,
        )
        if created or not user.is_active:
            _send_invite_link(user.email, organization=organization)
        else:
            user.first_name = first_name
            user.last_name = last_name
            if phone_number:
                user.phone_number = phone_number
            user.status = User.STATUS_ACTIVE
            user.save()
        return user

    def _get_or_update_staff_member(self, org, user, role, batch):
        member, _ = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={
                "role": role,
            },
        )
        
        if member.role != role:
            member.role = role
            member.save()
            
        if batch:
            if hasattr(member, 'batches'):
                member.batches.add(batch)
            else:
                member.batch = batch
                member.save()
            
        return member


@extend_schema(tags=['Organization Batches'])
@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by batch name'),
        ]
    )
)
class BatchViewSet(viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def get_permissions(self):
        if self.action in ['retrieve']:
            return [IsOrgAdminOrTeacherOrEnrolledStudent()]
        return [IsOrgAdminOrTeacher()]

    def get_queryset(self):
        org_id = self.kwargs.get("org_pk")
        if not org_id:
            return Batch.objects.none()
            
        search_query = self.request.query_params.get('search', '').strip()
        qs = Batch.objects.filter(
            organization_id=org_id,
            organization__is_active=True
        ).distinct().order_by('-start_date', 'name')

        if search_query:
            qs = qs.filter(name__icontains=search_query)
            
        return qs

    def perform_create(self, serializer):
        org_id = self.kwargs.get("org_pk")
        org = get_object_or_404(Organization, id=org_id)
        serializer.save(organization=org)

    @action(detail=True, methods=['get'], url_path='delete-preview')
    def delete_preview(self, request, *args, **kwargs):
        batch = self.get_object()
        courses_count = batch.courses.count()
        trainers_count = batch.staff_members.filter(roles__name='teacher', is_deleted=False).count()
        students_count = batch.students.filter(is_deleted=False).count()
        
        warning_message = (
            f"Deleting the batch '{batch.name}' will permanently remove it from all courses, "
            f"trainers, and student records. Enrolled students will be dissociated, and their "
            f"progress/assignments for this batch will be soft-deleted."
        )
        
        return Response({
            "courses_count": courses_count,
            "trainers_count": trainers_count,
            "students_count": students_count,
            "warning_message": warning_message
        })


@extend_schema(tags=['Organization Batch Students'])
@extend_schema(tags=['Organization Batches'])
@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by student name, email or student ID'),
        ]
    )
)
class BatchStudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsOrgAdminOrTeacher]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__user__email', 'student__user__first_name', 'student__user__last_name', 'student_id_number']
    ordering_fields = ['student__user__first_name', 'student__user__last_name', 'enrolled_at', 'student_id_number']
    ordering = ['-enrolled_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BulkAddStudentSerializer
        return BatchStudentSerializer

    def get_queryset(self):
        org_id = self.kwargs.get("org_pk")
        if not org_id:
            return BatchStudent.objects.none()

        search_query = self.request.query_params.get('search', '').strip()
        
        batch_id = self.kwargs.get("batch_pk")
        queryset = BatchStudent.objects.filter(
            Q(student__user__is_active=True) | Q(student__user__status__in=['pending', 'reinvited']),
            student__is_active=True,
            batch_id=batch_id,
            batch__organization_id=org_id,
            batch__organization__is_active=True,
            student__is_deleted=False
        ).distinct()
            
        if search_query:
            queryset = queryset.filter(
                Q(student__user__first_name__icontains=search_query) |
                Q(student__user__last_name__icontains=search_query) |
                Q(student__user__email__icontains=search_query) |
                Q(student_id_number__icontains=search_query)
            ).distinct()
            
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        org_id = self.kwargs.get("org_pk")
        batch_id = self.kwargs.get("batch_pk")
        org = get_object_or_404(Organization, id=org_id)
        default_batch = get_object_or_404(Batch, id=batch_id, organization=org)
        
        # Validation: Prevent adding students to batches created more than 2 weeks ago
        two_weeks_ago = timezone.now() - timedelta(weeks=2)
        if default_batch.created_at < two_weeks_ago:
            return Response(
                {"error": "Assignment Date Exceeded"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        students_data = serializer.validated_data.get('students', [])
        
        created_students = []
        for student_info in students_data:
            res = self._process_single_student(student_info, org, default_batch)
            created_students.append(res)
            
        result_serializer = BatchStudentSerializer(created_students, many=True)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Download student bulk upload Excel template for batch assignment",
        description="Download an Excel template containing the standard columns: email, first_name, last_name, phone_number, student_id. This template is used to bulk assign existing students to a batch.",
        responses={200: OpenApiParameter(name='file', type=OpenApiTypes.BINARY, location=OpenApiParameter.QUERY)}
    )
    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request, *args, **kwargs):
        data = {
            'email': ['student1@example.com', 'student2@example.com'],
            'first_name': ['Bhavana', 'Syeda'],
            'last_name': ['S', 'Ameena'],
            'phone_number': ['+919999999999', '+918888888888'],
            'student_id': ['STU001', 'STU002']
        }
        df = pd.DataFrame(data)

        # Write to Excel in memory using openpyxl
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Students')
        
        output.seek(0)
        
        from django.http import HttpResponse
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="student_bulk_upload_template.xlsx"'
        return response

    def _parse_file_to_dataframe(self, file_obj):
        return _parse_file_to_df(file_obj)

    def _validate_rows(self, df, org):
        row_errors = []
        seen_emails_in_file = set()

        for idx, row in df.iterrows():
            row_num = idx + 2  # Excel row is 1-indexed and has header row (row 1)
            student_raw_info = row.to_dict()
            student_info = {k: (v if pd.notna(v) else '') for k, v in student_raw_info.items()}

            email = str(student_info.get('email', '')).strip()
            if not email:
                row_errors.append({
                    "row": row_num,
                    "email": "",
                    "errors": ["Missing mandatory 'email' column or email is empty."]
                })
                continue

            # Gracefully handle file-level duplicates: only validate the first occurrence
            if email in seen_emails_in_file:
                continue
            seen_emails_in_file.add(email)

            errors = []

            # Check if user exists in system
            user = User.objects.filter(email=email, is_deleted=False).first()
            if not user:
                errors.append(f"User with email '{email}' does not exist.")
            else:
                # Check if user is already a member of the organization
                member = OrganizationMember.objects.filter(organization=org, user=user).first()
                if not member:
                    errors.append(f"User with email '{email}' is not a member of this organization.")

            if errors:
                row_errors.append({
                    "row": row_num,
                    "email": email,
                    "errors": errors
                })
        return row_errors

    def _execute_enrollments(self, request, df, org, default_batch):
        created_batch_students = []
        processed_emails = set()

        for _, row in df.iterrows():
            student_raw_info = row.to_dict()
            student_info = {k: (v if pd.notna(v) else '') for k, v in student_raw_info.items()}
            email = str(student_info.get('email', '')).strip()

            if not email or email in processed_emails:
                continue
            processed_emails.add(email)

            user = User.objects.get(email=email, is_deleted=False)
            target_batch = self._resolve_batch(student_info.get('batch_id'), org, default_batch)

            # Ignore / skip if student is already enrolled in this batch
            member = OrganizationMember.objects.filter(organization=org, user=user).first()
            if member and BatchStudent.objects.filter(batch=target_batch, student=member, is_deleted=False).exists():
                continue

            batch_student = self._process_single_student(
                student_info, 
                org, 
                default_batch, 
                course_override=None
            )
            created_batch_students.append(batch_student)
        return created_batch_students

    @extend_schema(
        summary="Bulk upload to assign existing students to a batch",
        request=FileBulkUploadSerializer,
        responses={201: BatchStudentSerializer(many=True)},
        description="Bulk upload an Excel/CSV file to assign existing organization students to this batch. Checks if user exists globally and is a member of this organization. File-level duplicate emails are processed once, and already enrolled batch students are ignored."
    )
    @action(detail=False, methods=['post'], url_path='bulk-upload-file', parser_classes=[MultiPartParser, FormParser])
    @transaction.atomic
    def bulk_upload_file(self, request, *args, **kwargs):
        org_id = self.kwargs.get("org_pk")
        batch_id = self.kwargs.get("batch_pk")
        
        org = get_object_or_404(Organization, id=org_id)
        default_batch = get_object_or_404(Batch, id=batch_id, organization=org)
        
        # Validation: Prevent adding students to batches created more than 2 weeks ago
        two_weeks_ago = timezone.now() - timedelta(weeks=2)
        if default_batch.created_at < two_weeks_ago:
            return Response(
                {"error": "Assignment Date Exceeded"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Validate both the file AND the course_id from the dropdown
        serializer = FileBulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        df, error_response = self._parse_file_to_dataframe(serializer.validated_data['file'])
        if error_response:
            return error_response

        from rest_framework.exceptions import ValidationError
        row_errors = self._validate_rows(df, org)

        # If any validation errors occurred, raise a ValidationError to abort and rollback
        if row_errors:
            raise ValidationError({
                "message": "File has validation errors. No changes were applied.",
                "row_errors": row_errors
            })

        # Pass 2: Save the database changes (no validation errors in any rows)
        created_batch_students = self._execute_enrollments(request, df, org, default_batch)
        result_serializer = BatchStudentSerializer(created_batch_students, many=True)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    # 3. Updated helper to accept course_override
    def _process_single_student(self, student_info, org, default_batch, course_override=None, default_status=None):
        email = student_info['email']
        first_name = student_info.get('first_name', 'Student')
        last_name = student_info.get('last_name', '')
        phone_number = student_info.get('phone_number', '')
        
        # Integrity Fix: Never pass None to student_id_number
        raw_id = student_info.get('student_id', '')
        student_id_number = str(raw_id) if raw_id else ''
        
        # Students now strictly inherit courses from the batch (Requirement 3 & 4)
        # Forced to None to ensure LearnerProgressAPIView looks at batch.courses.all()
        course = None
        target_batch = self._resolve_batch(student_info.get('batch_id'), org, default_batch)
        
        if not target_batch:
             # This should be handled by validation, but adding safety check
             return None
        
        # Check if user is already enrolled in this batch
        if BatchStudent.objects.filter(batch=target_batch, student__user__email=email, is_deleted=False).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"Email '{email}' is already enrolled in this batch.")
        
        # 1. Fetch or create User and Organization Member
        from rbac.models import Role
        student_role, _ = Role.objects.get_or_create(name='student')
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "phone_number": phone_number,
                "is_active": False,
                "status": User.STATUS_PENDING,
            }
        )
        if created or not user.is_active:
            try:
                _send_invite_link(user.email, organization=org)
            except Exception:
                pass
        member, member_created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": student_role}
        )
        if not member_created and not member.roles.filter(id=student_role.id).exists():
            member.roles.add(student_role)
        
        # 2. Update user profile information if provided in the file (patch style)
        self._update_user_profile(user, first_name, last_name, phone_number)
        
        if target_batch and member.role.name == 'student':
            member.batches.add(target_batch)
        
        # 3. Handle Batch Enrollment
        self._cleanup_batch_student_duplicates(target_batch, member)
        batch_student, _ = BatchStudent.objects.update_or_create(
            batch=target_batch,
            student=member,
            defaults={
                "student_id_number": student_id_number,
                "course": course,
            }
        )

        # 4. Send Batch Enrollment confirmation email
        try:
            from lms_core.email_utils import render_branded_email, send_html_email_via_ses, build_frontend_url
            subject = f"Assigned to batch: {target_batch.name}"
            intro = f"You have been successfully assigned to the batch '{target_batch.name}' in the organization '{org.name}'."
            
            html_message = render_branded_email(
                title="Batch Assignment Confirmation",
                intro=intro,
                cta_label="Go to Dashboard",
                cta_url=build_frontend_url("/dashboard"),
                recipient_email=user.email,
                recipient_name=user.get_full_name() or user.email,
                organization=org,
                footer_note="If you have any questions, please contact your training coordinator."
            )
            
            send_html_email_via_ses(
                subject=subject,
                text_body=intro,
                html_body=html_message,
                recipient_list=[user.email],
                organization=org
            )
        except Exception:
            # Prevent email errors from blocking database commits
            pass

        return batch_student

    def _cleanup_batch_student_duplicates(self, batch, member):
        _dedupe_batch_student_record(BatchStudent.objects, batch=batch, student=member)

    def _resolve_course(self, course_id, org):
        if not course_id:
            return None
        
        if isinstance(course_id, Course):
            if course_id.organization_id != org.id:
                from django.http import Http404
                raise Http404("Course does not belong to this organization.")
            return course_id
        
        return get_object_or_404(Course, id=course_id, organization=org)

    def _resolve_batch(self, target_batch_id, org, default_batch):
        if not target_batch_id:
            return default_batch
            
        if isinstance(target_batch_id, Batch):
            if target_batch_id.organization_id != org.id:
                from django.http import Http404
                raise Http404("Batch does not belong to this organization.")
            return target_batch_id
            
        return get_object_or_404(Batch, id=target_batch_id, organization=org)

    def _update_user_profile(self, user, first_name, last_name, phone_number, status=None):
        updated = False
        if first_name != 'Student':
            user.first_name = first_name
            updated = True
        if last_name:
            user.last_name = last_name
            updated = True
        if phone_number:
            user.phone_number = phone_number
            updated = True
        if status:
            user.status = status
            if status in [User.STATUS_PENDING, User.STATUS_REINVITED, User.STATUS_EXPIRED, User.STATUS_INACTIVE]:
                user.is_active = False
            elif status == User.STATUS_ACTIVE:
                user.is_active = True
            elif status == User.STATUS_DELETED:
                user.is_active = False
                user.is_deleted = True
            updated = True
        
        if updated:
            user.save()
            

    def get_object(self):
        # Override to support lookups by User UUID OR custom student_id_number
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]

        # 1. Try lookup by UUID (Org-level UUID OR User UUID)
        try:
            from uuid import UUID
            UUID(str(lookup_value)) # validate format
            # Check by OrganizationMember UUID (student_id field)
            obj = _dedupe_batch_student_record(queryset, student_id=lookup_value)
            if not obj:
                # Fallback check by global User UUID
                obj = _dedupe_batch_student_record(queryset, student__user_id=lookup_value)
            if not obj:
                raise Http404("No student found matching the given UUID.")
        except (ValueError, AttributeError):
            # 2. Fallback to lookup by student_id_number
            obj = _dedupe_batch_student_record(queryset, student_id_number=lookup_value)
            if not obj:
                raise Http404("No student found matching the given identifier.")

        self.check_object_permissions(self.request, obj)
        return obj

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        student_user = instance.student.user if hasattr(instance.student, 'user') else instance.student
        member = OrganizationMember.objects.filter(
            organization=instance.batch.organization,
            user=student_user,
            is_deleted=False
        ).first()
        if member:
            member.batches.remove(instance.batch)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Organization Students'])
@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by student name, email or student ID'),
        ]
    )
)
class OrganizationStudentViewSet(viewsets.ModelViewSet):
    """
    CRUD all students in an organization, regardless of batch assignment.
    Students created by Super Admin appear here immediately upon assignment to organization.
    Optional batch and course assignment can be done separately.
    """
    serializer_class = OrganizationStudentListSerializer
    permission_classes = [IsOrgAdminOrTeacher]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['user__first_name', 'user__last_name', 'joined_at']
    ordering = ['-joined_at']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationStudentCreateSerializer
        return OrganizationStudentListSerializer

    @extend_schema(
        summary="Create / Invite a student directly under an organization",
        description="Creates a user account (if not exists), sends an invitation link, creates organization membership with the role of 'student', and optionally enrolls them in one or multiple batches.",
        request=OrganizationStudentCreateSerializer,
        responses={201: OrganizationStudentListSerializer}
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        org_id = self.kwargs.get("org_pk")
        org = get_object_or_404(Organization, id=org_id)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        first_name = serializer.validated_data['first_name']
        last_name = serializer.validated_data.get('last_name', '')
        phone_number = serializer.validated_data.get('phone_number', '')
        student_id_number = serializer.validated_data.get('student_id', '')
        batch_ids = serializer.validated_data.get('batch_ids', [])
        
        from rbac.models import Role
        student_role = Role.objects.get(name='student')
        
        # 1. Handle User
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "phone_number": phone_number,
                "is_active": False,
                "status": User.STATUS_PENDING,
            }
        )
        
        if created or not user.is_active:
            _send_invite_link(user.email, organization=org)
            user.refresh_from_db()
        else:
            # Update user profile details
            user.first_name = first_name
            if last_name:
                user.last_name = last_name
            if phone_number:
                user.phone_number = phone_number
            user.save()
            
        # 2. Handle Org Membership
        member, member_created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": student_role}
        )
        if not member_created:
            if not member.roles.filter(id=student_role.id).exists():
                member.roles.add(student_role)
        else:
            member.roles.add(student_role)
            
        # 3. Handle Batch Enrollments (optional)
        if batch_ids:
            member.batches.add(*batch_ids)
            
            for batch in batch_ids:
                # Deduplicate existing batch student records to ensure constraint is safe
                _dedupe_batch_student_record(BatchStudent.objects, batch=batch, student=member)
                
                BatchStudent.objects.update_or_create(
                    batch=batch,
                    student=member,
                    defaults={
                        "student_id_number": student_id_number,
                        "course": None, # Inherited from Batch
                    }
                )
        # Return list representation
        response_serializer = OrganizationStudentListSerializer(member, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        org_id = self.kwargs.get("org_pk")
        if not org_id:
            return OrganizationMember.objects.none()

        search_query = self.request.query_params.get('search', '').strip()
        if hasattr(OrganizationMember, 'batches'):
            qs = OrganizationMember.objects.filter(
                Q(user__is_active=True) | Q(user__status__in=['pending', 'reinvited']),
                organization_id=org_id,
                roles__name='student',
                organization__is_active=True,
                user__is_deleted=False
            ).select_related('user', 'course', 'role').prefetch_related(
                'roles',
                'batches__courses',
                'batch_enrollments',
                'batch_enrollments__batch'
            )
        else:
            qs = OrganizationMember.objects.filter(
                Q(user__is_active=True) | Q(user__status__in=['pending', 'reinvited']),
                organization_id=org_id,
                roles__name='student',
                organization__is_active=True,
                user__is_deleted=False
            ).select_related('user', 'batch', 'course', 'role').prefetch_related(
                'roles',
                'batch_enrollments',
                'batch_enrollments__batch'
            )
        
        if search_query:
            qs = qs.filter(
                Q(user__first_name__icontains=search_query) |
                Q(user__last_name__icontains=search_query) |
                Q(user__email__icontains=search_query)
            ).distinct()
            
        return qs

    def get_object(self):
        """
        Lookup by User UUID or student_id_number. Supports both students with batch assignment and without.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        org_id = self.kwargs.get("org_pk")

        try:
            from uuid import UUID
            UUID(str(lookup_value))  # validate UUID format
            obj = queryset.filter(user_id=lookup_value).first()
            if not obj:
                raise Http404("No Student found with the given UUID.")
        except (ValueError, AttributeError):
            # Fallback: try lookup by student_id_number from BatchStudent
            from .models import BatchStudent
            batch_student = BatchStudent.objects.filter(
                batch__organization_id=org_id,
                student_id_number=lookup_value,
                is_deleted=False
            ).first()
            if batch_student:
                obj = queryset.filter(user_id=batch_student.student.user_id).first()
            else:
                obj = None
            if not obj:
                raise Http404("No student found matching the given identifier.")

        self.check_object_permissions(self.request, obj)
        return obj

    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update to also update User.is_active when OrganizationMember.is_active changes.
        """
        org_member = self.get_object()
        serializer = self.get_serializer(org_member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Check if is_active is being set to False
        if 'is_active' in request.data and request.data['is_active'] is False:
            org_member.user.is_active = False
            org_member.user.save()
        elif 'is_active' in request.data and request.data['is_active'] is True:
            org_member.user.is_active = True
            org_member.user.save()
        
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    @extend_schema(
        summary="Download student bulk upload Excel template (no batch assignment)",
        description="Download an Excel template containing the standard columns: email, first_name, last_name, phone_number, student_id. Used to bulk invite/create students directly under the organization.",
        responses={200: OpenApiParameter(name='file', type=OpenApiTypes.BINARY, location=OpenApiParameter.QUERY)}
    )
    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request, *args, **kwargs):
        data = {
            'email': ['student1@example.com', 'student2@example.com'],
            'first_name': ['Bhavana', 'Syeda'],
            'last_name': ['S', 'Ameena'],
            'phone_number': ['+919999999999', '+918888888888'],
            'student_id': ['STU001', 'STU002']
        }
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Students')
        output.seek(0)
        from django.http import HttpResponse
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="student_organization_bulk_upload_template.xlsx"'
        return response

    @extend_schema(
        summary="Bulk upload students directly under the organization",
        request=StudentFileBulkUploadSerializer,
        responses={201: OrganizationStudentListSerializer(many=True)},
        description="Bulk upload an Excel/CSV file to create/invite students directly under the organization without a batch."
    )
    @action(detail=False, methods=['post'], url_path='bulk-upload-file', parser_classes=[MultiPartParser, FormParser])
    @transaction.atomic
    def bulk_upload_file(self, request, *args, **kwargs):
        org_id = self.kwargs.get("org_pk")
        org = get_object_or_404(Organization, id=org_id)

        serializer = StudentFileBulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        df, error_response = _parse_file_to_df(serializer.validated_data['file'])
        if error_response:
            return error_response
            
        self._validate_student_rows(df)

        created_members = self._execute_student_creations(request, df, org)
        
        result_serializer = OrganizationStudentListSerializer(created_members, many=True, context=self.get_serializer_context())
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    def _validate_student_rows(self, df):
        row_errors = []
        for idx, row in df.iterrows():
            row_num = idx + 2
            student_raw_info = row.to_dict()
            student_info = {k: (v if pd.notna(v) else '') for k, v in student_raw_info.items()}
            email = str(student_info.get('email', '')).strip()
            
            if not email:
                row_errors.append({
                    "row": row_num,
                    "email": "",
                    "errors": ["Missing mandatory 'email' column or email is empty."]
                })

        if row_errors:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                "message": "File has validation errors. No changes were applied.",
                "row_errors": row_errors
            })

    def _execute_student_creations(self, request, df, org):
        from rbac.models import Role
        student_role = Role.objects.get(name='student')
        
        created_members = []
        processed_emails = set()
        for _, row in df.iterrows():
            student_raw_info = row.to_dict()
            student_info = {k: (v if pd.notna(v) else '') for k, v in student_raw_info.items()}
            email = str(student_info.get('email', '')).strip()

            if not email or email in processed_emails:
                continue
            processed_emails.add(email)

            first_name = student_info.get('first_name', 'Student')
            last_name = student_info.get('last_name', '')
            phone_number = _clean_phone(student_info.get('phone_number', ''))
            
            user = self._get_or_create_student_user(email, first_name, last_name, phone_number, org)
            member = self._get_or_create_student_member(org, user, student_role)
            created_members.append(member)
        return created_members

    def _get_or_create_student_user(self, email, first_name, last_name, phone_number, org):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "phone_number": phone_number,
                "is_active": False,
                "status": User.STATUS_PENDING,
            }
        )
        if created or not user.is_active:
            _send_invite_link(user.email, organization=org)
        else:
            user.first_name = first_name
            if last_name:
                user.last_name = last_name
            if phone_number:
                user.phone_number = phone_number
            user.save()
        return user

    def _get_or_create_student_member(self, org, user, student_role):
        member, member_created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": student_role}
        )
        if not member_created:
            if not member.roles.filter(id=student_role.id).exists():
                member.roles.add(student_role)
        else:
            member.roles.add(student_role)
        return member


@extend_schema(tags=['Teacher Dashboard'])
class TeacherDashboardAPIView(APIView):
    permission_classes = [IsOrgAdminOrTeacher]

    @extend_schema(
        summary="Retrieve analytics and activity summary for a teacher",
        parameters=[
            OpenApiParameter(name="role", type=str, location=OpenApiParameter.QUERY, description="Override viewed role (org_admin or teacher)"),
        ]
    )
    def get(self, request, org_pk, teacher_id):
        organization = get_object_or_404(Organization, id=org_pk)
        member = get_object_or_404(
            OrganizationMember, 
            organization=organization, 
            user_id=teacher_id,
            role__name__in=['org_admin', 'teacher']
        )
        
        # Determine roles and assignments
        requested_role = request.query_params.get('role')
        actual_role_name = member.role.name

        assigned_courses = self._get_assigned_courses(member, organization)
        assigned_batches = self._get_assigned_batches(member, organization, assigned_courses)

        # Determine if we should show Admin (Global) view or Teacher (Focused) view
        is_admin_mode = (actual_role_name == 'org_admin')
        
        # Explicit role override from frontend toggle
        if requested_role:
            if requested_role == 'teacher':
                is_admin_mode = False
            elif requested_role == 'org_admin' and (actual_role_name == 'org_admin' or request.user.is_superuser):
                is_admin_mode = True

        # If User is an Admin but has NO teaching assignments, default to Org Global view
        # Otherwise, they see their assignments (focused view)
        show_org_global = is_admin_mode and not assigned_courses.exists() and not assigned_batches.exists()

        # Calculate counts
        student_count = self._get_student_count(org_pk, assigned_batches, assigned_courses, show_org_global)
        
        # Evaluations and recent submissions
        pending_evaluations_count, recent_submissions_data = self._get_evaluations_data(request, org_pk, assigned_batches, assigned_courses, show_org_global)

        # Average completion percentage
        avg_completion = self._get_avg_completion(org_pk, assigned_batches, assigned_courses, show_org_global)

        # Counts for summary cards
        if show_org_global:
            final_course_count = Course.objects.filter(organization=organization).count()
            final_batch_count = Batch.objects.filter(organization=organization).count()
        else:
            final_course_count = assigned_courses.distinct().count()
            final_batch_count = assigned_batches.distinct().count()

        return Response({
            "student_count": student_count,
            "batch_count": final_batch_count,
            "course_count": final_course_count,
            "pending_evaluations_count": pending_evaluations_count,
            "average_completion_percentage": avg_completion,
            "recent_submissions": recent_submissions_data,
            "view_mode": "admin" if show_org_global else "teacher"
        })

    def _get_assigned_courses(self, member, organization):
        course_filters = Q(teachers=member) | Q(teachers__user=member.user)
        if member.course_id:
            course_filters |= Q(id=member.course_id)
        if hasattr(member, 'batches') and member.batches.exists():
            course_filters |= Q(batches__in=member.batches.all())
        elif hasattr(member, 'batch_id') and member.batch_id:
            course_filters |= Q(batches__id=member.batch_id)
        return Course.objects.filter(
            course_filters,
            organization=organization,
        ).distinct()

    def _get_assigned_batches(self, member, organization, assigned_courses):
        batch_filters = Q(courses__in=assigned_courses)
        if hasattr(member, 'batches') and member.batches.exists():
            batch_filters |= Q(id__in=member.batches.all())
        elif hasattr(member, 'batch_id') and member.batch_id:
            batch_filters |= Q(id=member.batch_id)
        return Batch.objects.filter(
            batch_filters,
            organization=organization,
        ).distinct().order_by('-start_date', 'name')

    def _get_student_count(self, org_pk, assigned_batches, assigned_courses, show_org_global):
        student_qs = self._get_dashboard_students_queryset(
            org_pk=org_pk,
            assigned_batches=assigned_batches,
            assigned_courses=assigned_courses,
            show_org_global=show_org_global,
        )

        if student_qs is None:
            return 0

        return student_qs.values("student_id").distinct().count()

    def _get_dashboard_students_queryset(self, org_pk, assigned_batches, assigned_courses, show_org_global):
        base_qs = BatchStudent.objects.filter(
            batch__organization_id=org_pk,
            is_active=True,
        )

        if show_org_global:
            return base_qs

        if not assigned_batches.exists() and not assigned_courses.exists():
            return None

        student_query = Q(batch__in=assigned_batches)
        if assigned_courses.exists():
            student_query |= Q(course__in=assigned_courses)
            student_query |= Q(batch__courses__in=assigned_courses)

        return base_qs.filter(student_query)

    def _get_evaluations_data(self, request, org_pk, assigned_batches, assigned_courses, show_org_global):
        if show_org_global:
            submission_query = Q(task__node__module__course__organization_id=org_pk)
        else:
            # Aggregate across all assigned courses
            course_ids = set(assigned_courses.values_list('id', flat=True))
            # Also include for courses linked to assigned batches
            batch_course_ids = set(Course.objects.filter(batches__in=assigned_batches).values_list('id', flat=True))
            all_course_ids = course_ids | batch_course_ids
            
            if not all_course_ids:
                return 0, []
            submission_query = Q(task__node__module__course_id__in=all_course_ids)
            
        pending_count = TaskSubmission.objects.filter(submission_query, status='Pending').count()
        recent_submissions = TaskSubmission.objects.filter(submission_query).order_by('-submitted_at')[:5]
        
        return pending_count, TaskSubmissionSerializer(recent_submissions, many=True, context={'request': request}).data

    def _get_avg_completion(self, org_pk, assigned_batches, assigned_courses, show_org_global):
        student_qs = self._get_dashboard_students_queryset(
            org_pk=org_pk,
            assigned_batches=assigned_batches,
            assigned_courses=assigned_courses,
            show_org_global=show_org_global,
        )

        if show_org_global:
            course_qs = Course.objects.filter(organization_id=org_pk)
        else:
            course_ids = set(assigned_courses.values_list('id', flat=True))
            batch_course_ids = set(Course.objects.filter(batches__in=assigned_batches).values_list('id', flat=True))
            all_course_ids = course_ids | batch_course_ids
            course_qs = Course.objects.filter(id__in=all_course_ids)

        if student_qs is None:
            return 0

        student_uuids = list(student_qs.values_list('student__uuid', flat=True).distinct())
        user_ids = list(student_qs.values_list('student__user_id', flat=True).distinct())
        if not student_uuids or not course_qs.exists():
            return 0
            
        # Total nodes across all targeted courses
        total_nodes = Node.objects.filter(module__course__in=course_qs).count()
        if total_nodes == 0:
            return 0
            
        # Total successful completions for these students in these courses
        completed_count = StudentNodeProgress.objects.filter(
            Q(student__uuid__in=student_uuids) | Q(student__user_id__in=user_ids),
            node__module__course__in=course_qs,
            status='Completed'
        ).count()
        
        # Average completion percentage: 
        # (Total completed units) / (Total possible units across all selected students)
        avg_pct = (completed_count / (total_nodes * len(student_uuids))) * 100
        return int(avg_pct)




class OrgAdminBatchesOverviewAPIView(APIView):
    permission_classes = [IsOrgAdmin]

    @extend_schema(
        tags=['Organization Batches'],
        summary="Org Admin: Batches, Courses and Student Progress Overview",
        parameters=[
            OpenApiParameter(name='batch_id', type=int, location=OpenApiParameter.QUERY, description='Batch ID to filter courses'),
            OpenApiParameter(name='course_id', type=int, location=OpenApiParameter.QUERY, description='Course ID to filter students and teachers'),
            OpenApiParameter(name='student_id', type=str, location=OpenApiParameter.QUERY, description='Student UUID to view detailed progress like Student Progress'),
        ]
    )
    def get(self, request, org_pk):
        batch_id = request.query_params.get('batch_id')
        course_id = request.query_params.get('course_id')
        student_id = request.query_params.get('student_id')
        two_days_ago = timezone.now() - timedelta(days=2)

        # Scenario D: View detail of student
        if batch_id and course_id and student_id:
            return self._get_student_detail(request, org_pk, batch_id, course_id, student_id)

        # Scenario C: List students and teachers under the course in a batch
        if batch_id and course_id:
            return self._get_course_students(request, org_pk, batch_id, course_id)

        # Scenario B: Show courses under the batch
        if batch_id:
            return self._get_batch_courses(request, org_pk, batch_id, two_days_ago)

        # Scenario A: Show batches in the organization
        return self._get_batches_list(request, org_pk, two_days_ago)

    def _get_student_detail(self, request, org_pk, batch_id, course_id, student_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_pk)
        student_member = get_object_or_404(OrganizationMember, organization_id=org_pk, user_id=student_id)
        
        # Ensure student is enrolled in the batch
        if not BatchStudent.objects.filter(batch_id=batch_id, student=student_member, is_active=True).exists():
            return Response({"detail": "Student is not enrolled in this batch."}, status=status.HTTP_400_BAD_REQUEST)
            
        from curriculum.serializers import DetailedLearnerCourseProgressSerializer
        serializer = DetailedLearnerCourseProgressSerializer(
            course,
            context={'request': request, 'student': student_member}
        )
        return Response(serializer.data)

    def _determine_student_review_status(self, student, course):
        oldest_pending = TaskSubmission.objects.filter(
            student=student,
            task__node__module__course=course,
            status__in=['Pending', NEEDS_MANUAL_REVIEW],
            is_deleted=False
        ).order_by('submitted_at').first()

        if oldest_pending:
            delta = timezone.now() - oldest_pending.submitted_at
            if delta > timedelta(days=2):
                days = delta.days
                hours = delta.seconds // 3600
                return f"Overdue ({days}d {hours}h)"
            return "Awaiting Review"

        has_submissions = TaskSubmission.objects.filter(
            student=student,
            task__node__module__course=course,
            is_deleted=False
        ).exists()
        return "Reviewed" if has_submissions else "No Submissions"

    def _get_course_students(self, request, org_pk, batch_id, course_id):
        batch = get_object_or_404(Batch, id=batch_id, organization_id=org_pk)
        course = get_object_or_404(Course, id=course_id, organization_id=org_pk)
        
        # Ensure course is in the batch
        if not batch.courses.filter(id=course_id).exists():
            return Response({"detail": "Course is not associated with this batch."}, status=status.HTTP_400_BAD_REQUEST)

        # Get teachers
        teachers = course.teachers.all()
        teachers_data = [{
            'id': t.id,
            'email': t.email,
            'name': f"{t.first_name} {t.last_name}".strip() or t.email
        } for t in teachers]

        trainer_names = ", ".join([t['name'] for t in teachers_data]) or "No trainer assigned"

        # Get students enrolled in this batch
        batch_students = BatchStudent.objects.filter(batch=batch, is_active=True).select_related('student__user')
        
        # Count total tasks in this course
        total_tasks_count = Task.objects.filter(node__module__course=course, is_deleted=False).count()

        students_data = []
        for bs in batch_students:
            student = bs.student
            user_obj = student.user
            
            # Count evaluated task submissions (Approved, Rejected, Graded)
            evaluated_count = TaskSubmission.objects.filter(
                student=student,
                task__node__module__course=course,
                status__in=['Approved', 'Rejected', 'Graded'],
                is_deleted=False
            ).count()

            evaluation_percentage = int((evaluated_count / total_tasks_count) * 100) if total_tasks_count > 0 else 0

            # Determine review status
            status_str = self._determine_student_review_status(student, course)

            students_data.append({
                'student_id': user_obj.id,
                'email': user_obj.email,
                'name': f"{user_obj.first_name} {user_obj.last_name}".strip() or user_obj.email,
                'course_title': course.title,
                'trainer_name': trainer_names,
                'total_tasks': total_tasks_count,
                'evaluated_tasks': evaluated_count,
                'progress': f"{evaluated_count}/{total_tasks_count}",
                'evaluation_percentage': evaluation_percentage,
                'review_status': status_str
            })

        return Response({
            'batch_id': batch.id,
            'batch_name': batch.name,
            'course_id': course.id,
            'course_title': course.title,
            'teachers': teachers_data,
            'students': students_data
        })

    def _get_batch_courses(self, request, org_pk, batch_id, two_days_ago):
        batch = get_object_or_404(Batch, id=batch_id, organization_id=org_pk)
        courses = batch.courses.all()
        
        student_ids = BatchStudent.objects.filter(batch=batch, is_active=True).values_list('student_id', flat=True)
        students_count = len(student_ids)

        courses_data = []
        for c in courses:
            # Count total pending submissions for this batch's students in this course
            pending_count = TaskSubmission.objects.filter(
                student__uuid__in=student_ids,
                task__node__module__course=c,
                status__in=['Pending', NEEDS_MANUAL_REVIEW],
                is_deleted=False
            ).count()

            # Count overdue reviews (> 2 days)
            overdue_count = TaskSubmission.objects.filter(
                student__uuid__in=student_ids,
                task__node__module__course=c,
                status__in=['Pending', NEEDS_MANUAL_REVIEW],
                submitted_at__lt=two_days_ago,
                is_deleted=False
            ).count()

            if pending_count == 0:
                review_status = "All reviewed"
            elif overdue_count > 0:
                review_status = f"{overdue_count} overdue"
            else:
                review_status = "Awaiting Review"

            trainer_names = ", ".join([f"{t.first_name} {t.last_name}".strip() or t.email for t in c.teachers.all()]) or "No trainer assigned"

            courses_data.append({
                'id': c.id,
                'title': c.title,
                'description': c.description,
                'status': c.status,
                'trainer_name': trainer_names,
                'students_enrolled_count': students_count,
                'overdue_reviews_count': overdue_count,
                'review_status': review_status
            })

        return Response({
            'batch_id': batch.id,
            'batch_name': batch.name,
            'courses': courses_data
        })

    def _get_batches_list(self, request, org_pk, two_days_ago):
        batches = Batch.objects.filter(organization_id=org_pk, is_deleted=False).prefetch_related('courses').order_by('-start_date', 'name')
        batches_data = []
        for b in batches:
            courses = b.courses.all()
            student_ids = BatchStudent.objects.filter(batch=b, is_active=True).values_list('student_id', flat=True)
            students_count = len(student_ids)

            # Count overdue reviews (> 2 days) in this batch
            overdue_count = TaskSubmission.objects.filter(
                student__uuid__in=student_ids,
                task__node__module__course__in=courses,
                status__in=['Pending', NEEDS_MANUAL_REVIEW],
                submitted_at__lt=two_days_ago,
                is_deleted=False
            ).count()

            batches_data.append({
                'id': b.id,
                'name': b.name,
                'start_date': b.start_date,
                'end_date': b.end_date,
                'is_active': b.is_active,
                'courses_count': len(courses),
                'students_count': students_count,
                'overdue_reviews_count': overdue_count,
                'courses': [{
                    'id': c.id,
                    'title': c.title,
                    'description': c.description
                } for c in courses]
            })

        return Response(batches_data)
