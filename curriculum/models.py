# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.core.validators import MaxValueValidator
from django.db import models
from accounts.models import User
from organizations.managers import TenantIsolatedManager
from organizations.models import Organization
from lms_core.utils_storage import organization_directory_path

ORGANIZATION_MEMBER_MODEL = 'organizations.OrganizationMember'

NEEDS_MANUAL_REVIEW = 'Needs Manual Review'

# ── STRUCTURAL HIERARCHY (ROADMAP) ────────────────────────────────────────────

from lms_core.models import SoftDeleteMixin

class Course(SoftDeleteMixin):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Archived', 'Archived'),
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='courses')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    thumbnail = models.ImageField(upload_to=organization_directory_path, blank=True, null=True, max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    teachers = models.ManyToManyField(ORGANIZATION_MEMBER_MODEL, related_name='assigned_courses', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TenantIsolatedManager()

    def __str__(self):
        return f"{self.title} ({self.organization.name})"



class Module(SoftDeleteMixin):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sequence_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sequence_order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Chapter(SoftDeleteMixin):
    """A card inside a module that groups related nodes (videos, tasks, quizzes...)."""
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sequence_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sequence_order', 'id']

    def __str__(self):
        return f"{self.module.title} - {self.title}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Chapter order drives node order, so re-chain the module's nodes.
        from .utils import reorder_chapters, reorder_nodes
        reorder_chapters(self.module_id)
        reorder_nodes(self.module_id)

    def delete(self, using=None, keep_parents=False):
        for node in self.nodes.all():
            node.delete()
        super().delete(using=using, keep_parents=keep_parents)


class Node(SoftDeleteMixin):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='nodes')
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True, related_name='nodes')
    title = models.CharField(max_length=255)
    description=models.TextField(blank=True)    
    sequence_order = models.PositiveIntegerField(default=0)
    prerequisite_node = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='dependent_nodes')
    focus_areas = models.TextField(blank=True, help_text="What should learners focus on?")
    quick_outline = models.TextField(blank=True, help_text="Brief outline of the node content.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sequence_order']

    def __str__(self):
        return f"{self.module.title} -> {self.title}"

    def save(self, *args, **kwargs):
        # Determine if this save is updating reorder-related fields only to prevent infinite recursion
        update_fields = kwargs.get('update_fields')
        is_reorder_save = False
        if update_fields:
            reorder_fields = {'sequence_order', 'prerequisite_node', 'prerequisite_node_id'}
            is_reorder_save = all(field in reorder_fields for field in update_fields)

        super().save(*args, **kwargs)

        if not is_reorder_save:
            from .utils import reorder_nodes
            reorder_nodes(self.module_id)



class LearningMaterial(SoftDeleteMixin):
    CONTENT_TYPE_CHOICES = (
        ('Link', 'Link'),
        ('PDF', 'PDF'),
        ('Doc', 'Doc'),
        ('Video', 'Video'),
    )
    node = models.OneToOneField(Node, on_delete=models.CASCADE, related_name='learning_material')
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    content_url = models.URLField(blank=True, null=True, help_text="URL for external content like videos or files stored in S3.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Material for Node: {self.node.title}"


class Assessment(SoftDeleteMixin):
    ASSIGNMENT_TYPE_CHOICES = (
        ('MCQ', 'Multiple Choice Question'),
        ('Short Answer', 'Short Answer'),
        ('FileUpload', 'File Upload'),
    )
    node = models.OneToOneField(Node, on_delete=models.CASCADE, related_name='assessment')
    assignment_type = models.CharField(max_length=20, choices=ASSIGNMENT_TYPE_CHOICES)
    prompt = models.TextField(help_text="Instructions or the question prompt.")
    max_attempts = models.PositiveIntegerField(default=1)
    passing_score_percentage = models.PositiveIntegerField(default=0)
    expected_answer_schema = models.JSONField(blank=True, null=True, help_text="Configurable schema for auto-grading.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Assessment for Node: {self.node.title}"


class AssignmentSubmission(SoftDeleteMixin):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Graded', 'Graded'),
        (NEEDS_MANUAL_REVIEW, NEEDS_MANUAL_REVIEW),
    )
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(ORGANIZATION_MEMBER_MODEL, to_field='uuid', on_delete=models.CASCADE, related_name='assignment_submissions')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')

    objects = TenantIsolatedManager()
    payload = models.JSONField(help_text="Student's answers.")
    awarded_score = models.IntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Submission by {self.student.email} for {self.assessment.node.title}"


class StudentNodeProgress(SoftDeleteMixin):
    STATUS_CHOICES = (
        ('Locked', 'Locked'),
        ('Unlocked', 'Unlocked'),
        ('In_Progress', 'In Progress'),
        ('Completed', 'Completed'),
    )
    student = models.ForeignKey(ORGANIZATION_MEMBER_MODEL, to_field='uuid', on_delete=models.CASCADE, related_name='node_progress')
    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='student_progress')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Locked')
    last_accessed = models.DateTimeField(auto_now=True)

    objects = TenantIsolatedManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'node'],
                condition=models.Q(is_deleted=False),
                name='unique_active_student_node_progress'
            )
        ]

    def __str__(self):
        return f"{self.student.email} - {self.node.title} - {self.status}"


