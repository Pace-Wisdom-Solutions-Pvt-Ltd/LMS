# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import uuid
import base64
from io import BytesIO
from rest_framework import status, serializers, pagination, filters
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.http import HttpResponse
from django.core.files.base import ContentFile
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from accounts.models import User
from organizations.permissions import IsOrgAdmin, IsOrgAdminOrTeacher
from .models import (
    Course, Module, Chapter, Node, LearningMaterial,
    Assessment, AssignmentSubmission, StudentNodeProgress, Task, Quiz,
    QuizQuestion, QuizOption, TaskSubmission, QuizSubmission,
)
from .permissions import IsCourseAdminOrTeacher
from .serializers import (
    CourseSerializer, ModuleSerializer, ChapterSerializer, NodeSerializer,
    LearningMaterialSerializer, TaskSerializer,
    RoadmapCourseSerializer,
    NodeContentUpdateSerializer,
    TaskSubmissionSerializer, QuizSubmissionSerializer,
    LearnerProgressSerializer,
    EnrolledCourseSerializer,
    TaskReviewSerializer,
    StudentTaskResultSerializer,
    CourseProgressBreakdownSerializer,
    StudentOverallProgressSerializer,
)
import logging
logger = logging.getLogger(__name__)
from curriculum.utils import normalize_correct_labels as _normalize_correct_labels

COURSE_ACCESS_DENIED = 'Course access is not active for this student.'
COURSE_ACCESS_NOT_ACTIVE_YET = 'Course access is not active yet.'
COURSE_ACCESS_HAS_EXPIRED = 'Course access has expired.'

# Reusable literals to keep values consistent and satisfy static analysis
EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
FILE_REQUIRED_MESSAGE = 'File is required.'
MISSING_FILE_ERROR = 'Missing file.'
FILE_HAS_ERRORS_MESSAGE = 'File has errors. Please correct and reupload.'
PERMISSION_DENIED_MESSAGE = 'Permission denied.'
COURSE_ID_REQUIRED_MESSAGE = 'course_id query parameter is required.'


def _user_is_org_staff(user, org_id):
    return user.is_superuser or OrganizationMember.objects.filter(
        user=user, organization_id=org_id,
        role__name__in=['org_admin', 'teacher'], is_active=True,
    ).exists()


def _student_course_access_error_message(user, course, org_id=None):
    if user.is_superuser:
        return None

    if OrganizationMember.objects.filter(
        user=user,
        organization=course.organization,
        role__name__in=['org_admin', 'teacher'],
        is_active=True,
    ).exists():
        return None

    today = timezone.localdate()
    relevant_enrollments = BatchStudent.objects.filter(
        student__user=user,
        is_active=True,
        is_deleted=False,
        batch__is_active=True,
        batch__is_deleted=False,
    )
    if org_id:
        relevant_enrollments = relevant_enrollments.filter(batch__organization_id=org_id)

    relevant_enrollments = relevant_enrollments.filter(
        Q(course=course) | Q(batch__courses=course)
    )

    if relevant_enrollments.filter(batch__start_date__lte=today, batch__end_date__gte=today).exists():
        return None

    if relevant_enrollments.filter(batch__start_date__gt=today).exists():
        return COURSE_ACCESS_NOT_ACTIVE_YET

    if relevant_enrollments.filter(batch__end_date__lt=today).exists():
        return COURSE_ACCESS_HAS_EXPIRED

    return COURSE_ACCESS_DENIED


def _student_has_active_course_access(user, course, org_id=None):
    return _student_course_access_error_message(user, course, org_id=org_id) is None


def _student_has_active_node_access(user, node, org_id=None):
    return _student_course_access_error_message(user, node.module.course, org_id=org_id) is None


def _student_course_access_error_response(user, course, org_id=None):
    message = _student_course_access_error_message(user, course, org_id=org_id)
    if message is None:
        return None
    return {'detail': message}


def _node_is_completable(node):
    """Returns True if the node has any content a student can actually complete.
    Section-header nodes (no content at all) should not block access to siblings.
    """
    has_learning = hasattr(node, 'learning_material') and node.learning_material is not None
    has_task = hasattr(node, 'task') and node.task is not None
    has_assessment = hasattr(node, 'assessment') and node.assessment is not None
    has_quiz = node.quizzes.exists()
    return has_learning or has_task or has_assessment or has_quiz


def _prereq_is_satisfied(student, node):
    """Check if the prerequisite for a node is satisfied.
    Returns True if:
    - The node has no prerequisite, OR
    - The prerequisite node has no completable content (it's a header), OR
    - The student has completed the prerequisite.
    """
    if node.prerequisite_node_id is None:
        return True
    prereq = node.prerequisite_node
    if not _node_is_completable(prereq):
        return True  # header/divider node — automatically satisfied
    return StudentNodeProgress.objects.filter(
        student=student,
        node_id=node.prerequisite_node_id,
        status='Completed',
    ).exists()


def _module_is_completed(student, module):
    """
    A module is completed if all of its completable nodes are completed by the student.
    If a module has no completable nodes, it is considered completed.
    """
    completable_nodes = Node.objects.filter(module=module, is_deleted=False).filter(
        models.Q(learning_material__isnull=False) |
        models.Q(task__isnull=False) |
        models.Q(assessment__isnull=False) |
        models.Q(quizzes__isnull=False)
    ).distinct()

    if not completable_nodes.exists():
        return True

    completed_count = StudentNodeProgress.objects.filter(
        student=student,
        node__in=completable_nodes,
        status='Completed'
    ).count()

    return completed_count >= completable_nodes.count()


def _student_can_access_module(student, module, request=None):
    """
    Returns True if the student can access the module.
    - Staff always has access (unless acting strictly as student).
    - First module (by sequence_order) is always accessible.
    - Any subsequent module is accessible only if the previous module is completed.
    """
    if not student or not student.is_authenticated:
        return False

    if _is_acting_as_staff(student, module.course.organization, request):
        return True

    # Order modules by sequence_order, id
    course_modules = Module.objects.filter(course=module.course, is_deleted=False).order_by('sequence_order', 'id')
    module_list = list(course_modules)

    try:
        idx = module_list.index(module)
    except ValueError:
        return False

    if idx == 0:
        return True

    prev_module = module_list[idx - 1]
    return _module_is_completed(student, prev_module)


def _is_acting_as_staff(student, organization, request=None):
    """Returns True if the user should be treated as staff (full access).
    Returns False if the user has a student role (even if also a teacher),
    or if they explicitly set X-Current-Role: student via header.
    """
    if student.is_superuser:
        return True

    if request and request.headers.get('X-Current-Role') == 'student':
        return False

    from organizations.models import OrganizationMember
    membership = OrganizationMember.objects.filter(
        user=student,
        organization=organization,
        is_active=True,
    ).first()

    if not membership:
        return False

    # If user also has a student role, enforce student progression
    has_student_role = (
        (membership.role and membership.role.name == 'student') or
        membership.roles.filter(name='student').exists()
    )
    if has_student_role:
        return False

    # Pure staff gets full access
    return membership.role.name in ['org_admin', 'teacher'] if membership.role else False


def _student_can_access_node(student, node, request=None):
    """
    Returns True if the student can access the node.
    - Staff always has access (unless acting strictly as student).
    - If the node's module is not accessible: False.
    - If the node is not completable (header): True.
    - If the node is completable:
      - The immediately preceding completable sibling node must be completed.
      - AND the explicit prerequisite node (if any) must be completed.
    """
    if not student or not student.is_authenticated:
        return False

    if _is_acting_as_staff(student, node.module.course.organization, request):
        return True

    # 1. Module must be accessible
    if not _student_can_access_module(student, node.module, request=request):
        return False

    # 2. Non-completable header nodes are always accessible within an accessible module
    if not _node_is_completable(node):
        return True

    # 3. Completable nodes must be unlocked sequentially within the module
    sibling_nodes = Node.objects.filter(module=node.module, is_deleted=False).order_by('sequence_order', 'id')
    completable_siblings = [n for n in sibling_nodes if _node_is_completable(n)]

    try:
        idx = completable_siblings.index(node)
    except ValueError:
        return False

    if idx > 0:
        prev_node = completable_siblings[idx - 1]
        prev_completed = StudentNodeProgress.objects.filter(
            student=student,
            node=prev_node,
            status='Completed'
        ).exists()
        if not prev_completed:
            return False

    # 4. Explicit prerequisite check
    if node.prerequisite_node_id is not None and not _prereq_is_satisfied(student, node):
        return False

    return True




