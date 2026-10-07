# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import json
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator
from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers
from drf_spectacular.utils import PolymorphicProxySerializer
from accounts.models import User

INVALID_URL_ERROR = 'Enter a valid URL.'
DEFAULT_URL_SCHEME = 'https://'
FALLBACK_URL_SCHEME = 'http' + '://'

def _normalize_learning_material_url(url, has_file=False):
    if url is None:
        return None
    if isinstance(url, str):
        url = url.strip()
    if not url:
        return None

    validator = URLValidator()
    if has_file:
        try:
            validator(url)
            return url
        except DjangoValidationError:
            return None

    if '://' not in url:
        try:
            validator(DEFAULT_URL_SCHEME + url)
            url = DEFAULT_URL_SCHEME + url
        except DjangoValidationError:
            validator(FALLBACK_URL_SCHEME + url)
            url = FALLBACK_URL_SCHEME + url
    else:
        validator(url)
    return url
from organizations.models import Batch
from .models import (
    Course, Module, Node, LearningMaterial,
    StudentNodeProgress, Assessment,
    Task, Quiz, QuizQuestion, QuizOption,
    TaskSubmission, QuizSubmission, QuizAnswer,
)
from curriculum.utils import normalize_correct_labels

class NormalizeURLField(serializers.URLField):
    def to_internal_value(self, data):
        if isinstance(data, str):
            data = data.strip()
            if data and '://' not in data:
                data = DEFAULT_URL_SCHEME + data
        return super().to_internal_value(data)

class GlobalUserUUIDField(serializers.Field):
    def to_representation(self, value):
        if not value:
            return None
        user_obj = getattr(value, 'user', value)
        if hasattr(user_obj, 'id'):
            return str(user_obj.id)
        return str(value) if value else None

TIMER_HELP_TEXT = "Quiz timer in minutes. Leave empty for no timer."



class TeacherBasicSerializer(serializers.ModelSerializer):
    """
    Minimal user representation for course teacher assignment.
    """
    id = GlobalUserUUIDField(source='*', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

# ── MANAGEMENT SERIALIZERS ────────────────────────────────────────────────────

class CourseSerializer(serializers.ModelSerializer):
    batches = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.none(),
        many=True,
        required=False,
        write_only=True
    )
    batches_detail = serializers.SerializerMethodField(read_only=True)

    student_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'organization', 'title', 'description', 
            'thumbnail', 'status',
            'batches', 'batches_detail',
            'student_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['organization']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter batches queryset based on organization if context is available
        request = self.context.get('request')
        view = self.context.get('view')
        org_id = None
        if request and view:
            org_id = view.kwargs.get('org_id')
        
        # print(f"DEBUG: CourseSerializer init, org_id={org_id}, context_keys={list(self.context.keys())}")
        
        if org_id:
             from organizations.models import Batch
             self.fields['batches'].child_relation.queryset = Batch.objects.filter(organization_id=org_id)
        elif self.instance and isinstance(self.instance, Course):
             from organizations.models import Batch
             self.fields['batches'].child_relation.queryset = Batch.objects.filter(organization=self.instance.organization)
        else:
             from organizations.models import Batch
             self.fields['batches'].child_relation.queryset = Batch.objects.all()

    def get_student_count(self, obj):
        # Count unique students across all batches assigned to this course
        # Using distinct to ensure each student is counted only once even if enrolled in multiple batches
        from organizations.models import BatchStudent
        return BatchStudent.objects.filter(course=obj).values('student_id').distinct().count()

    def get_batches_detail(self, obj):
        from organizations.models import Batch
        batches = Batch.objects.filter(courses=obj)
        return [{"id": b.id, "name": b.name} for b in batches]

    def create(self, validated_data):
        batches = validated_data.pop('batches', [])
        course = super().create(validated_data)
        if batches:
            for batch in batches:
                batch.courses.add(course)
        return course

    def update(self, instance, validated_data):
        batches = validated_data.pop('batches', None)
        course = super().update(instance, validated_data)
        if batches is not None:
            # Clear this course from all batches and set new ones
            instance.batches.clear()
            if batches:
                for batch in batches:
                    batch.courses.add(course)
        return course


class EnrolledCourseSerializer(CourseSerializer):
    """
    Serializer for a student's enrolled course, including their completion percentage and batch completion deadline.
    """
    completion_percentage = serializers.SerializerMethodField()
    completion_deadline = serializers.SerializerMethodField()

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['completion_percentage', 'completion_deadline']

    def get_completion_deadline(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        if not user or not user.is_authenticated:
            return None
        from organizations.models import BatchStudent
        bs = BatchStudent.objects.filter(
            student=user,
            batch__courses=obj,
            is_active=True,
            is_deleted=False,
            batch__is_active=True,
            batch__is_deleted=False
        ).select_related('batch').first()
        if bs and bs.batch:
            return bs.batch.end_date
        return None

    def get_batches_detail(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        if not user or not user.is_authenticated:
            return []

        from organizations.models import Batch
        is_staff = user.is_superuser
        if not is_staff and request:
            from organizations.models import OrganizationMember
            view = self.context.get('view')
            org_id = view.kwargs.get('org_id') if view else None
            if not org_id:
                org_id = obj.organization_id
            
            is_staff = OrganizationMember.objects.filter(
                organization_id=org_id,
                user=user,
                role__name__in=["org_admin", "teacher"],
                is_active=True,
                is_deleted=False
            ).exists()

        if is_staff:
            batches = Batch.objects.filter(courses=obj, is_active=True, is_deleted=False).distinct()
        else:
            batches = Batch.objects.filter(
                courses=obj,
                students__student=user,
                students__is_active=True,
                students__is_deleted=False,
                is_active=True,
                is_deleted=False
            ).distinct()
        return [
            {
                "id": b.id,
                "name": b.name,
                "completion_deadline": b.end_date
            }
            for b in batches
        ]

    def get_completion_percentage(self, obj):
        user = self.context.get('request').user
        if not user or not user.is_authenticated:
            return 0
            
        # Only count nodes that have actual interactive content (material, task, assessment, or quizzes)
        nodes_with_content = Node.objects.filter(module__course=obj).filter(
            Q(learning_material__isnull=False) | 
            Q(task__isnull=False) | 
            Q(assessment__isnull=False) | 
            Q(quizzes__isnull=False)
        ).distinct()
        
        total_nodes = nodes_with_content.count()
        completed_nodes = StudentNodeProgress.objects.filter(
            Q(student=user) | Q(student__user=user),
            node__in=nodes_with_content,
            status='Completed'
        ).values('node_id').distinct().count()
        
        return int((completed_nodes / total_nodes) * 100) if total_nodes > 0 else 0

class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = [
            'id', 'assignment_type', 'prompt', 'max_attempts', 'passing_score_percentage',
        ]

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'description', 'sequence_order', 'created_at', 'updated_at']
        read_only_fields = ['course']

class LearningMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningMaterial
        fields = ['id', 'node', 'content_type', 'content_url', 'created_at', 'updated_at']
        read_only_fields = ['node']

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'node', 'title', 'description', 'attachment', 'allow_link', 'allow_paragraph', 'allow_pdf', 'allow_screenshot', 'allow_code_block', 'allow_file', 'created_at', 'updated_at']
        read_only_fields = ['node']

class QuizOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizOption
        fields = ['id', 'option_text', 'is_correct']

class QuizQuestionSelectedOptionsMixin:
    def get_selected_options(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []

        submission = obj.quiz.submissions.filter(student=request.user).order_by('-submitted_at').first()
        if not submission or not submission.raw_answers_data:
            return []

        answer = next((a for a in submission.raw_answers_data if a.get('question') == obj.id), None)
        if not answer:
            return []

        selected = answer.get('selected_options', [])
        if not selected and answer.get('selected_option'):
            return [answer.get('selected_option')]
        return selected


class QuizQuestionSerializer(QuizQuestionSelectedOptionsMixin, serializers.ModelSerializer):
    options = QuizOptionSerializer(many=True)
    selected_options = serializers.SerializerMethodField()

    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'allow_multiple_correct', 'options', 'selected_options']


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'node', 'name', 'timer_minutes', 'questions', 'created_at', 'updated_at']
        read_only_fields = ['node']

# --- STUDENT QUIZ SERIALIZERS (Hides is_correct) ---

class StudentQuizOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizOption
        fields = ['id', 'option_text']

class StudentQuizQuestionSerializer(QuizQuestionSelectedOptionsMixin, serializers.ModelSerializer):
    options = StudentQuizOptionSerializer(many=True, read_only=True)
    selected_options = serializers.SerializerMethodField()

    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'allow_multiple_correct', 'options', 'selected_options']

class StudentQuizSerializer(serializers.ModelSerializer):
    questions = StudentQuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'name', 'timer_minutes', 'questions']


class RoadmapQuizSerializer(serializers.ModelSerializer):
    questions = StudentQuizQuestionSerializer(many=True, read_only=True)
    timer_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'name', 'timer_minutes', 'questions']


class RoadmapQuizWithAnswersSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    timer_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'name', 'timer_minutes', 'questions']

# ── QUIZ INPUT STRUCTURES (For Interactive Swagger Buttons) ─────────────────

class QuizQuestionInputSerializer(serializers.Serializer):
    question_text = serializers.CharField()
    option_a = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    option_b = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    option_c = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    option_d = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    extra_options = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False,
        help_text="Click 'Add item' for extra options (e, f...)"
    )
    correct_option = serializers.CharField(
        required=False,
        help_text="Type 'a', 'b', 'c', 'd' or index for extra"
    )
    correct_options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        help_text="Provide multiple labels for multi-answer questions.",
    )
    allow_multiple_correct = serializers.BooleanField(required=False, default=False)

    def to_internal_value(self, data):
        # Convert QueryDict to a regular dict to ensure nested lists are preserved
        if hasattr(data, 'dict'):
            data = data.dict()

        if isinstance(data, dict):
            mutable_data = data.copy()
            extra = mutable_data.get('extra_options')
            if isinstance(extra, str) and extra.strip().startswith('['):
                try:
                    mutable_data['extra_options'] = json.loads(extra)
                except (ValueError, TypeError):
                    pass
            correct_options = mutable_data.get('correct_options')
            if isinstance(correct_options, str) and correct_options.strip().startswith('['):
                try:
                    mutable_data['correct_options'] = json.loads(correct_options)
                except (ValueError, TypeError):
                    pass
            data = mutable_data
        return super().to_internal_value(data)

class QuizInputSerializer(serializers.Serializer):
    name = serializers.CharField(help_text="Quiz Title")
    timer_minutes = serializers.IntegerField(required=False, allow_null=True, help_text=TIMER_HELP_TEXT)
    questions = QuizQuestionInputSerializer(many=True)