class Task(SoftDeleteMixin):
    node = models.OneToOneField(Node, on_delete=models.CASCADE, related_name='task')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to=organization_directory_path, blank=True, null=True, max_length=500)
    # Submission formats (Checkboxes in UI)
    allow_link = models.BooleanField(default=False)
    allow_paragraph = models.BooleanField(default=False)
    allow_pdf = models.BooleanField(default=False)
    allow_screenshot = models.BooleanField(default=False)
    allow_code_block = models.BooleanField(default=False)
    allow_file = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Task: {self.title} for {self.node.title}"


class Quiz(SoftDeleteMixin):
    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='quizzes')
    name = models.CharField(max_length=255)
    timer_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="Quiz timer in minutes. Null means no timer.")
    passing_percentage = models.PositiveIntegerField(
        default=70,
        validators=[MaxValueValidator(100)],
        help_text="Minimum score (0-100) a student needs to pass the quiz."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Quiz: {self.name} for {self.node.title}"


class QuizQuestion(SoftDeleteMixin):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    allow_multiple_correct = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class QuizOption(SoftDeleteMixin):
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)


class QuizSubmission(SoftDeleteMixin):
    STATUS_CHOICES = [
        ('Passed', 'Passed'),
        ('Failed', 'Failed'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(ORGANIZATION_MEMBER_MODEL, to_field='uuid', on_delete=models.CASCADE, related_name='quiz_submissions')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    objects = TenantIsolatedManager()
    total_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    passed = models.BooleanField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, default='Failed')
    raw_answers_data = models.JSONField(db_column='answers', null=True, blank=True)
    attempt_number = models.IntegerField(default=1)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quiz Submission by {self.student.email} for {self.quiz.name} - {self.status}"


class QuizAnswer(SoftDeleteMixin):
    submission = models.ForeignKey(QuizSubmission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(QuizOption, on_delete=models.CASCADE)

    def __str__(self):
        return f"Answer for {self.question.question_text[:30]} in submission {self.submission.id}"


class TaskSubmission(SoftDeleteMixin):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Graded', 'Graded'),
        (NEEDS_MANUAL_REVIEW, NEEDS_MANUAL_REVIEW),
    )
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(ORGANIZATION_MEMBER_MODEL, to_field='uuid', on_delete=models.CASCADE, related_name='task_submissions')
    payload = models.JSONField(help_text="Student's task content (links, text, etc.)", blank=True, null=True)
    submission_file = models.FileField(upload_to=organization_directory_path, blank=True, null=True, max_length=500)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')
    feedback = models.TextField(blank=True)

    objects = TenantIsolatedManager()
    awarded_score = models.IntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Task Submission by {self.student.email} for {self.task.title}"




from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=Quiz)
@receiver(post_delete, sender=Quiz)
def reset_progress_on_quiz_change(sender, instance, **kwargs):
    StudentNodeProgress.objects.filter(node=instance.node).delete()

@receiver(post_save, sender=QuizQuestion)
@receiver(post_delete, sender=QuizQuestion)
def reset_progress_on_question_change(sender, instance, **kwargs):
    if instance.quiz and instance.quiz.node:
        StudentNodeProgress.objects.filter(node=instance.quiz.node).delete()

@receiver(post_save, sender=QuizOption)
@receiver(post_delete, sender=QuizOption)
def reset_progress_on_option_change(sender, instance, **kwargs):
    if instance.question and instance.question.quiz and instance.question.quiz.node:
        StudentNodeProgress.objects.filter(node=instance.question.quiz.node).delete()

from organizations.managers import TenantIsolatedManyToManyDescriptor
Course.teachers = TenantIsolatedManyToManyDescriptor(Course.teachers)