# Optional: Add your custom RBAC permissions here once defined.
# For now, using IsAuthenticated as baseline.

ERROR_NODE_NO_TASK = 'Node has no task.'



@extend_schema(tags=['Courses'])
class CourseListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Courses",
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by course name or description'),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY, description='Filter by course status (comma-separated for multiple: Draft,Published,Archived)', enum=['Draft', 'Published', 'Archived']),
            OpenApiParameter(name='ordering', type=str, location=OpenApiParameter.QUERY, description='Which field to use when ordering the results (title, status, created_at)'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, description='A page number within the paginated result set.'),
        ],
        responses=CourseSerializer(many=True)
    )
    def get(self, request, org_id):
        # Admins fetch all, Teachers only assigned, students might only see Published
        organization = get_object_or_404(Organization, id=org_id)
        membership = self._get_membership(request, organization)

        if not membership and not request.user.is_superuser:
            return Response({'error': 'No access to this organization.'}, status=status.HTTP_403_FORBIDDEN)

        courses = self._get_base_queryset(request.user, membership, organization)
        courses = self._apply_filters(request, courses)
        
        return self._paginate_and_response(request, courses)

    def _get_membership(self, request, organization):
        if hasattr(OrganizationMember, 'batches'):
            return OrganizationMember.objects.select_related('course', 'role').prefetch_related('batches').filter(
                user=request.user, 
                organization=organization, 
                is_active=True
            ).first()
        else:
            return OrganizationMember.objects.select_related('batch', 'course', 'role').filter(
                user=request.user, 
                organization=organization, 
                is_active=True
            ).first()

    def _get_base_queryset(self, user, membership, organization):
        courses = Course.objects.filter(organization=organization)
        
        # Superuser / OrgAdmin
        if user.is_superuser or (membership and membership.role.name == "org_admin"):
            return courses
            
        # Teacher
        if membership and membership.role.name == "teacher":
            teacher_filters = Q(teachers=user)
            if hasattr(membership, 'batches') and membership.batches.exists():
                teacher_filters |= Q(id__in=Course.objects.filter(batches__in=membership.batches.all()).values_list('id', flat=True))
            elif getattr(membership, 'batch', None):
                teacher_filters |= Q(id__in=membership.batch.courses.values_list('id', flat=True))
            return courses.filter(status__in=['Published', 'Draft']).filter(teacher_filters).distinct()
            
        # Student / Others
        return courses.filter(status='Published')

    def _is_admin(self, request):
        is_admin = request.user.is_superuser
        if not is_admin:
            org_id = self.kwargs.get('org_id')
            is_admin = OrganizationMember.objects.filter(
                user=request.user,
                organization_id=org_id,
                role__name="org_admin",
                is_active=True
            ).exists()
        return is_admin

    def _apply_admin_filters(self, queryset, status_param, archived_only):
        if archived_only or status_param == 'Archived':
            return queryset.filter(status='Archived')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            if statuses:
                return queryset.filter(status__in=statuses)
            return queryset
        return queryset.filter(status__in=['Published', 'Draft'])

    def _apply_non_admin_filters(self, queryset, status_param):
        if status_param:
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            statuses = [s for s in statuses if s != 'Archived']
            if statuses:
                return queryset.filter(status__in=statuses)
        return queryset

    def _apply_filters(self, request, queryset):
        search_query = request.query_params.get('search', '').strip()
        status_param = request.query_params.get('status')
        archived_only = request.query_params.get('archived_only', 'false').lower() == 'true'
        ordering = request.query_params.get('ordering', '-created_at')

        if self._is_admin(request):
            queryset = self._apply_admin_filters(queryset, status_param, archived_only)
        else:
            queryset = self._apply_non_admin_filters(queryset, status_param)

        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        if ordering:
            queryset = queryset.order_by(ordering)
            
        return queryset

    def _paginate_and_response(self, request, queryset):
        paginator = pagination.PageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = CourseSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = CourseSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create Course (Org Admin Only)",
        request=CourseSerializer,
        responses={201: CourseSerializer}
    )
    def post(self, request, org_id):
        # Only Org Admin can create courses
        if not self._is_admin(request):
            return Response({'error': 'Only Org Admins can create courses.'}, status=status.HTTP_403_FORBIDDEN)

        organization = get_object_or_404(Organization, id=org_id)
        serializer = CourseSerializer(data=request.data, context={'request': request, 'view': self})
        if serializer.is_valid():
            serializer.save(organization=organization)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

@extend_schema(tags=['Courses'])
class StudentEnrolledCourseListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="My Enrolled Courses",
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by course name'),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY, description='Filter by course status (comma-separated: Draft,Published,Archived)', enum=['Draft', 'Published', 'Archived']),
        ],
        responses=EnrolledCourseSerializer(many=True)
    )
    def get(self, request, org_id):
        search_query = request.query_params.get('search', '').strip()
        status_param = request.query_params.get('status')
        today = timezone.localdate()

        from organizations.models import OrganizationMember
        membership = OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_active=True,
        ).first()
        if not membership:
            return Response([])

        courses = Course.objects.filter(
            organization_id=org_id,
            status='Published'
        ).filter(
            Q(
                batch_students__student=membership,
                batch_students__is_active=True,
                batch_students__is_deleted=False,
                batch_students__batch__is_active=True,
                batch_students__batch__is_deleted=False,
                batch_students__batch__start_date__lte=today,
                batch_students__batch__end_date__gte=today,
            ) |
            Q(
                batches__students__student=membership,
                batches__students__is_active=True,
                batches__students__is_deleted=False,
                batches__is_active=True,
                batches__is_deleted=False,
                batches__start_date__lte=today,
                batches__end_date__gte=today,
            )
        ).distinct()

        if search_query:
            courses = courses.filter(title__icontains=search_query)

        if status_param:
            statuses = [s.strip().capitalize() for s in status_param.split(',') if s.strip()]
            valid_statuses = [s for s in statuses if s == 'Published']
            if valid_statuses:
                courses = courses.filter(status__in=valid_statuses)
            elif any(s in ['Draft', 'Archived'] for s in statuses):
                courses = courses.none()

        courses = courses.order_by('-created_at')
        serializer = EnrolledCourseSerializer(courses, many=True, context={'request': request})
        return Response(serializer.data)



@extend_schema(tags=['Courses'])
class StudentPersonalProgressAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="My Overall Progress",
        description="Calculates the student's overall completion percentage and provides a course-wise breakdown for the specified organization.",
        responses={200: StudentOverallProgressSerializer}
    )
    def get(self, request, org_id):
        # 1. Identify all active batch enrollments for the student in this organization
        from organizations.models import OrganizationMember
        membership = OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_active=True,
        ).first()
        
        if not membership:
            return Response({
                'overall_completion_percentage': 0,
                'total_nodes': 0,
                'completed_nodes': 0,
                'batches': []
            })

        today = timezone.localdate()
        active_enrollments = BatchStudent.objects.filter(
            student=membership,
            batch__organization_id=org_id,
            is_active=True,
            is_deleted=False,
            batch__is_active=True,
            batch__is_deleted=False,
            batch__start_date__lte=today,
            batch__end_date__gte=today,
        ).select_related('batch').prefetch_related('batch__courses')
        
        batch_data_list = []
        seen_nodes_global = set() # To avoid double counting for overall percentage
        completed_nodes_global = set()

        for enrollment in active_enrollments:
            batch = enrollment.batch
            # Collect courses for this specific batch context
            batch_m2m_courses = batch.courses.all()
            
            # Combine unique courses for this batch
            batch_courses = list(batch_m2m_courses)
            if enrollment.course and enrollment.course not in batch_courses:
                batch_courses.append(enrollment.course)

            course_breakdown = []
            for course in batch_courses:
                # Nodes with actual interactive content
                nodes_with_content = Node.objects.filter(module__course=course).filter(
                    Q(learning_material__isnull=False) | 
                    Q(task__isnull=False) | 
                    Q(assessment__isnull=False) | 
                    Q(quizzes__isnull=False)
                ).distinct()
                
                node_ids = set(nodes_with_content.values_list('id', flat=True))
                total_nodes_count = len(node_ids)
                
                completed_nodes_qs = StudentNodeProgress.objects.filter(
                    student=membership,
                    node__in=nodes_with_content,
                    status='Completed'
                )
                completed_node_ids = set(completed_nodes_qs.values_list('node_id', flat=True))
                completed_nodes_count = len(completed_node_ids)
                
                completion_percentage = (completed_nodes_count / total_nodes_count * 100) if total_nodes_count > 0 else 0
                
                course_breakdown.append({
                    'id': course.id,
                    'title': course.title,
                    'total_nodes': total_nodes_count,
                    'completed_nodes': completed_nodes_count,
                    'completion_percentage': round(completion_percentage, 2)
                })

                # Aggregate for global stats
                seen_nodes_global.update(node_ids)
                completed_nodes_global.update(completed_node_ids)

            batch_data_list.append({
                'id': batch.id,
                'name': batch.name,
                'courses': course_breakdown
            })

        global_total = len(seen_nodes_global)
        global_completed = len(completed_nodes_global)
        overall_percentage = (global_completed / global_total * 100) if global_total > 0 else 0

        response_data = {
            'overall_completion_percentage': round(overall_percentage, 2),
            'total_nodes': global_total,
            'completed_nodes': global_completed,
            'batches': batch_data_list
        }

        serializer = StudentOverallProgressSerializer(response_data)
        return Response(serializer.data)