class NodeSerializer(serializers.ModelSerializer):
    # Flattened WRITE fields for LearningMaterial (multipart/form-data friendly)
    learning_material_content_type = serializers.ChoiceField(
        choices=LearningMaterial.CONTENT_TYPE_CHOICES, 
        required=False,
        write_only=True,
        help_text="Type of content"
    )
    learning_material_content_url = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        write_only=True,
        help_text="URL for external content like videos or files stored in S3."
    )

    # Flattened Task WRITE fields
    task_title = serializers.CharField(required=False, write_only=True)
    task_allow_link = serializers.BooleanField(required=False, write_only=True)
    task_allow_paragraph = serializers.BooleanField(required=False, write_only=True)
    task_allow_pdf = serializers.BooleanField(required=False, write_only=True)
    task_allow_screenshot = serializers.BooleanField(required=False, write_only=True)
    task_allow_code_block = serializers.BooleanField(required=False, write_only=True)
    task_allow_file = serializers.BooleanField(required=False, write_only=True)
    task_description = serializers.CharField(required=False, write_only=True, allow_blank=True, help_text="Optional instructions for the task.")
    task_attachment = serializers.FileField(required=False, write_only=True, allow_null=True, help_text="Upload an attachment for the task.")

    # Quiz WRITE fields (Flattened - NO JSON - for single question)
    quiz_name = serializers.CharField(required=False, write_only=True)
    quiz_timer_minutes = serializers.IntegerField(required=False, allow_null=True, write_only=True, help_text=TIMER_HELP_TEXT)
    quiz_question_text = serializers.CharField(required=False, write_only=True, allow_blank=True)
    quiz_option_a = serializers.CharField(required=False, write_only=True, allow_blank=True)
    quiz_option_b = serializers.CharField(required=False, write_only=True, allow_blank=True)
    quiz_option_c = serializers.CharField(required=False, write_only=True, allow_blank=True)
    quiz_option_d = serializers.CharField(required=False, write_only=True, allow_blank=True)
    quiz_extra_options = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False,
        allow_null=True,
        write_only=True,
        help_text="Click 'Add item' to add more options (e, f...)"
    )
    quiz_correct_option = serializers.CharField(
        required=False,
        write_only=True,
        help_text="Type 'a', 'b', 'c', 'd' or 'e', 'f'..."
    )
    quiz_correct_options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        write_only=True,
        help_text="Provide multiple correct labels for multi-answer quizzes.",
    )
    quiz_allow_multiple_correct = serializers.BooleanField(
        required=False,
        write_only=True,
        default=False,
        help_text="Set to true when the flat quiz question allows multiple correct answers.",
    )

   
    questions_input = QuizQuestionInputSerializer(many=True, required=False, allow_null=True, write_only=True)

    
    quizzes_input = QuizInputSerializer(many=True, required=False, allow_null=True, write_only=True)

    
    learning_material = LearningMaterialSerializer(read_only=True)
    task = TaskSerializer(read_only=True)
    quizzes = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    def get_type(self, obj):
        has_material = bool(getattr(obj, 'learning_material', None))
        has_task = bool(getattr(obj, 'task', None))

        quizzes = getattr(obj, 'quizzes', None)
        has_quiz = False
        if quizzes:
            all_quizzes = quizzes.all() if hasattr(quizzes, 'all') else quizzes
            has_quiz = len(all_quizzes) > 0

        if has_material or has_task or has_quiz:
            return 'item'
        return 'chapter'

    def get_quizzes(self, obj):
        user = self._get_request_user()
        is_staff = self._is_staff_user(user, obj)
        serialized_quizzes = []

        for quiz in obj.quizzes.all():
            serialized_quizzes.append(self._serialize_quiz_for_user(quiz, user, is_staff))

        return serialized_quizzes

    def _get_request_user(self):
        request = self.context.get('request') if self.context else None
        user = getattr(request, 'user', None) if request else None
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        return user

    def _is_staff_user(self, user, obj):
        if not user:
            return False
        if user.is_superuser:
            return True

        org_id = obj.module.course.organization_id
        from organizations.models import OrganizationMember
        return OrganizationMember.objects.filter(
            user=user,
            organization_id=org_id,
            role__name__in=['org_admin', 'teacher'],
            is_active=True
        ).exists()

    def _user_passed_quiz(self, user, quiz):
        if not user:
            return False
        return QuizSubmission.objects.filter(student=user, quiz=quiz, passed=True).exists()

    def _serialize_quiz_for_user(self, quiz, user, is_staff):
        if is_staff or self._user_passed_quiz(user, quiz):
            return QuizSerializer(quiz, context=self.context).data
        return StudentQuizSerializer(quiz, context=self.context).data

    def _parse_list_field(self, value):
        """Parse a JSON string into a Python object."""
        if isinstance(value, list) and len(value) == 1 and isinstance(value[0], str):
            value = value[0]
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith(('[', '{')):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, dict):
                        return [parsed]
                    return parsed
                except (ValueError, TypeError):
                    pass
        return value

    def _parse_nested_fields(self, data, is_querydict=False):
        """Parse nested input fields like questions_input and quizzes_input."""
        if is_querydict:
            target = data.dict()
            target['questions_input'] = self._parse_list_field(data.getlist('questions_input'))
            # Special handling for potentially multi-value fields in querydict
            for field in ['quiz_extra_options', 'quiz_correct_options']:
                target[field] = self._parse_list_field(data.getlist(field) or data.get(field))
            target['quizzes_input'] = self._parse_list_field(data.getlist('quizzes_input'))
            return target
        
        target = data.copy()
        for field in ['questions_input', 'quiz_extra_options', 'quiz_correct_options', 'quizzes_input']:
            target[field] = self._parse_list_field(target.get(field))
        return target

    def to_internal_value(self, data):
        # Handle QueryDict (multipart/form-data) or dict
        if hasattr(data, 'getlist'):
            data = self._parse_nested_fields(data, is_querydict=True)
        elif isinstance(data, dict):
            data = self._parse_nested_fields(data, is_querydict=False)

        # Handle prerequisite_node_id compatibility from frontend API calls
        if isinstance(data, dict):
            if 'prerequisite_node_id' in data and 'prerequisite_node' not in data:
                data['prerequisite_node'] = data['prerequisite_node_id']

            # Normalize content_type choices to match case-sensitive Choices in backend
            for key in ['learning_material_content_type', 'content_type']:
                val = data.get(key)
                if isinstance(val, str):
                    val_lower = val.strip().lower()
                    mapping = {
                        'video': 'Video',
                        'pdf': 'PDF',
                        'doc': 'Doc',
                        'link': 'Link'
                    }
                    if val_lower in mapping:
                        data[key] = mapping[val_lower]

        return super().to_internal_value(data)

    def _create_learning_material(self, node, lm_type, lm_url):
        if not lm_type:
            return
        LearningMaterial.objects.create(
            node=node,
            content_type=lm_type,
            content_url=lm_url,
        )

    def _create_task(self, node, task_title, task_fmt):
        if not task_title:
            return
        Task.objects.create(node=node, title=task_title, **task_fmt)

    def _create_quiz_question(self, quiz, question_text, options, correct_labels=None, allow_multiple=False):
        question = QuizQuestion.objects.create(
            quiz=quiz,
            question_text=question_text,
            allow_multiple_correct=allow_multiple,
        )
        labels = "abcdefghijklmnopqrstuvwxyz"

        # Ensure correct_label is cleaned for matching
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

    def _create_quiz(self, node, quiz_name, quiz_q_text, q_options_fixed, q_options_extra, quiz_correct_labels, quiz_allow_multiple, questions_input, timer_minutes=None):
        if not quiz_q_text and not questions_input:
            return

        quiz = Quiz.objects.create(
            node=node,
            name=quiz_name or 'Lesson Quiz',
            timer_minutes=timer_minutes,
        )

        if quiz_q_text:
            # Note: q_options_fixed is [a, b, c, d]. We keep it uncompressed to maintain correct indexes for labels 'abcd'
            q_options_extra = q_options_extra or []
            all_options = list(q_options_fixed) + q_options_extra
            self._create_quiz_question(
                quiz,
                quiz_q_text,
                all_options,
                correct_labels=quiz_correct_labels,
                allow_multiple=quiz_allow_multiple,
            )

        questions_input = questions_input or []
        for q_d in questions_input:
            options = [
                q_d.get('option_a'),
                q_d.get('option_b'),
                q_d.get('option_c'),
                q_d.get('option_d'),
            ]
            extra = q_d.get('extra_options') or []
            # Keep options uncompressed to maintain correct indexes for labels 'abcd'
            full_options = options + extra
            self._create_quiz_question(
                quiz,
                q_d.get('question_text', ''),
                full_options,
                normalize_correct_labels(
                    correct_options=q_d.get('correct_options'),
                    correct_option=q_d.get('correct_option', 'a'),
                ),
                allow_multiple=q_d.get('allow_multiple_correct', False)
            )

    def _prepare_quiz_payload(self, validated_data):
        fixed_options = [
            validated_data.pop('quiz_option_a', None),
            validated_data.pop('quiz_option_b', None),
            validated_data.pop('quiz_option_c', None),
            validated_data.pop('quiz_option_d', None),
        ]
        return {
            'quiz_name': validated_data.pop('quiz_name', None),
            'quiz_timer_minutes': validated_data.pop('quiz_timer_minutes', None),
            'quiz_question_text': validated_data.pop('quiz_question_text', None),
            'fixed_options': fixed_options,
            'extra_options': validated_data.pop('quiz_extra_options', []) or [],
            'correct_option': validated_data.pop('quiz_correct_option', 'a'),
            'correct_options': validated_data.pop('quiz_correct_options', []),
            'allow_multiple_correct': validated_data.pop('quiz_allow_multiple_correct', False),
            'questions_input': validated_data.pop('questions_input', []),
            'quizzes_input': validated_data.pop('quizzes_input', None) or [],
        }

    def _build_quizzes(self, node, payload):
        has_flat = bool(payload['quiz_question_text']) or bool(payload['questions_input'])
        extra_quizzes = payload['quizzes_input']
        if not has_flat and not extra_quizzes:
            return

        Quiz.objects.filter(node=node).delete()

        if has_flat:
            self._create_quiz(
                node,
                payload['quiz_name'],
                payload['quiz_question_text'],
                payload['fixed_options'],
                payload['extra_options'],
                normalize_correct_labels(
                    correct_options=payload['correct_options'],
                    correct_option=payload['correct_option'],
                ),
                payload['allow_multiple_correct'],
                payload['questions_input'],
                timer_minutes=payload['quiz_timer_minutes'],
            )

        for quiz_data in extra_quizzes:
            self._create_quiz(
                node,
                quiz_data.get('name'),
                None, [], [],
                normalize_correct_labels(),
                False,
                quiz_data.get('questions', []),
                timer_minutes=quiz_data.get('timer_minutes'),
            )

    def _validate_learning_material_url(self, data):
        lm_url = data.get('learning_material_content_url')
        if not lm_url:
            return data

        validator = URLValidator()
        try:
            if '://' not in lm_url:
                lm_url = DEFAULT_URL_SCHEME + lm_url.strip()
            validator(lm_url)
            data['learning_material_content_url'] = lm_url
        except DjangoValidationError:
            raise serializers.ValidationError({'learning_material_content_url': INVALID_URL_ERROR})
        return data

    def validate(self, data):
        try:
            data['learning_material_content_url'] = _normalize_learning_material_url(
                data.get('learning_material_content_url'),
                has_file=False
            )
        except DjangoValidationError:
            raise serializers.ValidationError({'learning_material_content_url': INVALID_URL_ERROR})
        return data

    def create(self, validated_data):
        lm_type = validated_data.pop('learning_material_content_type', None)
        lm_url = validated_data.pop('learning_material_content_url', None)

        task_title = validated_data.pop('task_title', None)
        task_fmt = {
            'allow_link': validated_data.pop('task_allow_link', False),
            'allow_paragraph': validated_data.pop('task_allow_paragraph', False),
            'allow_pdf': validated_data.pop('task_allow_pdf', False),
            'allow_screenshot': validated_data.pop('task_allow_screenshot', False),
            'allow_code_block': validated_data.pop('task_allow_code_block', False),
            'allow_file': validated_data.pop('task_allow_file', False),
            'description': validated_data.pop('task_description', ''),
            'attachment': validated_data.pop('task_attachment', None),
        }

        quiz_payload = self._prepare_quiz_payload(validated_data)

        node = Node.objects.create(**validated_data)
        self._create_learning_material(node, lm_type, lm_url)
        self._create_task(node, task_title, task_fmt)
        self._build_quizzes(node, quiz_payload)

        return node

    def _pop_lm_data(self, validated_data):
        lm_type = validated_data.pop('learning_material_content_type', None)
        lm_data = {}
        if lm_type:
            lm_data['content_type'] = lm_type
        
        val = validated_data.pop('learning_material_content_url', None)
        if val is not None:
            lm_data['content_url'] = val
        return lm_data, lm_type

    def _pop_task_data(self, validated_data):
        task_title = validated_data.pop('task_title', None)
        task_data = {}
        for field, key in [
            ('task_allow_link', 'allow_link'),
            ('task_allow_paragraph', 'allow_paragraph'),
            ('task_allow_pdf', 'allow_pdf'),
            ('task_allow_screenshot', 'allow_screenshot'),
            ('task_allow_code_block', 'allow_code_block'),
            ('task_allow_file', 'allow_file'),
            ('task_description', 'description'),
            ('task_attachment', 'attachment'),
        ]:
            val = validated_data.pop(field, None)
            if val is not None:
                task_data[key] = val
        return task_data, task_title

    def _update_learning_material(self, instance, lm_data, lm_type):
        if not lm_data:
            return
        
        lm_instance = getattr(instance, 'learning_material', None)
        if lm_instance:
            for attr, value in lm_data.items():
                setattr(lm_instance, attr, value)
            lm_instance.save()
        elif lm_type:
            LearningMaterial.objects.create(node=instance, **lm_data)

    def _update_task(self, instance, task_data, task_title):
        if not (task_title or task_data):
            return
            
        task_instance = getattr(instance, 'task', None)
        if task_instance:
            if task_title:
                task_instance.title = task_title
            for attr, value in task_data.items():
                setattr(task_instance, attr, value)
            task_instance.save()
        elif task_title:
            Task.objects.create(node=instance, title=task_title, **task_data)

    def update(self, instance, validated_data):
        # 1. Extract flattened data
        lm_data, lm_type = self._pop_lm_data(validated_data)
        task_data, task_title = self._pop_task_data(validated_data)
        quiz_payload = self._prepare_quiz_payload(validated_data)

        # 2. Update node fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. Handle related models
        self._update_learning_material(instance, lm_data, lm_type)
        self._update_task(instance, task_data, task_title)
        self._build_quizzes(instance, quiz_payload)

        return instance

    class Meta:
        model = Node
        fields = [
            'id', 'module', 'title', 'description', 'sequence_order', 'prerequisite_node', 
            'focus_areas', 'quick_outline',
            # write-only inputs
            'learning_material_content_type', 'learning_material_content_url',
            'task_title', 'task_allow_link', 'task_allow_paragraph', 'task_allow_pdf',
            'task_allow_screenshot', 'task_allow_code_block', 'task_allow_file',
            'task_description', 'task_attachment',
            'quiz_name', 'quiz_timer_minutes', 'quiz_question_text', 'quiz_option_a', 'quiz_option_b',
            'quiz_option_c', 'quiz_option_d', 'quiz_extra_options', 'quiz_correct_option',
            'quiz_correct_options', 'quiz_allow_multiple_correct',
            'questions_input', 'quizzes_input',
            # read-only nested outputs
            'type', 'learning_material', 'task', 'quizzes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['module']

    # duplicate create removed; using earlier create to reduce complexity.


# Content update serializer handles either material or assessment
# Flat structure to support multipart/form-data (file uploads) in Swagger
class NodeContentUpdateSerializer(serializers.Serializer):
    content_type = serializers.ChoiceField(choices=['LearningMaterial', 'Task', 'Quiz'])
    
    def to_internal_value(self, data):
        if isinstance(data, dict):
            # Normalize content_type choices to match case-sensitive Choices in backend
            for key in ['learning_material_content_type', 'content_type']:
                val = data.get(key)
                if isinstance(val, str):
                    val_lower = val.strip().lower()
                    mapping = {
                        'video': 'Video',
                        'pdf': 'PDF',
                        'doc': 'Doc',
                        'link': 'Link'
                    }
                    if val_lower in mapping:
                        if hasattr(data, 'copy'):
                            data = data.copy()
                        data[key] = mapping[val_lower]
        return super().to_internal_value(data)
    
    # Material fields
    learning_material_content_type = serializers.ChoiceField(choices=LearningMaterial.CONTENT_TYPE_CHOICES, required=False)
    learning_material_content_url = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, data):
        try:
            data['learning_material_content_url'] = _normalize_learning_material_url(
                data.get('learning_material_content_url'),
                has_file=False
            )
        except DjangoValidationError:
            raise serializers.ValidationError({'learning_material_content_url': INVALID_URL_ERROR})
        return data


    # Task fields
    task_title = serializers.CharField(required=False)
    task_allow_link = serializers.BooleanField(required=False)
    task_allow_paragraph = serializers.BooleanField(required=False)
    task_allow_pdf = serializers.BooleanField(required=False)
    task_allow_screenshot = serializers.BooleanField(required=False)
    task_allow_code_block = serializers.BooleanField(required=False)
    task_allow_file = serializers.BooleanField(required=False)

    # Quiz fields
    quiz_name = serializers.CharField(required=False)
    quiz_timer_minutes = serializers.IntegerField(required=False, allow_null=True, help_text=TIMER_HELP_TEXT)
    quiz_question_text = serializers.CharField(required=False, allow_blank=True)
    quiz_option_a = serializers.CharField(required=False, allow_blank=True)
    quiz_option_b = serializers.CharField(required=False, allow_blank=True)
    quiz_option_c = serializers.CharField(required=False, allow_blank=True)
    quiz_option_d = serializers.CharField(required=False, allow_blank=True)
    quiz_extra_options = serializers.ListField(child=serializers.CharField(allow_blank=True), required=False, allow_null=True)
    quiz_correct_option = serializers.CharField(required=False)
    quiz_correct_options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        help_text="Multiple correct labels for multi-answer quizzes."
    )
    quiz_allow_multiple_correct = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Set to true when the flat quiz question allows multiple correct answers."
    )
    questions_input = QuizQuestionInputSerializer(many=True, required=False, allow_null=True)
    quizzes_input = QuizInputSerializer(many=True, required=False, allow_null=True)

    def _parse_json_field(self, value):
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith(('[', '{')):
                try:
                    parsed = json.loads(stripped)
                except (ValueError, TypeError):
                    return value
                if isinstance(parsed, dict):
                    return [parsed]
                return parsed
        return value

    def to_internal_value(self, data):
        # Convert QueryDict to a regular dict
        if hasattr(data, 'dict'):
            data = data.dict()

        if isinstance(data, dict):
            mutable_data = data.copy()
            mutable_data['questions_input'] = self._parse_json_field(mutable_data.get('questions_input'))
            mutable_data['quiz_extra_options'] = self._parse_json_field(mutable_data.get('quiz_extra_options'))
            mutable_data['quiz_correct_options'] = self._parse_json_field(mutable_data.get('quiz_correct_options'))
            mutable_data['quizzes_input'] = self._parse_json_field(mutable_data.get('quizzes_input'))
            data = mutable_data

        return super().to_internal_value(data)

