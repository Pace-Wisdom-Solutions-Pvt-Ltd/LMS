# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import uuid
from django.core.exceptions import ValidationError
from django.db import models
from accounts.models import User
from organizations.managers import TenantIsolatedManager
from django.utils.text import slugify
from rbac.models import Role
from lms_core.utils_storage import organization_directory_path


CURRICULUM_COURSE = "curriculum.Course"


from lms_core.models import SoftDeleteMixin

class Organization(SoftDeleteMixin):
    # Core Information
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=False, blank=True, default='', help_text="Unique Organization Code")
    
    # 2. Add blank=True so it is not required during validation
    slug = models.SlugField(unique=False, max_length=255, blank=True) 
    
    industry = models.CharField(max_length=100, blank=True, default='')
    
    # Location (Added default='' to skip migration prompts)
    hq_city = models.CharField(max_length=100, blank=True, default='')
    hq_state = models.CharField(max_length=100, blank=True, default='')
    hq_country = models.CharField(max_length=100, blank=True, default='')
    
    # Contact & Settings
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True, default='')
    default_training_template = models.CharField(max_length=255, blank=True, default='')
    
    # Branding Configuration
    logo = models.ImageField(upload_to=organization_directory_path, blank=True, null=True, max_length=500, help_text="Upload PNG/JPG <=2MB")
    custom_subdomain = models.CharField(max_length=255, unique=False, blank=True, default='')
    
    # Status & Tracking
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active_date = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['code'],
                condition=models.Q(is_deleted=False) & ~models.Q(code='') & ~models.Q(code__isnull=True),
                name='unique_active_org_code'
            ),
            models.UniqueConstraint(
                fields=['slug'],
                condition=models.Q(is_deleted=False),
                name='unique_active_org_slug'
            ),
            models.UniqueConstraint(
                fields=['custom_subdomain'],
                condition=models.Q(is_deleted=False) & ~models.Q(custom_subdomain='') & ~models.Q(custom_subdomain__isnull=True),
                name='unique_active_org_subdomain'
            ),
        ]

    # 3. Override the save method to auto-generate the slug
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify # Just making sure this is imported!
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.name)

    @property
    def sender_email(self):
        if "@" not in self.contact_email:
            return ""
        return f"no-reply@{self.contact_email.split('@', 1)[1]}"


class OrganizationMember(SoftDeleteMixin):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, help_text="Unique Membership UUID")
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="organization_memberships"
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    roles = models.ManyToManyField(Role, blank=True, related_name="organization_members")
    batches = models.ManyToManyField(
        "Batch", blank=True, related_name="staff_members"
    )
    course = models.ForeignKey(
        CURRICULUM_COURSE, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff_members"
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'user'],
                condition=models.Q(is_deleted=False),
                name='unique_active_org_member'
            )
        ]

    @property
    def email(self):
        return self.user.email if self.user else ""

    @property
    def first_name(self):
        return self.user.first_name if self.user else ""

    @property
    def last_name(self):
        return self.user.last_name if self.user else ""

    def get_full_name(self):
        return self.user.get_full_name() if self.user else ""

    def __str__(self):
        return f"{self.email} - {self.role.name} at {self.organization.name}"

    def __eq__(self, other):
        from django.contrib.auth import get_user_model
        user_model = get_user_model()
        if isinstance(other, user_model):
            return self.user_id == other.id
        return super().__eq__(other)

    def __hash__(self):
        return super().__hash__()

    STAFF_ROLE_NAMES = {"org_admin", "teacher"}
    STUDENT_ROLE_NAME = "student"

    def clean(self):
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        if self.role and not self.roles.filter(id=self.role.id).exists():
            self.roles.add(self.role)


class Batch(SoftDeleteMixin):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="batches"
    )
    name = models.CharField(max_length=255)
    objects = TenantIsolatedManager()
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    courses = models.ManyToManyField(
        CURRICULUM_COURSE,
        blank=True,
        related_name="batches"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        primary = self.primary_course
        course_label = primary.title if primary else "No course"
        return f"{self.name} ({self.organization.name}) - {course_label}"

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({
                'start_date': 'start_date must be on or before end_date.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        # 1. Clear ManyToMany relationship with courses
        self.courses.clear()
        
        # 2. Clear ManyToMany relationship with OrganizationMember (teachers and students)
        self.staff_members.clear()
        
        # 3. Soft-delete all associated BatchStudent records
        self.students.all().delete()
        
        # 4. Soft-delete all Assignments referencing this batch
        try:
            from assessment_certification.models import Assignment
            Assignment.objects.filter(filter_batch=self).delete()
        except ImportError:
            pass
            
        # 5. Perform the actual soft-delete on the batch
        super().delete(using=using, keep_parents=keep_parents)

    @property
    def primary_course(self):
        return self.courses.all().first()


class BatchStudent(SoftDeleteMixin):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="students")
    student = models.ForeignKey(
        'OrganizationMember', to_field='uuid', on_delete=models.CASCADE, related_name="batch_enrollments"
    )
    student_id_number = models.CharField(max_length=50, blank=True, default='')
    course = models.ForeignKey(CURRICULUM_COURSE, on_delete=models.SET_NULL, null=True, blank=True, related_name="batch_students")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    objects = TenantIsolatedManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "student"],
                condition=models.Q(is_deleted=False),
                name="unique_active_batch_student"
            )
        ]

    def __str__(self):
        return f"{self.student.email} in {self.batch.name}"