@extend_schema(tags=['Courses'])
class CourseDetailAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]

    @extend_schema(
        summary="Retrieve Course",
        responses={200: CourseSerializer}
    )
    def get(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id)
        self.check_object_permissions(request, course)
        serializer = CourseSerializer(course)
        return Response(serializer.data)

    @extend_schema(
        summary="Update Course (Full)",
        request=CourseSerializer,
        responses={200: CourseSerializer}
    )
    def put(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id)
        self.check_object_permissions(request, course)
        serializer = CourseSerializer(course, data=request.data, context={'request': request, 'view': self})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Update Course (Partial)",
        request=CourseSerializer,
        responses={200: CourseSerializer}
    )
    def patch(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id)
        self.check_object_permissions(request, course)
        serializer = CourseSerializer(course, data=request.data, partial=True, context={'request': request, 'view': self})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete Course",
        responses={204: None}
    )
    def delete(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id)
        self.check_object_permissions(request, course)
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Courses'])
class ModuleListCreateAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]

    @extend_schema(
        summary="List Modules in Course",
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by module title'),
            OpenApiParameter(name='ordering', type=str, location=OpenApiParameter.QUERY, description='Field to order by (title, sequence_order, created_at)'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, description='Page number'),
        ],
        responses={200: ModuleSerializer(many=True)}
    )
    def get(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id)
        self.check_object_permissions(request, course)
        
        search_query = request.query_params.get('search', '').strip()
        modules = Module.objects.filter(course=course)
        
        if search_query:
            modules = modules.filter(title__icontains=search_query)
            
        ordering = request.query_params.get('ordering', 'sequence_order')
        if ordering:
            modules = modules.order_by(ordering)

        paginator = pagination.PageNumberPagination()
        page = paginator.paginate_queryset(modules, request)
        if page is not None:
            serializer = ModuleSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ModuleSerializer(modules, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create Module",
        request=ModuleSerializer,
        responses={201: ModuleSerializer}
    )
    def post(self, request, org_id, course_id):
        course = get_object_or_404(Course, id=course_id, organization_id=org_id)
        self.check_object_permissions(request, course)
        serializer = ModuleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(course=course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=['Courses'])
class ModuleDetailAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]

    @extend_schema(
        summary="Retrieve Module",
        responses={200: ModuleSerializer}
    )
    def get(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        serializer = ModuleSerializer(module)
        return Response(serializer.data)

    @extend_schema(
        summary="Update Module (Full)",
        request=ModuleSerializer,
        responses={200: ModuleSerializer}
    )
    def put(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        serializer = ModuleSerializer(module, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Update Module (Partial)",
        request=ModuleSerializer,
        responses={200: ModuleSerializer}
    )
    def patch(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        serializer = ModuleSerializer(module, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete Module",
        responses={204: None}
    )
    def delete(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        module.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Courses'])
class ChapterListCreateAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]

    def _get_module(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        return module

    @extend_schema(summary="List Chapters in Module", responses={200: ChapterSerializer(many=True)})
    def get(self, request, org_id, course_id, module_id):
        module = self._get_module(request, org_id, course_id, module_id)
        return Response(ChapterSerializer(module.chapters.all(), many=True).data)

    @extend_schema(summary="Create Chapter", request=ChapterSerializer, responses={201: ChapterSerializer})
    def post(self, request, org_id, course_id, module_id):
        module = self._get_module(request, org_id, course_id, module_id)
        serializer = ChapterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(module=module)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class _ChapterLookupMixin:
    permission_classes = [IsCourseAdminOrTeacher]

    def _get_chapter(self, request, org_id, course_id, module_id, chapter_id):
        chapter = get_object_or_404(
            Chapter, id=chapter_id, module_id=module_id,
            module__course_id=course_id, module__course__organization_id=org_id,
        )
        self.check_object_permissions(request, chapter)
        return chapter


@extend_schema(tags=['Courses'])
class ChapterDetailAPIView(_ChapterLookupMixin, APIView):

    @extend_schema(summary="Retrieve Chapter", responses={200: ChapterSerializer})
    def get(self, request, org_id, course_id, module_id, chapter_id):
        chapter = self._get_chapter(request, org_id, course_id, module_id, chapter_id)
        return Response(ChapterSerializer(chapter).data)

    @extend_schema(summary="Update Chapter (Partial)", request=ChapterSerializer, responses={200: ChapterSerializer})
    def patch(self, request, org_id, course_id, module_id, chapter_id):
        chapter = self._get_chapter(request, org_id, course_id, module_id, chapter_id)
        serializer = ChapterSerializer(chapter, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(summary="Delete Chapter (and its nodes)", responses={204: None})
    def delete(self, request, org_id, course_id, module_id, chapter_id):
        chapter = self._get_chapter(request, org_id, course_id, module_id, chapter_id)
        with transaction.atomic():
            chapter.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


_NODE_REORDER_REQUEST = inline_serializer(
    'NodeReorder', {'node_ids': serializers.ListField(child=serializers.IntegerField())}
)


def _reordered_nodes_response(request, nodes):
    nodes = nodes.select_related('learning_material', 'task').prefetch_related('quizzes__questions__options')
    return Response(NodeSerializer(nodes, many=True, context={'request': request}).data)


@extend_schema(tags=['Courses'])
class ChapterNodeReorderAPIView(_ChapterLookupMixin, APIView):
    @extend_schema(
        summary="Reorder Nodes in Chapter",
        description="Pass every node id in the chapter, top to bottom. Updates order and unlock chain atomically.",
        request=_NODE_REORDER_REQUEST,
        responses={200: NodeSerializer(many=True)},
    )
    def post(self, request, org_id, course_id, module_id, chapter_id):
        chapter = self._get_chapter(request, org_id, course_id, module_id, chapter_id)
        node_ids = request.data.get('node_ids')
        current_ids = set(chapter.nodes.values_list('id', flat=True))
        if not isinstance(node_ids, list) or len(node_ids) != len(current_ids) or set(node_ids) != current_ids:
            return Response(
                {'node_ids': 'Must list every node in this chapter exactly once.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from curriculum.utils import apply_node_order
        apply_node_order(chapter.module_id, node_ids)
        return _reordered_nodes_response(request, chapter.nodes.all())


@extend_schema(tags=['Courses'])
class ModuleNodeReorderAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]

    @extend_schema(
        summary="Reorder Nodes in Module",
        description=(
            "Pass node ids top to bottom. Listed nodes swap among the positions they "
            "already hold (a subset is fine); nodes stay grouped by chapter."
        ),
        request=_NODE_REORDER_REQUEST,
        responses={200: NodeSerializer(many=True)},
    )
    def post(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        node_ids = request.data.get('node_ids')
        from curriculum.utils import apply_node_order
        if (
            not isinstance(node_ids, list)
            or not node_ids
            or not all(isinstance(i, int) for i in node_ids)
            or not apply_node_order(module.id, node_ids)
        ):
            return Response(
                {'node_ids': 'Must be a list of distinct node ids from this module.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return _reordered_nodes_response(request, Node.objects.filter(module=module))


@extend_schema(tags=['Courses'])
class NodeCreateAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(
        summary="List Nodes in Module",
        responses={200: NodeSerializer(many=True)}
    )
    def get(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        nodes = Node.objects.filter(module=module).select_related('learning_material', 'task').prefetch_related(
            'quizzes__questions__options'
        )
        serializer = NodeSerializer(nodes, many=True, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Create Node",
        request=NodeSerializer,            # <--- Tells Swagger to show the Node form
        responses={201: NodeSerializer}
    )
    def post(self, request, org_id, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id, course__organization_id=org_id)
        self.check_object_permissions(request, module)
        serializer = NodeSerializer(data=request.data, context={'request': request, 'module': module})
        if serializer.is_valid():
            serializer.save(module=module)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=['Courses'])
class NodeDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _check_can_edit(self, request, node):
        # GET is open to enrolled students; writes are for course admins/teachers only.
        perm = IsCourseAdminOrTeacher()
        if not (perm.has_permission(request, self) and perm.has_object_permission(request, self, node)):
            self.permission_denied(request)

    @extend_schema(
        summary="Retrieve Node",
        description="Returns full node content. For staff: always returns everything. For students: returns content only if the node is accessible (no prerequisite, or prerequisite is completed).",
        responses={200: NodeSerializer}
    )
    def get(self, request, org_id, course_id, module_id, node_id):
        node = get_object_or_404(Node, id=node_id, module_id=module_id, module__course_id=course_id, module__course__organization_id=org_id)

        is_staff = request.user.is_superuser or IsCourseAdminOrTeacher().has_permission(request, self)

        if is_staff:
           
            serializer = NodeSerializer(node, context={'request': request})
            return Response(serializer.data)

        course_error = _student_course_access_error_response(request.user, node.module.course, org_id=org_id)
        if course_error is not None:
            return Response(course_error, status=status.HTTP_403_FORBIDDEN)

        # Allow access if node already completed OR node is accessible
        node_completed = StudentNodeProgress.objects.filter(
            student=request.user, node_id=node.id, status='Completed'
        ).exists()
        if not node_completed and not _student_can_access_node(request.user, node):
            # Check if it's because the module is locked
            if not _student_can_access_module(request.user, node.module):
                return Response(
                    {'detail': "This content is locked. Please complete the previous module first to unlock it."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            sibling_nodes = Node.objects.filter(module=node.module, is_deleted=False).order_by('sequence_order', 'id')
            completable_siblings = [n for n in sibling_nodes if _node_is_completable(n)]
            try:
                idx = completable_siblings.index(node)
            except ValueError:
                idx = -1
            
            lock_reason = "the previous topic"
            if idx > 0:
                lock_reason = f"'{completable_siblings[idx - 1].title}'"
            elif node.prerequisite_node:
                lock_reason = f"'{node.prerequisite_node.title}'"

            return Response(
                {'detail': f"This content is locked. Please complete {lock_reason} first to unlock it."},
                status=status.HTTP_403_FORBIDDEN
            )


        serializer = NodeSerializer(node, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Update Node (Full)",
        request=NodeSerializer,
        responses={200: NodeSerializer}
    )
    def put(self, request, org_id, course_id, module_id, node_id):
        node = get_object_or_404(Node, id=node_id, module_id=module_id, module__course_id=course_id, module__course__organization_id=org_id)
        self._check_can_edit(request, node)
        serializer = NodeSerializer(node, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Update Node (Partial)",
        request=NodeSerializer,
        responses={200: NodeSerializer}
    )
    def patch(self, request, org_id, course_id, module_id, node_id):
        node = get_object_or_404(Node, id=node_id, module_id=module_id, module__course_id=course_id, module__course__organization_id=org_id)
        self._check_can_edit(request, node)
        serializer = NodeSerializer(node, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete Node",
        responses={204: None}
    )
    def delete(self, request, org_id, course_id, module_id, node_id):
        node = get_object_or_404(Node, id=node_id, module_id=module_id, module__course_id=course_id, module__course__organization_id=org_id)
        self._check_can_edit(request, node)
        node.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Courses'])
class NodeContentUpdateAPIView(APIView):
    permission_classes = [IsCourseAdminOrTeacher]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(
        summary="Update Node Content",
        description="Updates either the Learning Material, Task, or Quiz for a node.",
        request=NodeContentUpdateSerializer,
        responses={200: serializers.Serializer}
    )
    def put(self, request, org_id, node_id):
        node = get_object_or_404(Node, id=node_id, module__course__organization_id=org_id)
        self.check_object_permissions(request, node)

        serializer = NodeContentUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        content_type = serializer.validated_data['content_type']

        if content_type == 'LearningMaterial':
            return self._update_learning_material(node, request)

        if content_type == 'Task':
            return self._update_task(node, request)

        if content_type == 'Quiz':
            return self._update_quiz(node, serializer.validated_data)

        return Response({'error': 'Invalid content_type.'}, status=status.HTTP_400_BAD_REQUEST)

    def _delete_learning_material_and_task(self, node):
        LearningMaterial.objects.filter(node=node).delete()
        Task.objects.filter(node=node).delete()

    def _delete_learning_material_and_quiz(self, node):
        LearningMaterial.objects.filter(node=node).delete()
        Quiz.objects.filter(node=node).delete()

    def _clear_all_non_quiz_content(self, node):
        Assessment.objects.filter(node=node).delete()
        Task.objects.filter(node=node).delete()
        Quiz.objects.filter(node=node).delete()

    def _update_learning_material(self, node, request):
        self._clear_all_non_quiz_content(node)

        material, _ = LearningMaterial.objects.get_or_create(node=node)
        material_data = {
            'content_type': request.data.get('learning_material_content_type'),
            'content_url': request.data.get('learning_material_content_url'),
            'content_file': request.FILES.get('learning_material_content_file') or request.data.get('learning_material_content_file'),
            'content_text': request.data.get('learning_material_content_text'),
        }
        material_data = {k: v for k, v in material_data.items() if v is not None}

        m_serializer = LearningMaterialSerializer(material, data=material_data, partial=True)
        if not m_serializer.is_valid():
            return Response(m_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        m_serializer.save()
        return Response({'message': 'Learning Material updated.', 'data': m_serializer.data})

    def _update_task(self, node, request):
        self._delete_learning_material_and_quiz(node)

        task, _ = Task.objects.get_or_create(node=node)
        task_data = {
            'title': request.data.get('task_title'),
            'allow_link': request.data.get('task_allow_link'),
            'allow_paragraph': request.data.get('task_allow_paragraph'),
            'allow_pdf': request.data.get('task_allow_pdf'),
            'allow_screenshot': request.data.get('task_allow_screenshot'),
            'allow_code_block': request.data.get('task_allow_code_block'),
            'allow_file': request.data.get('task_allow_file'),
        }
        task_data = {k: v for k, v in task_data.items() if v is not None}

        t_serializer = TaskSerializer(task, data=task_data, partial=True)
        if not t_serializer.is_valid():
            return Response(t_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        t_serializer.save()
        return Response({'message': 'Task updated.', 'data': t_serializer.data})

    def _create_quiz_question(self, quiz, question_text, options, correct_labels=None, allow_multiple=False):
        question = QuizQuestion.objects.create(
            quiz=quiz,
            question_text=question_text,
            allow_multiple_correct=allow_multiple,
        )
        labels = "abcdefghijklmnopqrstuvwxyz"

        normalized_labels = {lbl for lbl in (correct_labels or []) if lbl}
        if not normalized_labels:
            normalized_labels.add('a')

        for idx, opt_text in enumerate(options):
            if not opt_text:
                continue
            current_label = labels[idx] if idx < len(labels) else str(idx)
            QuizOption.objects.create(
                question=question,
                option_text=opt_text,
                is_correct=(current_label in normalized_labels)
            )

    def _create_single_quiz(self, node, quiz_name, quick_text, fixed_options, extra_options, correct_labels, allow_multiple, questions_input, timer_minutes=None, passing_percentage=None):
        quiz_fields = {'passing_percentage': passing_percentage} if passing_percentage is not None else {}
        quiz = Quiz.objects.create(
            node=node,
            name=quiz_name or 'Lesson Quiz',
            timer_minutes=timer_minutes,
            **quiz_fields,
        )

        if quick_text:
            extra = extra_options or []
            # Keep options uncompressed to maintain correct indexes for labels 'abcd'
            all_options = list(fixed_options) + extra
            self._create_quiz_question(
                quiz,
                quick_text,
                all_options,
                correct_labels=correct_labels,
                allow_multiple=allow_multiple,
            )

        for q_data in questions_input or []:
            options = [
                q_data.get('option_a'),
                q_data.get('option_b'),
                q_data.get('option_c'),
                q_data.get('option_d'),
            ]
            extra = q_data.get('extra_options') or []
            # Keep options uncompressed to maintain correct indexes for labels 'abcd'
            all_options = options + extra
            self._create_quiz_question(
                quiz,
                q_data.get('question_text', ''),
                all_options,
                correct_labels=_normalize_correct_labels(
                    correct_options=q_data.get('correct_options'),
                    correct_option=q_data.get('correct_option', 'a'),
                ),
                allow_multiple=q_data.get('allow_multiple_correct', False)
            )

    def _extract_quiz_update_data(self, validated_data):
        """Helper to extract quiz fields from validated data."""
        return {
            'name': validated_data.get('quiz_name'),
            'timer': validated_data.get('quiz_timer_minutes'),
            'passing_percentage': validated_data.get('quiz_passing_percentage'),
            'text': validated_data.get('quiz_question_text'),
            'fixed': [
                validated_data.get('quiz_option_a'),
                validated_data.get('quiz_option_b'),
                validated_data.get('quiz_option_c'),
                validated_data.get('quiz_option_d'),
            ],
            'extra': validated_data.get('quiz_extra_options') or [],
            'questions': validated_data.get('questions_input') or [],
            'quizzes': validated_data.get('quizzes_input') or [],
            'labels': _normalize_correct_labels(
                correct_options=validated_data.get('quiz_correct_options'),
                correct_option=validated_data.get('quiz_correct_option', 'a'),
            ),
            'multiple': bool(validated_data.get('quiz_allow_multiple_correct')),
        }

    def _update_quiz(self, node, validated_data):
        self._delete_learning_material_and_task(node)
        qd = self._extract_quiz_update_data(validated_data)
        
        Quiz.objects.filter(node=node).delete()

        if qd['text'] or qd['questions']:
            self._create_single_quiz(
                node, qd['name'], qd['text'], qd['fixed'], qd['extra'],
                qd['labels'], qd['multiple'], qd['questions'],
                timer_minutes=qd['timer'],
                passing_percentage=qd['passing_percentage'],
            )

        for quiz_data in qd['quizzes']:
            self._create_single_quiz(
                node,
                quiz_data.get('name'),
                None, [], [],
                _normalize_correct_labels(),
                False,
                quiz_data.get('questions', []),
                timer_minutes=quiz_data.get('timer_minutes'),
                passing_percentage=quiz_data.get('passing_percentage'),
            )

        node.refresh_from_db()
        res_serializer = NodeSerializer(node)
        return Response({'message': 'Quizzes updated successfully.', 'data': res_serializer.data})


class PendingEvaluationsAPIView(APIView):
    permission_classes = [IsOrgAdminOrTeacher]

    @extend_schema(
        summary="List Pending Evaluations (or Quizzes)",
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by student name, email, task title, or quiz name'),
            OpenApiParameter(name='ordering', type=str, location=OpenApiParameter.QUERY, description='Field to order by (submitted_at, student__email)'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, description='Page number'),
            OpenApiParameter(name='type', type=str, location=OpenApiParameter.QUERY, description='Type: assessment or quiz'),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY, description='Status: pending or completed'),
            OpenApiParameter(name='student_id', type=str, location=OpenApiParameter.QUERY, description='Optionally filter by student user ID (UUID)'),
            OpenApiParameter(name='course_id', type=int, location=OpenApiParameter.QUERY, description='Optionally filter by course ID'),
        ]
    )
    def get(self, request, org_id):
        eval_type = request.query_params.get('type', 'assessment').lower()
        eval_status = request.query_params.get('status', 'pending').lower()
        search_query = request.query_params.get('search', '').strip()
        ordering = request.query_params.get('ordering', '-submitted_at')
        student_id = request.query_params.get('student_id')
        course_id = request.query_params.get('course_id')

        if eval_type == 'quiz':
            return self._get_quiz_submissions(request, org_id, eval_status, search_query, ordering, student_id, course_id)
        return self._get_assessment_submissions(request, org_id, eval_status, search_query, ordering, student_id, course_id)

    def _get_quiz_submissions(self, request, org_id, eval_status, search_query, ordering, student_id=None, course_id=None):
        if eval_status == 'completed':
            status_filter = {'status': 'Passed'}
        else:
            status_filter = {'status': 'Failed'}
            
        submissions = QuizSubmission.objects.filter(
            quiz__node__module__course__organization_id=org_id,
            **status_filter
        ).select_related('student', 'quiz', 'quiz__node', 'quiz__node__module')

        # Role-based restriction: Standard teachers (non-admins) can only see submissions for courses they teach
        is_admin = request.user.is_superuser or OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name='org_admin',
            is_active=True
        ).exists()
        if not is_admin:
            submissions = submissions.filter(quiz__node__module__course__teachers=request.user)

        if student_id:
            try:
                uuid.UUID(str(student_id))
                submissions = submissions.filter(student__user_id=student_id)
            except ValueError:
                pass

        if course_id:
            try:
                course_id = int(course_id)
                submissions = submissions.filter(quiz__node__module__course_id=course_id)
            except (TypeError, ValueError):
                pass

        if search_query:
            submissions = submissions.filter(
                Q(student__user__first_name__icontains=search_query) |
                Q(student__user__last_name__icontains=search_query) |
                Q(student__user__email__icontains=search_query) |
                Q(quiz__name__icontains=search_query) |
                Q(quiz__node__title__icontains=search_query)
            ).distinct()
            
        if ordering:
            submissions = submissions.order_by(ordering)
            
        paginator = pagination.PageNumberPagination()
        page = paginator.paginate_queryset(submissions, request)
        if page is not None:
            serializer = QuizSubmissionSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
            
        serializer = QuizSubmissionSerializer(submissions, many=True, context={'request': request})
        return Response(serializer.data)

    def _get_assessment_submissions(self, request, org_id, eval_status, search_query, ordering, student_id=None, course_id=None):
        if eval_status == 'completed':
            status_filter = {'status__in': ['Approved', 'Rejected', 'Graded']}
        else:
            status_filter = {'status__in': ['Pending', 'Needs Manual Review']}
            
        submissions = TaskSubmission.objects.filter(
            task__node__module__course__organization_id=org_id,
            **status_filter
        ).select_related('student', 'task', 'task__node', 'task__node__module')

        # Role-based restriction: Standard teachers (non-admins) can only see submissions for courses they teach
        is_admin = request.user.is_superuser or OrganizationMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name='org_admin',
            is_active=True
        ).exists()
        if not is_admin:
            submissions = submissions.filter(task__node__module__course__teachers=request.user)

        if student_id:
            try:
                uuid.UUID(str(student_id))
                submissions = submissions.filter(student__user_id=student_id)
            except ValueError:
                pass

        if course_id:
            try:
                course_id = int(course_id)
                submissions = submissions.filter(task__node__module__course_id=course_id)
            except (TypeError, ValueError):
                pass

        if search_query:
            submissions = submissions.filter(
                Q(student__user__first_name__icontains=search_query) |
                Q(student__user__last_name__icontains=search_query) |
                Q(student__user__email__icontains=search_query) |
                Q(task__node__title__icontains=search_query) |
                Q(task__title__icontains=search_query)
            ).distinct()
            
        if ordering:
            submissions = submissions.order_by(ordering)
            
        paginator = pagination.PageNumberPagination()
        page = paginator.paginate_queryset(submissions, request)
        if page is not None:
            serializer = TaskSubmissionSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
            
        serializer = TaskSubmissionSerializer(submissions, many=True, context={'request': request})
        return Response(serializer.data)


@extend_schema(tags=['Courses'])
class LearnerProgressAPIView(APIView):
    permission_classes = [IsOrgAdminOrTeacher]

    def _filter_teacher_enrollments(self, enrollments, member, org_id):
        assigned_course_ids = Course.objects.filter(
            organization_id=org_id,
            teachers=member.user
        ).values_list('id', flat=True)
        
        has_assigned_batches = False
        assigned_batch_ids = []
        
        if hasattr(member, 'batches') and member.batches.exists():
            has_assigned_batches = True
            assigned_batch_ids = list(member.batches.values_list('id', flat=True))
        elif getattr(member, 'batch_id', None):
            has_assigned_batches = True
            assigned_batch_ids = [member.batch_id]
        
        if has_assigned_batches:
            enrollments = enrollments.filter(batch_id__in=assigned_batch_ids)
            if assigned_course_ids.exists():
                enrollments = enrollments.filter(
                    models.Q(course_id__in=assigned_course_ids) |
                    models.Q(batch__courses__in=assigned_course_ids)
                )
        else:
            if assigned_course_ids.exists():
                enrollments = enrollments.filter(
                    models.Q(course_id__in=assigned_course_ids) |
                    models.Q(batch__courses__in=assigned_course_ids)
                )
            else:
                return enrollments.none()
        return enrollments.distinct()

    def _get_filtered_enrollments(self, org_id, teacher_id, course_id, search, batch_id=None):
        from organizations.models import BatchStudent, OrganizationMember
        
        enrollments = BatchStudent.objects.filter(
            batch__organization_id=org_id,
            is_active=True,
            student__is_deleted=False,
            student__is_active=True
        ).select_related('student', 'course').prefetch_related('batch__courses')
        
        try:
            member = OrganizationMember.objects.get(
                organization_id=org_id, 
                user_id=teacher_id,
                is_active=True,
                role__name__in=['org_admin', 'teacher']
            )
            # If the user is an org_admin looking at themselves, allow them to see everything 
            # (since org_admins manage the whole org and are rarely tied to single batches)
            if member.role.name != 'org_admin':
                enrollments = self._filter_teacher_enrollments(enrollments, member, org_id)
        except OrganizationMember.DoesNotExist:
            return enrollments.none()
        
        if batch_id:
            enrollments = enrollments.filter(batch_id=batch_id)
        if course_id:
            enrollments = enrollments.filter(batch__courses__id=course_id)
        if search:
            enrollments = enrollments.filter(
                models.Q(student__user__first_name__icontains=search) | 
                models.Q(student__user__last_name__icontains=search) |
                models.Q(student__user__email__icontains=search)
            )
        return enrollments

    def _get_enrollment_metrics(self, enrollment):
        student = enrollment.student
        course = enrollment.course
        
        # Metrics - Only count nodes that have actual interactive content (material, task, or quizzes)
        nodes_with_content = Node.objects.filter(module__course=course).filter(
            Q(learning_material__isnull=False) | 
            Q(task__isnull=False) | 
            Q(assessment__isnull=False) | 
            Q(quizzes__isnull=False)
        ).distinct()
        
        total_nodes = nodes_with_content.count()
        completed_nodes = StudentNodeProgress.objects.filter(
            student=student, 
            node__in=nodes_with_content, 
            status='Completed'
        ).count()
        
        completion_pct = int((completed_nodes / total_nodes) * 100) if total_nodes > 0 else 0
        
        # Last Activity
        last_task = TaskSubmission.objects.filter(
            student=student, task__node__module__course=course
        ).order_by('-submitted_at').values_list('submitted_at', flat=True).first()
        
        last_quiz = QuizSubmission.objects.filter(
            student=student, quiz__node__module__course=course
        ).order_by('-submitted_at').values_list('submitted_at', flat=True).first()
        
        last_progress = StudentNodeProgress.objects.filter(
            student=student, node__module__course=course
        ).order_by('-last_accessed').values_list('last_accessed', flat=True).first()
        
        dates = [d for d in [last_task, last_quiz, last_progress] if d]
        last_activity = max(dates) if dates else None
        
        # Pending Tasks count for "Provide feedback" logic
        pending_count = TaskSubmission.objects.filter(
            student=student, task__node__module__course=course, status='Pending'
        ).count()

        return {
            'learner_name': student.get_full_name() or student.email,
            'learner_email': student.email,
            'course_title': course.title,
            'completion_percentage': completion_pct,
            'modules_progress': f"{completed_nodes}/{total_nodes}",
            'last_activity': last_activity,
            'pending_tasks_count': pending_count,
            'student_id': getattr(student, 'user_id', getattr(student, 'id', None)),
            'course_id': course.id
        }

    @extend_schema(
        summary="Learner Progress Tracking",
        parameters=[
            OpenApiParameter(name='course_id', type=int, location=OpenApiParameter.QUERY, description='Filter by course ID'),
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by student name or email'),
            OpenApiParameter(name='teacher_id', type=str, required=True, location=OpenApiParameter.QUERY, description='REQUIRED: Filter by Teacher/Admin UUID to only return assigned students'),
            OpenApiParameter(name='ordering', type=str, location=OpenApiParameter.QUERY, description='Sort by learner_name, completion_percentage, or last_activity. Use "-" for descending.'),
        ],
        responses={200: LearnerProgressSerializer(many=True)}
    )
    def _get_teacher_assigned_courses(self, org_id, teacher_id):
        """Returns a set of course IDs assigned to the teacher, or None if the teacher is an org_admin."""
        from organizations.models import OrganizationMember
        try:
            member = OrganizationMember.objects.get(organization_id=org_id, user_id=teacher_id, is_active=True)
            if member.role.name != 'org_admin':
                 assigned = set(Course.objects.filter(organization_id=org_id, teachers=member.user).values_list('id', flat=True))
                 if hasattr(member, 'batches') and member.batches.exists():
                     batch_courses_ids = Course.objects.filter(batches__in=member.batches.all()).values_list('id', flat=True)
                     assigned.update(batch_courses_ids)
                 elif getattr(member, 'batch_id', None):
                     batch_courses_ids = Course.objects.filter(batches__id=member.batch_id).values_list('id', flat=True)
                     assigned.update(batch_courses_ids)
                 return assigned
        except OrganizationMember.DoesNotExist:
            pass
        return None

    def _generate_learner_metrics(self, enrollments, course_id_filter, assigned_course_filter):
        """Explodes enrollments into (student, course) pairs and calculates metrics."""
        from collections import namedtuple
        VirtualEnrollment = namedtuple('VirtualEnrollment', ['student', 'course'])
        
        results = []
        seen_pairs = set()

        for e in enrollments:
            batch_courses = e.batch.courses.all()
            
            if course_id_filter:
                try:
                    c_id = int(course_id_filter)
                    batch_courses = [c for c in batch_courses if c.id == c_id]
                except (ValueError, TypeError):
                    pass

            for course in batch_courses:
                if assigned_course_filter is not None and course.id not in assigned_course_filter:
                    continue

                pair = (e.student_id, course.id)
                if pair not in seen_pairs:
                    results.append(self._get_enrollment_metrics(VirtualEnrollment(student=e.student, course=course)))
                    seen_pairs.add(pair)
        return results

    def _sort_results(self, results, ordering):
        if not ordering:
            return

        import datetime
        reverse = False
        field = ordering
        if ordering.startswith('-'):
            reverse = True
            field = ordering[1:]

        def sort_key(x):
            val = x.get(field)
            # Normalize datetime to timestamp, None to a default, and leave int as is
            if val is None:
                return float('-inf') if reverse else float('inf')
            if isinstance(val, datetime.datetime):
                return val.timestamp()
            if isinstance(val, str):
                return val.lower()
            return val

        results.sort(key=sort_key, reverse=reverse)

    @extend_schema(
        summary="Learner Progress Tracking",
        parameters=[
            OpenApiParameter(name='course_id', type=int, location=OpenApiParameter.QUERY, description='Filter by course ID'),
            OpenApiParameter(name='batch_id', type=int, location=OpenApiParameter.QUERY, description='Filter by Batch ID'),
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by student name or email'),
            OpenApiParameter(name='teacher_id', type=str, required=True, location=OpenApiParameter.QUERY, description='REQUIRED: Filter by Teacher/Admin UUID to only return assigned students'),
            OpenApiParameter(name='ordering', type=str, location=OpenApiParameter.QUERY, description='Sort by learner_name, completion_percentage, or last_activity. Use "-" for descending.'),
        ],
        responses={200: LearnerProgressSerializer(many=True)}
    )
    def get(self, request, org_id):
        from rest_framework.exceptions import ValidationError
        
        course_id = request.query_params.get('course_id')
        batch_id = request.query_params.get('batch_id')
        search = request.query_params.get('search')
        teacher_id = request.query_params.get('teacher_id')

        if not teacher_id:
            raise ValidationError({"teacher_id": "This query parameter is required to fetch learner progress."})

        enrollments = self._get_filtered_enrollments(org_id, teacher_id, course_id, search, batch_id=batch_id)
        assigned_course_filter = self._get_teacher_assigned_courses(org_id, teacher_id)
        results = self._generate_learner_metrics(enrollments, course_id, assigned_course_filter)

        ordering = request.query_params.get('ordering', '-last_activity')
        self._sort_results(results, ordering)

        return Response(results)




@extend_schema(tags=['Courses'])
class ExportAllLearnersProgressAPIView(LearnerProgressAPIView):
    @extend_schema(
        summary="Export bulk learner progress to a multi-tab Excel file",
        parameters=[
            OpenApiParameter(name='course_id', type=int, location=OpenApiParameter.QUERY, description='Filter by course ID'),
            OpenApiParameter(name='batch_id', type=int, location=OpenApiParameter.QUERY, description='Filter by Batch ID'),
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, description='Search by student name or email'),
            OpenApiParameter(name='teacher_id', type=str, required=True, location=OpenApiParameter.QUERY, description='REQUIRED: Filter by Teacher/Admin UUID to only return assigned students'),
            OpenApiParameter(name='ordering', type=str, location=OpenApiParameter.QUERY, description='Sort by learner_name, completion_percentage, or last_activity. Use "-" for descending.'),
        ],
        responses={200: OpenApiParameter(name='file', type=OpenApiTypes.BINARY, location=OpenApiParameter.QUERY)}
    )
    def get(self, request, org_id):
        from rest_framework.exceptions import ValidationError
        from organizations.models import Organization
        from django.http import HttpResponse
        
        course_id = request.query_params.get('course_id')
        batch_id = request.query_params.get('batch_id')
        search = request.query_params.get('search')
        teacher_id = request.query_params.get('teacher_id')

        if not teacher_id:
            # Check if requesting user is org_admin or superuser to allow Org Admin export
            from organizations.models import OrganizationMember
            is_admin = request.user.is_superuser or OrganizationMember.objects.filter(
                organization_id=org_id, user=request.user, role__name='org_admin', is_active=True
            ).exists()
            if is_admin:
                teacher_id = str(request.user.id)
            else:
                raise ValidationError({"teacher_id": "This query parameter is required to fetch learner progress."})

        org = get_object_or_404(Organization, id=org_id)
        
        enrollments = self._get_filtered_enrollments(org_id, teacher_id, course_id, search, batch_id=batch_id)
        assigned_course_filter = self._get_teacher_assigned_courses(org_id, teacher_id)
        results = self._generate_learner_metrics(enrollments, course_id, assigned_course_filter)

        ordering = request.query_params.get('ordering', '-last_activity')
        self._sort_results(results, ordering)

        from .progress_export import generate_bulk_progress_excel
        excel_data = generate_bulk_progress_excel(results, org.name)

        response = HttpResponse(
            excel_data.getvalue(),
            content_type=EXCEL_CONTENT_TYPE
        )
        
        date_str = timezone.now().strftime('%Y-%m-%d')
        filename = f"learner_progress_{date_str}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response




@extend_schema(tags=['Courses'])
class NodeSubmissionDetailAPIView(APIView):
    permission_classes = [IsOrgAdminOrTeacher]

    @extend_schema(
        summary="Get Submissions for specific Node (Task/Quiz)",
        parameters=[
            OpenApiParameter("student_id", OpenApiTypes.UUID, OpenApiParameter.QUERY, required=True, description="The UUID of the student."),
            OpenApiParameter("course_id", OpenApiTypes.INT, OpenApiParameter.QUERY, required=True, description="The ID of the course."),
            OpenApiParameter("node_id", OpenApiTypes.INT, OpenApiParameter.QUERY, required=True, description="The ID of the node.")
        ],
        responses={200: serializers.DictField()}
    )
    def get(self, request, org_id):
        student_id = request.query_params.get('student_id')
        node_id = request.query_params.get('node_id')
        course_id = request.query_params.get('course_id')

        if not all([student_id, node_id, course_id]):
            return Response(
                {"detail": "student_id, node_id, and course_id query parameters are all required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        node = get_object_or_404(Node, id=node_id, module__course_id=course_id, module__course__organization_id=org_id)
        student = get_object_or_404(User, id=student_id)

        task_submissions = []
        if hasattr(node, 'task'):
            submissions = TaskSubmission.objects.filter(task=node.task, student=student).order_by('-submitted_at')
            task_submissions = TaskSubmissionSerializer(submissions, many=True, context={'request': request}).data

        quiz_submissions = []
        submissions = QuizSubmission.objects.filter(quiz__node=node, student=student).order_by('-submitted_at')
        quiz_submissions = QuizSubmissionSerializer(submissions, many=True, context={'request': request}).data

        return Response({
            "node_title": node.title,
            "task_submissions": task_submissions,
            "quiz_submissions": quiz_submissions
        })


@extend_schema(tags=['Courses'])
class AssignmentSubmissionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        node = get_object_or_404(Node, id=node_id)
        assessment = getattr(node, 'assessment', None)
        if not assessment:
            return Response({'detail': 'No assessment for node.'}, status=status.HTTP_404_NOT_FOUND)

        attempts = assessment.submissions.filter(student=request.user).count()
        if attempts >= assessment.max_attempts:
            return Response({'detail': 'Max attempts reached.'}, status=status.HTTP_403_FORBIDDEN)

        submission = AssignmentSubmission.objects.create(
            assessment=assessment,
            student=request.user,
            payload=request.data.get('payload', {}),
            status='Pending'
        )

        try:
            from .tasks import process_assignment_submission
            process_assignment_submission.delay(submission.id)
        except Exception:
            pass

        return Response({'detail': 'Submission accepted.'}, status=status.HTTP_202_ACCEPTED)


@extend_schema(tags=['Courses'])
class GradeSubmissionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="View specific Task Submission for grading",
        responses={200: TaskSubmissionSerializer}
    )
    def get(self, request, submission_id):
        submission = get_object_or_404(TaskSubmission, id=submission_id)
        serializer = TaskSubmissionSerializer(submission, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        summary="Grade Task Submission",
        request=inline_serializer(
            name='GradeSubmissionRequest',
            fields={
                'awarded_score': serializers.IntegerField(),
                'feedback': serializers.CharField(required=False)
            }
        ),
        responses={200: TaskSubmissionSerializer}
    )
    def patch(self, request, submission_id):
        submission = get_object_or_404(TaskSubmission, id=submission_id)
        awarded_score = request.data.get('awarded_score')
        if awarded_score is None:
            return Response({'detail': 'awarded_score is required.'}, status=status.HTTP_400_BAD_REQUEST)

        submission.awarded_score = awarded_score
        submission.feedback = request.data.get('feedback', submission.feedback)
        submission.status = 'Graded'
        submission.graded_at = timezone.now()
        submission.save()
        
        serializer = TaskSubmissionSerializer(submission, context={'request': request})
        return Response(serializer.data)


@extend_schema(tags=['Courses'])
class TeacherTaskReviewAPIView(APIView):
    permission_classes = [IsOrgAdminOrTeacher]

    @extend_schema(
        summary="Teacher: Approve/Reject Task Submission",
        description="Allows a teacher to provide a verdict (Approved/Rejected), a score, and feedback on a student submission.",
        request=TaskReviewSerializer,
        responses={200: TaskSubmissionSerializer}
    )
    def post(self, request, org_id, submission_id):
        submission = get_object_or_404(
            TaskSubmission,
            id=submission_id,
            task__node__module__course__organization_id=org_id
        )

        serializer = TaskReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        decision = data['decision'] # Approved or Rejected

        submission.status = decision
        if 'awarded_score' in data:
            submission.awarded_score = data['awarded_score']
        if 'feedback' in data:
            submission.feedback = data['feedback']

        submission.graded_at = timezone.now()
        submission.save()

        # If approved, check if we need to update node progress
        if decision == 'Approved':
            StudentNodeProgress.objects.update_or_create(
                student=submission.student,
                node=submission.task.node,
                defaults={'status': 'Completed'}
            )

        return Response(TaskSubmissionSerializer(submission, context={'request': request}).data)



@extend_schema(tags=['Courses'])
class RoadmapRetrieveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, org_id, course_id):
        # Lightweight prefetch — roadmap no longer returns full content in the list
        course = get_object_or_404(
            Course.objects.prefetch_related(
                'modules',
                'modules__chapters',
                'modules__nodes',
                'modules__nodes__chapter',
                'modules__nodes__learning_material',
                'modules__nodes__assessment',
                'modules__nodes__task',
                'modules__nodes__quizzes',
                Prefetch(
                    'modules__nodes__student_progress',
                    queryset=StudentNodeProgress.objects.filter(student__user=request.user)
                )
            ),
            id=course_id, organization_id=org_id
        )

        if not _student_has_active_course_access(request.user, course, org_id=org_id):
            return Response(
                {'detail': COURSE_ACCESS_DENIED},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Context required to serialize user's specific progress
        serializer = RoadmapCourseSerializer(course, context={'request': request})
        return Response(serializer.data)



@extend_schema(tags=['Courses'])
class CompleteNodeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_assessment_passed(self, node, user):
        if not hasattr(node, 'assessment'):
            return True
        assessment = node.assessment
        submissions = AssignmentSubmission.objects.filter(
            Q(student=user) | Q(student__user=user),
            assessment=assessment
        )
        for sub in submissions:
            passing_score = assessment.passing_score_percentage or 0
            if sub.status == 'Graded' and sub.awarded_score is not None and sub.awarded_score >= passing_score:
                return True
        return False

    def _check_task_approved(self, node, user):
        task = getattr(node, 'task', None)
        if task is None or task.is_deleted:
            return True
        return TaskSubmission.objects.filter(
            Q(student=user) | Q(student__user=user),
            task=task,
            status__in=['Approved', 'Graded']
        ).exists()

    def _check_quizzes_passed(self, node, user):
        for quiz in node.quizzes.all():
            passed = QuizSubmission.objects.filter(
                Q(student=user) | Q(student__user=user),
                quiz=quiz,
                status='Passed'
            ).exists()
            if not passed:
                return False
        return True

    def _unmet_requirement_detail(self, node, user):
        """Return an error message for the first requirement the student has not met, or None."""
        if not self._check_assessment_passed(node, user):
            return 'Cannot complete node with pending assessment.'
        if not self._check_task_approved(node, user):
            return 'Cannot complete node until the task submission is approved.'
        if not self._check_quizzes_passed(node, user):
            return 'Cannot complete node until all quizzes are passed.'
        return None

    def post(self, request, node_id):
        node = get_object_or_404(Node, id=node_id)

        error_response = _student_course_access_error_response(request.user, node.module.course, org_id=node.module.course.organization_id)
        if error_response is not None:
            return Response(error_response, status=status.HTTP_403_FORBIDDEN)

        unmet_detail = self._unmet_requirement_detail(node, request.user)
        if unmet_detail:
            return Response({'detail': unmet_detail}, status=status.HTTP_400_BAD_REQUEST)

        if StudentNodeProgress.objects.filter(
            Q(student=request.user) | Q(student__user=request.user),
            node=node,
            status='Completed'
        ).exists():
            return Response({'message': 'Node marked as completed.'})

        from organizations.models import OrganizationMember
        membership = OrganizationMember.objects.filter(
            user=request.user,
            organization=node.module.course.organization,
            is_active=True
        ).first()
        if not membership:
            return Response({'detail': 'Organization membership not found.'}, status=status.HTTP_400_BAD_REQUEST)

        progress, _ = StudentNodeProgress.objects.get_or_create(
            student=membership,
            node=node
        )
        progress.status = 'Completed'
        progress.save()

        return Response({'message': 'Node marked as completed.'})


@extend_schema(tags=['Courses'])
class TaskSubmissionAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        summary="Submit Task",
        request=TaskSubmissionSerializer,
        responses={201: TaskSubmissionSerializer}
    )
    def post(self, request, node_id):
        node = get_object_or_404(Node, id=node_id)
        if not _student_has_active_node_access(request.user, node, org_id=node.module.course.organization_id):
            return Response({'detail': COURSE_ACCESS_DENIED}, status=status.HTTP_403_FORBIDDEN)

        if not hasattr(node, 'task'):
            return Response({'error': ERROR_NODE_NO_TASK}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TaskSubmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(student=request.user, task=node.task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="List Task Submissions",
        responses={200: TaskSubmissionSerializer(many=True)}
    )
    def get(self, request, node_id):
        node = get_object_or_404(Node, id=node_id)
        if not _student_has_active_node_access(request.user, node, org_id=node.module.course.organization_id):
            return Response({'detail': COURSE_ACCESS_DENIED}, status=status.HTTP_403_FORBIDDEN)

        if not hasattr(node, 'task'):
            return Response({'error': ERROR_NODE_NO_TASK}, status=status.HTTP_400_BAD_REQUEST)

        submissions = TaskSubmission.objects.filter(task=node.task, student=request.user).order_by('-submitted_at')
        serializer = TaskSubmissionSerializer(submissions, many=True, context={'request': request})
        return Response(serializer.data)


@extend_schema(tags=['Courses'])
class StudentTaskResultAPIView(APIView):
    """
    View for students to see their own task results and if they can resubmit.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Student: Get latest task result",
        responses={200: StudentTaskResultSerializer}
    )
    def get(self, request, node_id):
        node = get_object_or_404(Node, id=node_id)
        if not _student_has_active_node_access(request.user, node, org_id=node.module.course.organization_id):
            return Response({'detail': COURSE_ACCESS_DENIED}, status=status.HTTP_403_FORBIDDEN)

        if not hasattr(node, 'task'):
            return Response({'error': ERROR_NODE_NO_TASK}, status=status.HTTP_400_BAD_REQUEST)

        submission = TaskSubmission.objects.filter(task=node.task, student=request.user).order_by('-submitted_at').first()
        if not submission:
            return Response({"detail": "No submission found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentTaskResultSerializer(submission, context={'request': request})
        return Response(serializer.data)



@extend_schema(tags=['Courses'])
class TeacherTaskSubmissionsAPIView(APIView):
    permission_classes = [IsOrgAdminOrTeacher]

    @extend_schema(
        summary="Teacher: List All Student Submissions for a Task",
        responses={200: TaskSubmissionSerializer(many=True)}
    )
    def get(self, request, node_id):
        node = get_object_or_404(Node, id=node_id)
        if not hasattr(node, 'task'):
            return Response({'error': ERROR_NODE_NO_TASK}, status=status.HTTP_400_BAD_REQUEST)
            
        submissions = TaskSubmission.objects.filter(task=node.task).select_related('student').order_by('-submitted_at')
        serializer = TaskSubmissionSerializer(submissions, many=True, context={'request': request})
        return Response(serializer.data)


@extend_schema(tags=['Courses'])
class QuizSubmissionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Submit Quiz",
        request=QuizSubmissionSerializer,
        responses={201: QuizSubmissionSerializer}
    )
    def post(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, id=quiz_id)
        error_response = _student_course_access_error_response(request.user, quiz.node.module.course, org_id=quiz.node.module.course.organization_id)
        if error_response is not None:
            return Response(error_response, status=status.HTTP_403_FORBIDDEN)

        serializer = QuizSubmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            submission = serializer.save(quiz=quiz)
            return Response(QuizSubmissionSerializer(submission, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