# ── STUDENT CONSUMPTION (ROADMAP NESTED VIEW) ─────────────────────────────────





class NodeProgressSerializer(serializers.ModelSerializer):
    quiz_score = serializers.SerializerMethodField()

    class Meta:
        model = StudentNodeProgress
        fields = ['status', 'last_accessed', 'quiz_score']

    def get_quiz_score(self, obj):
        # obj is StudentNodeProgress
        submission = QuizSubmission.objects.filter(
            quiz__node=obj.node,
            student=obj.student
        ).order_by('-score').first()
        return submission.score if submission else None


class RoadmapNodeSerializer(serializers.ModelSerializer):
    """
    Lightweight node serializer for the roadmap list — used by ALL roles.
    Returns only metadata and boolean summary flags for EVERY node.
    Full content (files, quiz questions, task details) is intentionally omitted here;
    users fetch it by calling the NodeDetail endpoint for the specific node they click.

    For students: `is_accessible` indicates whether the node is unlocked for them.
    """
    progress = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    quizzes = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    # Content summary flags — tells the frontend what content type is available
    has_learning_material = serializers.SerializerMethodField()
    has_task = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()
    has_assessment = serializers.SerializerMethodField()
    # For students: indicates if this node's content can be viewed right now
    is_accessible = serializers.SerializerMethodField()

    class Meta:
        model = Node
        fields = [
            'id', 'module', 'title', 'description', 'sequence_order', 'prerequisite_node',
            'focus_areas', 'quick_outline', 'type',
            'has_learning_material', 'has_task', 'has_quiz', 'has_assessment',
            'quizzes', 'progress', 'is_completed', 'is_accessible',
        ]

    def get_type(self, obj):
        has_material = bool(getattr(obj, 'learning_material', None))
        has_task = bool(getattr(obj, 'task', None))

        quizzes = getattr(obj, 'quizzes', None)
        has_quiz = False
        if quizzes:
            all_quizzes = quizzes.all() if hasattr(quizzes, 'all') else quizzes
            has_quiz = len(all_quizzes) > 0

        if has_material or has_task or has_quiz:
            return 'item'
        return 'chapter'

    def _get_user(self):
        return self.context.get('request').user if self.context and 'request' in self.context else None

    def _get_user_progress(self, obj):
        user = self._get_user()
        if user and user.is_authenticated:
            return obj.student_progress.filter(student=user).first()
        return None

    def get_progress(self, obj):
        progress = self._get_user_progress(obj)
        if progress:
            return NodeProgressSerializer(progress).data
        return None

    def get_quizzes(self, obj):
        user = self._get_user()
        org_id = obj.module.course.organization_id
        
        is_staff = False
        if user and user.is_authenticated:
            if user.is_superuser:
                is_staff = True
            else:
                from organizations.models import OrganizationMember
                is_staff = OrganizationMember.objects.filter(
                    user=user,
                    organization_id=org_id,
                    role__name__in=['org_admin', 'teacher'],
                    is_active=True
                ).exists()

        quizzes = obj.quizzes.all().order_by('id')
        serialized_quizzes = []
        for quiz in quizzes:
            has_submitted = False
            if user and user.is_authenticated:
                has_submitted = QuizSubmission.objects.filter(student=user, quiz=quiz).exists()
            
            if is_staff or has_submitted:
                serialized_quizzes.append(RoadmapQuizWithAnswersSerializer(quiz, context=self.context).data)
            else:
                serialized_quizzes.append(RoadmapQuizSerializer(quiz, context=self.context).data)
        return serialized_quizzes

    def get_is_completed(self, obj):
        progress = self._get_user_progress(obj)
        return bool(progress and progress.status == 'Completed')

    def get_has_learning_material(self, obj):
        return hasattr(obj, 'learning_material') and obj.learning_material is not None

    def get_has_task(self, obj):
        return hasattr(obj, 'task') and obj.task is not None

    def get_has_quiz(self, obj):
        return obj.quizzes.exists()

    def get_has_assessment(self, obj):
        return hasattr(obj, 'assessment') and obj.assessment is not None

    def get_is_accessible(self, obj):
        """Returns True if this node's content should be viewable by the requesting user.
        Uses request-level cache if populated, else falls back to database queries.
        """
        request = self.context.get('request') if self.context else None
        if request and hasattr(request, '_roadmap_node_accessible'):
            return request._roadmap_node_accessible.get(obj.id, False)

        user = self._get_user()
        if not user or not user.is_authenticated:
            return False

        from curriculum.views import _student_can_access_node
        return _student_can_access_node(user, obj, request=request)


