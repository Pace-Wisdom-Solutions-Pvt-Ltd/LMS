# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib import admin
from .models import (
    Course, Module, Chapter, Node, LearningMaterial,
    Assessment, AssignmentSubmission, StudentNodeProgress,
    Task, TaskSubmission,
    Quiz, QuizQuestion, QuizOption, QuizSubmission,
)

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'organization', 'status', 'created_at')
    list_filter = ('organization', 'status')
    search_fields = ('title',)

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'sequence_order')
    list_filter = ('course__organization', 'course')
    search_fields = ('title',)

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'sequence_order')
    list_filter = ('module__course__organization', 'module__course', 'module')
    search_fields = ('title',)

@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'chapter', 'sequence_order')
    list_filter = ('module__course__organization', 'module__course', 'module')
    search_fields = ('title',)

@admin.register(LearningMaterial)
class LearningMaterialAdmin(admin.ModelAdmin):
    list_display = ('node', 'content_type')
    list_filter = ('content_type',)

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('node', 'assignment_type', 'max_attempts', 'passing_score_percentage')
    list_filter = ('assignment_type',)

@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'assessment', 'status', 'submitted_at')
    list_filter = ('status',)
    search_fields = ('student__user__email',)

@admin.register(StudentNodeProgress)
class StudentNodeProgressAdmin(admin.ModelAdmin):
    list_display = ('student', 'node', 'status', 'last_accessed')
    list_filter = ('status',)
    search_fields = ('student__user__email', 'node__title')

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'node', 'created_at')
    search_fields = ('title',)

@admin.register(TaskSubmission)
class TaskSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'task', 'status', 'submitted_at')
    list_filter = ('status',)
    search_fields = ('student__email',)

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('name', 'node', 'timer_minutes')
    list_filter = ('node__module__course__organization',)
    search_fields = ('name',)

@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'quiz', 'allow_multiple_correct')
    list_filter = ('quiz',)
    search_fields = ('question_text',)

@admin.register(QuizOption)
class QuizOptionAdmin(admin.ModelAdmin):
    list_display = ('option_text', 'question', 'is_correct')
    list_filter = ('question__quiz',)
    search_fields = ('option_text',)

@admin.register(QuizSubmission)
class QuizSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'quiz', 'score', 'status', 'submitted_at')
    list_filter = ('status', 'quiz')
    search_fields = ('student__email',)