class RoadmapModuleSerializer(serializers.ModelSerializer):
    nodes = serializers.SerializerMethodField()
    is_accessible = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'sequence_order', 'nodes', 'is_accessible']

    def get_nodes(self, obj):
        filtered_nodes = []
        for n in obj.nodes.all():
            has_learning = getattr(n, 'learning_material', None) is not None
            has_task = getattr(n, 'task', None) is not None
            has_assessment = getattr(n, 'assessment', None) is not None
            has_quiz = len(n.quizzes.all()) > 0
            if has_learning or has_task or has_assessment or has_quiz:
                filtered_nodes.append(n)
        return RoadmapNodeSerializer(filtered_nodes, many=True, context=self.context).data

    def get_is_accessible(self, obj):
        request = self.context.get('request') if self.context else None
        if request and hasattr(request, '_roadmap_module_accessible'):
            return request._roadmap_module_accessible.get(obj.id, False)

        user = request.user if request and request.user and request.user.is_authenticated else None
        if not user:
            return False

        from curriculum.views import _student_can_access_module
        return _student_can_access_module(user, obj, request=request)


class RoadmapCourseSerializer(serializers.ModelSerializer):
    modules = RoadmapModuleSerializer(many=True, read_only=True)
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'thumbnail', 'status', 'is_completed', 'modules']

    def to_representation(self, instance):
        request = self.context.get('request') if self.context else None
        if request and request.user and request.user.is_authenticated:
            user = request.user
            is_staff = self._is_staff(user, instance.organization)

            module_accessible = {}
            node_accessible = {}

            if is_staff:
                self._fill_staff_accessibility(instance, module_accessible, node_accessible)
            else:
                self._fill_student_accessibility(instance, module_accessible, node_accessible)

            # Store computed accessibility dicts on the request object
            request._roadmap_module_accessible = module_accessible
            request._roadmap_node_accessible = node_accessible

        return super().to_representation(instance)

    def _is_staff(self, user, organization):
        if user.is_superuser:
            return True

        # If the user is explicitly acting as a student via header, don't grant staff access
        request = self.context.get('request') if self.context else None
        if request and request.headers.get('X-Current-Role') == 'student':
            return False

        from organizations.models import OrganizationMember
        membership = OrganizationMember.objects.filter(
            user=user,
            organization=organization,
            is_active=True,
        ).first()

        if not membership:
            return False

        # If user also has a student role, enforce student progression on roadmap
        # (even if they are also a teacher — student progression takes priority here)
        has_student_role = (
            (membership.role and membership.role.name == 'student') or
            membership.roles.filter(name='student').exists()
        )
        if has_student_role:
            return False

        # Pure staff (no student role) gets full preview access
        return membership.role.name in ['org_admin', 'teacher'] if membership.role else False

    def _fill_staff_accessibility(self, instance, module_accessible, node_accessible):
        for m in instance.modules.all():
            module_accessible[m.id] = True
            for n in m.nodes.all():
                node_accessible[n.id] = True

    def _fill_student_accessibility(self, instance, module_accessible, node_accessible):
        # Get all modules sorted by sequence_order, id
        modules = list(instance.modules.all())
        modules.sort(key=lambda m: (m.sequence_order, m.id))

        # Build a dictionary of completed statuses
        node_completed = {}
        for m in modules:
            for n in m.nodes.all():
                node_completed[n.id] = self._node_is_completed(n)

        # Determine module accessibility
        self._calculate_module_accessibility(modules, module_accessible)

        # Determine node accessibility
        for m in modules:
            m_accessible = module_accessible[m.id]
            node_accessible.update(self._calculate_node_accessibility(m, m_accessible, node_completed))

    def _node_is_completable(self, n):
        has_learning = getattr(n, 'learning_material', None) is not None
        has_task = getattr(n, 'task', None) is not None
        has_assessment = getattr(n, 'assessment', None) is not None
        has_quiz = len(n.quizzes.all()) > 0
        return has_learning or has_task or has_assessment or has_quiz

    def _node_is_completed(self, n):
        if not self._node_is_completable(n):
            return True
        progress_list = list(n.student_progress.all())
        return bool(progress_list and progress_list[0].status == 'Completed')

    def _calculate_module_accessibility(self, modules, module_accessible):
        for idx, m in enumerate(modules):
            if idx == 0:
                module_accessible[m.id] = True
            else:
                prev_m = modules[idx - 1]
                prev_completed = all(self._node_is_completed(n) for n in prev_m.nodes.all() if self._node_is_completable(n))
                module_accessible[m.id] = module_accessible[prev_m.id] and prev_completed

    def _calculate_node_accessibility(self, m, m_accessible, node_completed):
        node_accessible = {}
        if not m_accessible:
            for n in m.nodes.all():
                node_accessible[n.id] = False
            return node_accessible

        nodes = list(m.nodes.all())
        nodes.sort(key=lambda n: (n.sequence_order, n.id))
        completable_nodes = [n for n in nodes if self._node_is_completable(n)]

        for n in nodes:
            node_accessible[n.id] = self._determine_single_node_accessible(
                n, completable_nodes, node_completed
            )
        return node_accessible

    def _determine_single_node_accessible(self, n, completable_nodes, node_completed):
        if not self._node_is_completable(n):
            return True

        try:
            c_idx = completable_nodes.index(n)
        except ValueError:
            c_idx = -1

        if c_idx == 0:
            n_acc = True
        elif c_idx > 0:
            n_acc = node_completed[completable_nodes[c_idx - 1].id]
        else:
            n_acc = False

        # Check explicit prerequisite if exists
        if n_acc and n.prerequisite_node_id is not None:
            prereq_completed = node_completed.get(n.prerequisite_node_id, True)
            if not prereq_completed:
                n_acc = False

        return n_acc

    def get_is_completed(self, obj):
        user = self.context.get('request').user if self.context and 'request' in self.context else None
        if not user or not user.is_authenticated:
            return False

        total_nodes = Node.objects.filter(module__course=obj, is_deleted=False).count()
        if total_nodes == 0:
            return False

        completed_nodes = StudentNodeProgress.objects.filter(
            student=user,
            node__module__course=obj,
            status='Completed',
            node__is_deleted=False
        ).values('node_id').distinct().count()
        return completed_nodes >= total_nodes


class LearnerProgressSerializer(serializers.Serializer):
    learner_name = serializers.CharField()
    learner_email = serializers.EmailField(required=False, allow_null=True)
    course_title = serializers.CharField()
    completion_percentage = serializers.IntegerField()
    modules_progress = serializers.CharField()  # e.g., "0/1"
    last_activity = serializers.DateTimeField()
    pending_tasks_count = serializers.IntegerField()
    student_id = serializers.UUIDField()
    course_id = serializers.IntegerField()



class TaskSubmissionSerializer(serializers.ModelSerializer):
    student = GlobalUserUUIDField(read_only=True)
    submission_file_url = serializers.SerializerMethodField(read_only=True)
    submission_id = serializers.IntegerField(source='id', read_only=True)
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    attempt_number = serializers.SerializerMethodField(read_only=True)
    is_resubmission = serializers.SerializerMethodField(read_only=True)
    can_resubmit = serializers.SerializerMethodField(read_only=True)

    node_id = serializers.IntegerField(source='task.node.id', read_only=True)
    node_title = serializers.CharField(source='task.node.title', read_only=True)
    module_id = serializers.IntegerField(source='task.node.module.id', read_only=True)
    module_title = serializers.CharField(source='task.node.module.title', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TaskSubmission
        fields = [
            'id', 'submission_id', 'task', 'task_id', 'task_title', 'student', 'payload', 
            'submission_file', 'submission_file_url', 'status', 'feedback', 
            'awarded_score', 'submitted_at', 'graded_at',
            'attempt_number', 'is_resubmission', 'can_resubmit',
            'node_id', 'node_title', 'module_id', 'module_title',
            'student_email', 'student_name'
        ]
        read_only_fields = ['task', 'student', 'status', 'feedback', 'awarded_score', 'submitted_at', 'graded_at']

    def get_student_name(self, obj):
        user_obj = getattr(obj.student, 'user', obj.student)
        return f"{user_obj.first_name} {user_obj.last_name}".strip() or user_obj.email

    def get_submission_file_url(self, obj):
        request = self.context.get('request')
        if obj.submission_file and request:
            return request.build_absolute_uri(obj.submission_file.url)
        if obj.submission_file:
            return obj.submission_file.url
        return None

    def get_attempt_number(self, obj):
        return TaskSubmission.objects.filter(
            student=obj.student,
            task=obj.task,
            submitted_at__lte=obj.submitted_at,
        ).count()

    def get_is_resubmission(self, obj):
        attempt_number = self.get_attempt_number(obj)
        return attempt_number > 1

    def get_can_resubmit(self, obj):
        return obj.status == 'Rejected'

    def validate(self, data):
        # Ensure either payload or submission_file is provided
        payload = data.get('payload')
        submission_file = data.get('submission_file')

        if not payload and not submission_file:
            raise serializers.ValidationError("Either payload (text/links) or a submission file must be provided.")

        return data


class TaskReviewSerializer(serializers.Serializer):
    """
    Teacher: approve or reject a task submission with optional score and feedback.
    """
    STATUS_CHOICES = [('Approved', 'Approved'), ('Rejected', 'Rejected')]

    decision = serializers.ChoiceField(choices=STATUS_CHOICES, help_text="'Approved' or 'Rejected'")
    awarded_score = serializers.IntegerField(required=False, allow_null=True, help_text="Optional numeric score")
    feedback = serializers.CharField(required=False, allow_blank=True, help_text="Optional feedback for the learner")


class StudentTaskResultSerializer(serializers.ModelSerializer):
    """
    Student: shows their task submission result including score, feedback, status, and resubmission eligibility.
    """
    submission_file_url = serializers.SerializerMethodField(read_only=True)
    submission_id = serializers.IntegerField(source='id', read_only=True)
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    can_resubmit = serializers.SerializerMethodField(read_only=True)
    node_title = serializers.SerializerMethodField(read_only=True)
    task_title = serializers.SerializerMethodField(read_only=True)
    attempt_number = serializers.SerializerMethodField(read_only=True)
    previous_attempts = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TaskSubmission
        fields = [
            'id', 'submission_id', 'task', 'task_id', 'node_title', 'task_title',
            'payload', 'submission_file', 'submission_file_url',
            'status', 'feedback', 'awarded_score',
            'submitted_at', 'graded_at',
            'can_resubmit', 'attempt_number', 'previous_attempts'
        ]
        read_only_fields = fields

    def get_submission_file_url(self, obj):
        request = self.context.get('request')
        if obj.submission_file and request:
            return request.build_absolute_uri(obj.submission_file.url)
        if obj.submission_file:
            return obj.submission_file.url
        return None

    def get_node_title(self, obj):
        try:
            return obj.task.node.title
        except Exception:
            return None

    def get_task_title(self, obj):
        try:
            return obj.task.title
        except Exception:
            return None

    def get_can_resubmit(self, obj):
        """Student can resubmit if the submission was rejected."""
        return obj.status == 'Rejected'

    def get_attempt_number(self, obj):
        return TaskSubmission.objects.filter(
            student=obj.student,
            task=obj.task,
            submitted_at__lte=obj.submitted_at,
        ).count()

    def get_previous_attempts(self, obj):
        previous = TaskSubmission.objects.filter(
            student=obj.student,
            task=obj.task,
            submitted_at__lt=obj.submitted_at,
        ).order_by('-submitted_at')
        return TaskSubmissionSerializer(previous, many=True, context=self.context).data


class QuizAnswerSerializer(serializers.ModelSerializer):
    selected_option = serializers.PrimaryKeyRelatedField(
        queryset=QuizOption.objects.all(),
        required=False,
        allow_null=True,
    )
    class Meta:
        model = QuizAnswer
        fields = ['id', 'question', 'selected_option', 'selected_options']

    selected_options = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=QuizOption.objects.all()),
        write_only=True,
        required=False,
    )


class QuizSubmissionSerializer(serializers.ModelSerializer):
    student = GlobalUserUUIDField(read_only=True)
    answers = QuizAnswerSerializer(many=True, required=False)
    quiz_name = serializers.CharField(source='quiz.name', read_only=True)
    node_id = serializers.IntegerField(source='quiz.node.id', read_only=True)
    node_title = serializers.CharField(source='quiz.node.title', read_only=True)
    module_id = serializers.IntegerField(source='quiz.node.module.id', read_only=True)
    module_title = serializers.CharField(source='quiz.node.module.title', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuizSubmission
        fields = [
            'id', 'quiz', 'quiz_name', 'node_id', 'node_title', 'module_id', 'module_title',
            'student', 'student_email', 'student_name', 'score', 'total_questions', 
            'correct_answers', 'passed', 'status', 'attempt_number', 
            'raw_answers_data', 'submitted_at', 'answers'
        ]
        read_only_fields = ['quiz', 'student', 'score', 'total_questions', 'correct_answers', 'passed', 'status', 'attempt_number', 'raw_answers_data', 'submitted_at']

    def get_student_name(self, obj):
        user_obj = getattr(obj.student, 'user', obj.student)
        return f"{user_obj.first_name} {user_obj.last_name}".strip() or user_obj.email

    def _process_answer(self, submission, answer_data):
        """Create QuizAnswer records for a single answer and return the set of valid option IDs."""
        question = answer_data['question']
        selected_options = answer_data.get('selected_options')
        if not selected_options and answer_data.get('selected_option'):
            selected_options = [answer_data['selected_option']]
        if not selected_options:
            return question.id, set()

        valid_option_ids = set()
        for option in selected_options:
            if option.question_id != question.id:
                continue
            QuizAnswer.objects.create(
                submission=submission,
                question=question,
                selected_option=option,
            )
            valid_option_ids.add(option.id)
        return question.id, valid_option_ids

    def _calculate_correct_count(self, quiz, question_selected_options):
        """Count how many questions were answered correctly based on selected vs correct option IDs."""
        correct_answers = 0
        for question in quiz.questions.all():
            correct_ids = set(question.options.filter(is_correct=True).values_list('id', flat=True))
            selected_ids = question_selected_options.get(question.id, set())
            if not correct_ids:
                continue
            if question.allow_multiple_correct:
                if selected_ids == correct_ids:
                    correct_answers += 1
            elif len(selected_ids) == 1 and selected_ids == correct_ids:
                correct_answers += 1
        return correct_answers

    def _prepare_serializable_answers(self, answers_data):
        """Prepare serializable answer dicts for raw JSON storage."""
        serializable = []
        for a in answers_data:
            q_val = a['question']
            q_id = q_val.id if hasattr(q_val, 'id') else q_val
            ans_dict = {
                'question': q_id,
                'selected_options': [opt.id for opt in a.get('selected_options', [])]
            }
            if a.get('selected_option'):
                ans_dict['selected_option'] = a['selected_option'].id
            serializable.append(ans_dict)
        return serializable

    def _record_answers_and_get_selected_options(self, submission, answers_data):
        """Create QuizAnswer records and map question_id -> set of valid option IDs."""
        question_selected_options = {}
        for answer_data in answers_data:
            question_id, valid_option_ids = self._process_answer(submission, answer_data)
            if valid_option_ids:
                question_selected_options.setdefault(question_id, set()).update(valid_option_ids)
        return question_selected_options

    def _update_node_progress(self, quiz, student, submission_passed=True):
        """Update student's node progress to Completed."""
        StudentNodeProgress.objects.update_or_create(
            student=student,
            node=quiz.node,
            defaults={'status': 'Completed'}
        )

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        student = self.context['request'].user
        quiz = validated_data['quiz']

        attempt_number = QuizSubmission.objects.filter(student=student, quiz=quiz).count() + 1
        total_questions = quiz.questions.count()
        serializable_answers = self._prepare_serializable_answers(answers_data)

        submission = QuizSubmission.objects.create(
            student=student, 
            quiz=quiz,
            status='Passed',
            attempt_number=attempt_number,
            raw_answers_data=serializable_answers
        )

        question_selected_options = self._record_answers_and_get_selected_options(submission, answers_data)
        correct_answers = self._calculate_correct_count(quiz, question_selected_options)
        
        score = (correct_answers / total_questions * 100) if total_questions > 0 else 0
        passed = True

        submission.total_questions = total_questions
        submission.correct_answers = correct_answers
        submission.score = score
        submission.passed = passed
        submission.status = 'Passed'
        submission.save()

        self._update_node_progress(quiz, student, passed)

        return submission

# ── TEACHER DETAILED PROGRESS SERIALIZERS ──────────────────────────────────────

class DetailedQuizOptionSerializer(serializers.ModelSerializer):
    is_selected = serializers.SerializerMethodField()

    class Meta:
        model = QuizOption
        fields = ['id', 'option_text', 'is_correct', 'is_selected']

    def get_is_selected(self, obj):
        selected_ids = self.context.get('selected_option_ids') or set()
        return obj.id in selected_ids


class DetailedQuizAnswerSerializer(serializers.Serializer):
    question_text = serializers.CharField()
    selected_option = serializers.CharField()
    selected_options = serializers.ListField(child=serializers.CharField(), required=False)
    correct_option = serializers.CharField(allow_null=True)
    correct_options = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)
    is_correct = serializers.BooleanField()
    options = serializers.ListField(child=serializers.DictField())


class DetailedQuizSubmissionSerializer(serializers.ModelSerializer):
    answers = serializers.SerializerMethodField()
    is_passed = serializers.SerializerMethodField()
    score_percentage = serializers.IntegerField(source='score')

    class Meta:
        model = QuizSubmission
        fields = [
            'id', 'score', 'score_percentage', 'total_questions',
            'correct_answers', 'passed', 'status', 'attempt_number',
            'is_passed', 'submitted_at', 'answers'
        ]

    def get_is_passed(self, obj):
        if obj.passed is not None:
            return bool(obj.passed)
        return True

    def get_answers(self, obj):
        
        questions = obj.quiz.questions.prefetch_related('options').all()
        answers_map = {}
        for ans in obj.answers.all():
            answers_map.setdefault(ans.question_id, []).append(ans)

        results = []
        for q in questions:
            selected_answers = answers_map.get(q.id, [])
            selected_option_ids = {ans.selected_option_id for ans in selected_answers}
            selected_texts = [ans.selected_option.option_text for ans in selected_answers]
            correct_options = [opt.option_text for opt in q.options.filter(is_correct=True)]
            correct_ids = {opt.id for opt in q.options.filter(is_correct=True)}

            if q.allow_multiple_correct:
                is_correct = bool(correct_ids) and selected_option_ids == correct_ids
            else:
                is_correct = len(selected_option_ids) == 1 and selected_option_ids == correct_ids

            results.append({
                'question_text': q.question_text,
                'selected_option': selected_texts[0] if selected_texts else "No selection",
                'selected_options': selected_texts,
                'correct_option': correct_options[0] if correct_options else None,
                'correct_options': correct_options,
                'is_correct': is_correct,
                'options': DetailedQuizOptionSerializer(
                    q.options.all(),
                    many=True,
                    context={'selected_option_ids': selected_option_ids}
                ).data
            })
        return DetailedQuizAnswerSerializer(results, many=True).data


class DetailedNodeProgressSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    node_type = serializers.SerializerMethodField()
    learning_material = LearningMaterialSerializer(read_only=True)
    task_submissions = serializers.SerializerMethodField()
    quiz_submissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Node
        fields = [
            'id', 'title', 'sequence_order', 'status', 'node_type', 
            'learning_material', 'task_submissions', 'quiz_submissions'
        ]

    def get_node_type(self, obj):
        types = []
        if hasattr(obj, 'learning_material') and obj.learning_material:
            types.append("Material")
        if hasattr(obj, 'task') and obj.task:
            types.append("Task")
        if obj.quizzes.exists():
            types.append("Quiz")
        return " + ".join(types) if types else "Empty"

    def get_status(self, obj):
        student = self.context.get('student')
        if student:
            progress = obj.student_progress.filter(student=student).first()
            return progress.status if progress else 'Locked'
        return 'Locked'

    def get_task_submissions(self, obj):
        student = self.context.get('student')
        if student and hasattr(obj, 'task'):
            submissions = obj.task.submissions.filter(student=student).order_by('-submitted_at')
            return TaskSubmissionSerializer(submissions, many=True, context=self.context).data
        return []

    def get_quiz_submissions(self, obj):
        student = self.context.get('student')
        if student:
            quizzes = obj.quizzes.all()
            submissions = QuizSubmission.objects.filter(student=student, quiz__in=quizzes).order_by('-submitted_at')
            return DetailedQuizSubmissionSerializer(submissions, many=True, context=self.context).data
        return []


class DetailedRoadmapModuleSerializer(serializers.ModelSerializer):
    nodes = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'sequence_order', 'nodes']

    def get_nodes(self, obj):
        filtered_nodes = []
        for n in obj.nodes.all():
            has_learning = getattr(n, 'learning_material', None) is not None
            has_task = getattr(n, 'task', None) is not None
            has_assessment = getattr(n, 'assessment', None) is not None
            has_quiz = len(n.quizzes.all()) > 0
            if has_learning or has_task or has_assessment or has_quiz:
                filtered_nodes.append(n)
        return DetailedNodeProgressSerializer(filtered_nodes, many=True, context=self.context).data


class DetailedLearnerCourseProgressSerializer(serializers.ModelSerializer):
    modules = DetailedRoadmapModuleSerializer(many=True, read_only=True)
    learner_info = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'learner_info', 'modules']

    def get_learner_info(self, obj):
        student = self.context.get('student')
        if student:
            user_obj = getattr(student, 'user', student)
            return {
                "id": user_obj.id,
                "email": user_obj.email,
                "full_name": f"{user_obj.first_name} {user_obj.last_name}".strip() or user_obj.email
            }
        return None

class CourseProgressBreakdownSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    completed_nodes = serializers.IntegerField()
    total_nodes = serializers.IntegerField()
    completion_percentage = serializers.FloatField()


class BatchProgressSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    courses = CourseProgressBreakdownSerializer(many=True)


class StudentOverallProgressSerializer(serializers.Serializer):
    overall_completion_percentage = serializers.FloatField()
    total_nodes = serializers.IntegerField()
    completed_nodes = serializers.IntegerField()
    batches = BatchProgressSerializer(many=True)
