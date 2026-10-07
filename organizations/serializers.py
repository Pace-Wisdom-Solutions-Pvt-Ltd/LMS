# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import serializers
from .models import Organization, OrganizationMember, Batch, BatchStudent
from accounts.models import User
from accounts.views import _send_invite_link
from accounts.validators import validate_non_dummy_email
from rbac.models import Role
from curriculum.models import Course

USER_STATUS_HELP_TEXT = "User account status (pending, reinvited, active, inactive, expired, deleted)"

USER_STATUS_HELP_TEXT = "User account status (pending, reinvited, active, inactive, expired, deleted)"


class OrganizationSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)
    org_admin_email = serializers.EmailField(write_only=True, required=False, validators=[validate_non_dummy_email])
    
    # Read-only calculated fields for the frontend tables and details view
    employee_count = serializers.SerializerMethodField(read_only=True)
    active_courses = serializers.SerializerMethodField(read_only=True)
    compliance_rate = serializers.SerializerMethodField(read_only=True)
    storage_used = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id", "name", "code", "slug", "industry", 
            "hq_city", "hq_state", "hq_country", 
            "contact_email", "contact_phone", "default_training_template",
            "logo", "custom_subdomain", 
            "is_active", "created_at", "last_active_date",
            "org_admin_email", "employee_count", "active_courses", 
            "compliance_rate", "storage_used"
        ]
        
        # Add "slug" to this list!
        read_only_fields = [
            "id", "slug", "created_at", "last_active_date", 
            "employee_count", "active_courses", "compliance_rate", "storage_used"
        ]

    def get_employee_count(self, obj):
        return OrganizationMember.objects.filter(organization=obj, is_active=True).count()

    def get_active_courses(self, obj):
        # Checks the related courses (if curriculum app is linked)
        if hasattr(obj, 'courses'):
            return obj.courses.filter(status='Published').count()
        return 0

    def get_compliance_rate(self, obj):
        # Placeholder for frontend UI (can be connected to Analytics app later)
        return "100%"

    def get_storage_used(self, obj):
        # Placeholder for frontend UI
        return "0 MB"

    def create(self, validated_data):
        org_admin_email = validated_data.pop("org_admin_email", None)
        org = super().create(validated_data)

        if org_admin_email:
            # Check if user exists globally
            user, created = User.objects.get_or_create(
                email=org_admin_email,
                defaults={
                    "first_name": "Admin",
                    "last_name": "User",
                    "is_active": False,
                    "status": User.STATUS_PENDING,
                },
            )

            if created or not user.is_active:
                _send_invite_link(user.email, organization=org)

            role, _ = Role.objects.get_or_create(
                name="org_admin", defaults={"description": "Organization Admin"}
            )
            OrganizationMember.objects.get_or_create(
                organization=org, user=user, defaults={"role": role}
            )

        return org


class UserDetailSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='effective_status', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone_number', 'is_active', 'status']
        read_only_fields = fields


class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(write_only=True, validators=[validate_non_dummy_email])
    role_name = serializers.CharField(write_only=True)
    user_detail = UserDetailSerializer(source='user', read_only=True)
    role_detail = serializers.SerializerMethodField(read_only=True)
    roles_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrganizationMember
        fields = [
            "id",
            "organization",
            "user_email",
            "role_name",
            "joined_at",
            "is_active",
            "user_detail",
            "role_detail",
            "roles_detail",
        ]
        read_only_fields = [
            "id",
            "joined_at",
            "organization",
            "user_detail",
            "role_detail",
            "roles_detail",
        ]

    def get_role_detail(self, obj):
        return {
            "id": obj.role.id,
            "name": obj.role.name,
        }

    def get_roles_detail(self, obj):
        return [
            {"id": r.id, "name": r.name}
            for r in obj.roles.all()
        ]

    def validate_role_name(self, value):
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"Role '{value}' does not exist.")
        return value

    def create(self, validated_data):
        email = validated_data.pop("user_email")
        role_name = validated_data.pop("role_name")
        org = validated_data["organization"]

        if OrganizationMember.objects.filter(organization=org, user__email=email).exists():
            raise serializers.ValidationError({"user_email": "This email is already a member of this organization."})

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Invited",
                "last_name": "User",
                "is_active": False,
            },
        )

        if created or not user.is_active:
            _send_invite_link(user.email, organization=org)

        role = Role.objects.get(name=role_name)
        member, _ = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": role},
        )
        # If member already exists but role is different, update role
        if member.role != role:
            member.role = role
            member.save()
        return member

class StaffSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(write_only=True, validators=[validate_non_dummy_email])
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    role_name = serializers.ChoiceField(choices=['org_admin', 'teacher'], write_only=True)
    status = serializers.ChoiceField(
        choices=User.STATUS_CHOICES,
        write_only=True,
        required=False,
        help_text=USER_STATUS_HELP_TEXT,
    )
    
    batches = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        many=True,
        required=False
    )
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    assigned_courses = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.none(),
        many=True,
        required=False,
        write_only=True,
        allow_null=True
    )
    assigned_courses_detail = serializers.SerializerMethodField(read_only=True)
    
    user_detail = UserDetailSerializer(source='user', read_only=True)
    role_detail = serializers.SerializerMethodField(read_only=True)
    roles_detail = serializers.SerializerMethodField(read_only=True)
    batch_detail = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'user_email', 'first_name', 'last_name', 'phone_number', 'status',
            'role_name', 'batches', 'assigned_courses', 'assigned_courses_detail',
            'user_detail', 'role_detail', 'roles_detail', 'batch_detail', 'joined_at', 'is_active'
        ]
        read_only_fields = ['id', 'joined_at', 'user_detail', 'role_detail', 'roles_detail', 'batch_detail']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter course and batch queryset based on organization if context is available
        request = self.context.get('request')
        view = self.context.get('view')
        org_id = None
        if request and view:
            org_id = view.kwargs.get('org_pk')
            
        if org_id:
            from curriculum.models import Course
            self.fields['assigned_courses'].child_relation.queryset = Course.objects.filter(organization_id=org_id)
            self.fields['batches'].queryset = Batch.objects.filter(organization_id=org_id)
        elif self.instance and isinstance(self.instance, OrganizationMember):
            from curriculum.models import Course
            self.fields['assigned_courses'].child_relation.queryset = Course.objects.filter(organization=self.instance.organization)
            self.fields['batches'].queryset = Batch.objects.filter(organization=self.instance.organization)
        else:
             from curriculum.models import Course
             self.fields['assigned_courses'].child_relation.queryset = Course.objects.all()
             self.fields['batches'].queryset = Batch.objects.all()

    def to_internal_value(self, data):
        if isinstance(data, dict) and 'assigned_courses' in data and data['assigned_courses'] is None:
            if hasattr(data, 'copy'):
                data = data.copy()
            data.pop('assigned_courses', None)
        return super().to_internal_value(data)

    def get_role_detail(self, obj):
        return {
            "id": obj.role.id,
            "name": obj.role.name,
        }

    def get_roles_detail(self, obj):
        return [
            {"id": r.id, "name": r.name}
            for r in obj.roles.all()
        ]

    def get_batch_detail(self, obj):
        return [
            {
                "id": b.id,
                "name": b.name,
                "courses": [
                    {"id": c.id, "title": c.title}
                    for c in b.courses.all()
                ]
            }
            for b in obj.batches.all()
        ]

    def get_course_detail(self, obj):
        if obj.course:
            return {
                "id": obj.course.id,
                "title": obj.course.title
            }
        return None

    def get_assigned_courses_detail(self, obj):
        from curriculum.models import Course
        courses = Course.objects.filter(teachers=obj.user, organization=obj.organization)
        return [{"id": c.id, "title": c.title} for c in courses]

    def _validate_teacher_batch_and_courses(self, batches, assigned_courses):
        """Helper to validate teacher specific batch and course constraints."""
        # Mandate batch if courses are being assigned
        if assigned_courses and not batches:
            raise serializers.ValidationError({
                "batches": "A teacher must be assigned to at least one batch before courses can be selected."
            })
        
        # Ensure all assigned courses belong to one of the assigned batches
        if batches and assigned_courses:
            allowed_course_ids = set()
            for batch in batches:
                allowed_course_ids.update(batch.courses.values_list('id', flat=True))
            for course in assigned_courses:
                if course.id not in allowed_course_ids:
                    raise serializers.ValidationError({
                        "assigned_courses": f"Course '{course.title}' does not belong to any of the selected batches."
                    })

    def validate(self, data):
        role_name = data.get('role_name')
        if not role_name and self.instance:
            role_name = self.instance.role.name
            
        is_teacher = (role_name == 'teacher')
        batches = data.get('batches')
        if 'batches' not in data and self.instance:
            batches = list(self.instance.batches.all())
            
        assigned_courses = data.get('assigned_courses')
        
        if is_teacher:
            self._validate_teacher_batch_and_courses(batches, assigned_courses)
        return data

    def _sync_teacher_courses(self, user, org, batches, assigned_courses_data):
        from curriculum.models import Course
        
        # Remove user from all courses in this organization first to ensure clean state
        for c in Course.objects.filter(organization=org, teachers=user):
            c.teachers.remove(user)
            
        if not batches:
            return

        if assigned_courses_data:
            # Explicit list provided
            target_courses = assigned_courses_data
        else:
            # Default to all courses in the assigned batches
            target_courses = Course.objects.filter(batches__in=batches).distinct()
            
        for c in target_courses:
            c.teachers.add(user)

    def _update_user_fields(self, user, validated_data):
        """Helper to update basic user profile fields."""
        fields = ["first_name", "last_name", "phone_number"]
        updated = False
        for field in fields:
            value = validated_data.pop(field, None)
            if value is not None:
                setattr(user, field, value)
                updated = True
                
        status = validated_data.pop("status", None)
        if status is not None:
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

    def update(self, instance, validated_data):
        user = instance.user
        
        # 1. Update User Record Fields
        self._update_user_fields(user, validated_data)

        # 2. Handle Role Update
        role_name = validated_data.pop("role_name", None)
        if role_name:
            instance.role = Role.objects.get(name=role_name)

        # 3. Handle Batches and Multi-Course Sync
        batches_provided = 'batches' in validated_data
        new_batches = validated_data.pop('batches') if batches_provided else list(instance.batches.all())
        assigned_courses_data = validated_data.pop("assigned_courses", None)

        # Sync courses if batches changed OR if assigned_courses was explicitly passed
        if batches_provided or assigned_courses_data is not None:
            self._sync_teacher_courses(user, instance.organization, new_batches, assigned_courses_data)

        # Update batches ManyToMany relation if provided
        if batches_provided:
            instance.batches.set(new_batches)

        # 4. Handle Instance Level Updates (is_active)
        return super().update(instance, validated_data)

    def _get_or_create_user(self, email, first_name, last_name, phone_number, status, org_id):
        defaults = {
            "first_name": first_name,
            "last_name": last_name,
            "phone_number": phone_number,
            "is_active": False,
            "status": status or User.STATUS_PENDING,
        }

        user, created = User.objects.get_or_create(
            email=email,
            defaults=defaults,
        )
        if created or not user.is_active:
            organization = Organization.objects.filter(id=org_id).first()
            _send_invite_link(user.email, organization=organization)
            user.refresh_from_db()
        else:
            user.first_name = first_name
            user.last_name = last_name
            if phone_number:
                user.phone_number = phone_number
            if status is not None:
                user.status = status
                if status in [User.STATUS_PENDING, User.STATUS_REINVITED, User.STATUS_EXPIRED, User.STATUS_INACTIVE]:
                    user.is_active = False
                elif status == User.STATUS_ACTIVE:
                    user.is_active = True
                elif status == User.STATUS_DELETED:
                    user.is_active = False
                    user.is_deleted = True
            user.save()
        return user

    def _get_or_create_member(self, user, role_name, batches, org_id):
        role = Role.objects.get(name=role_name)
        member = OrganizationMember.objects.filter(organization_id=org_id, user=user).first()
        if not member:
            member = OrganizationMember(
                organization_id=org_id,
                user=user,
                role=role,
            )
            member._skip_email = True
            member.save()
        else:
            if member.role != role:
                member.role = role
                member.save()
        
        if batches:
            member.batches.set(batches)
        else:
            member.batches.clear()
            
        return member

    def _send_teacher_assignment_email(self, user, batches, role_name, assigned_courses_data):
        # Teacher assignment notification emails can be enabled when a custom email template is configured.
        pass

    def create(self, validated_data):
        email = validated_data.pop("user_email")
        role_name = validated_data.pop("role_name")
        first_name = validated_data.pop("first_name", "Staff")
        last_name = validated_data.pop("last_name", "Member")
        phone_number = validated_data.pop("phone_number", "")
        status = validated_data.pop("status", None)
        batches = validated_data.pop("batches", [])
        assigned_courses_data = validated_data.pop("assigned_courses", None)
        org_id = self.context['view'].kwargs.get('org_pk')

        user = self._get_or_create_user(email, first_name, last_name, phone_number, status, org_id)
        member = self._get_or_create_member(user, role_name, batches, org_id)
        
        # Sync Initial courses
        self._sync_teacher_courses(user, member.organization, batches, assigned_courses_data)

        # Manually send assignment email now that courses are synced
        self._send_teacher_assignment_email(user, batches, role_name, assigned_courses_data)

        return member


class BatchSerializer(serializers.ModelSerializer):
    courses = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), # Filtered in __init__
        many=True,
        required=False,
        allow_empty=True
    )
    courses_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Batch
        fields = [
            'id',
            'organization',
            'name',
            'courses',
            'courses_detail',
            'start_date',
            'end_date',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter course querysets based on organization if context is available
        request = self.context.get('request')
        if request and 'view' in self.context:
            org_id = self.context['view'].kwargs.get('org_pk')
            if org_id:
                self.fields['courses'].queryset = Course.objects.filter(organization_id=org_id)

    def get_courses_detail(self, obj):
        return [
            {"id": course.id, "title": course.title}
            for course in obj.courses.all()
        ]

    def create(self, validated_data):
        courses = validated_data.pop("courses", None)
        batch = super().create(validated_data)
        if courses is not None:
            batch.courses.set(courses)
        return batch

    def update(self, instance, validated_data):
        courses = validated_data.pop("courses", None)
        batch = super().update(instance, validated_data)
        if courses is not None:
            batch.courses.set(courses)
        return batch

    def validate(self, data):
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'start_date': 'start_date must be on or before end_date.'
            })

        return data


class BatchStudentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='student.id', read_only=True)
    course = serializers.PrimaryKeyRelatedField(
        read_only=True,
        required=False,
        allow_null=True
    )
    batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(), # Filtered in __init__
        required=False # Can be provided in URL for nested, or explicitly for bulk
    )
    batch_id = serializers.PrimaryKeyRelatedField(
        source='batch',
        queryset=Batch.objects.all(),
        required=False,
        write_only=True
    )
    student_id = serializers.SerializerMethodField(read_only=True)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    phone_number = serializers.CharField(write_only=True, required=False)
    status = serializers.ChoiceField(
        choices=User.STATUS_CHOICES,
        write_only=True,
        required=False,
        help_text=USER_STATUS_HELP_TEXT,
    )
    student_detail = UserDetailSerializer(source='student', read_only=True)
    course_detail = serializers.SerializerMethodField(read_only=True)

    def get_student_id(self, obj):
        if getattr(obj, 'student_id_number', None):
            return obj.student_id_number
        if hasattr(obj.student, 'uuid'):
            return str(obj.student.uuid)
        return str(getattr(obj.student, 'id', ''))

    class Meta:
        model = BatchStudent
        fields = ['id', 'batch', 'batch_id', 'student_id', 'course', 'enrolled_at', 'is_active', 'student_detail', 'course_detail', 'first_name', 'last_name', 'phone_number', 'status']
        read_only_fields = ['id', 'course', 'enrolled_at', 'student_detail', 'course_detail']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter course and batch queryset based on organization if context is available
        request = self.context.get('request')
        if request and 'view' in self.context:
            org_id = self.context['view'].kwargs.get('org_pk')
            if org_id:
                from curriculum.models import Course
                batch_qs = Batch.objects.filter(organization_id=org_id)
                self.fields['batch'].queryset = batch_qs
                if 'batch_id' in self.fields:
                    self.fields['batch_id'].queryset = batch_qs

    def validate(self, data):
        # A batch is mandatory for student enrollment (legacy fallback handled in View)
        batch = data.get('batch')
        if not batch and not self.instance:
            # We check the view kwargs in the viewset, but here we can add a basic check
            pass
        return data

    def update(self, instance, validated_data):


        # Extract user profile fields
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        phone_number = validated_data.pop('phone_number', None)
        validated_data.pop('student', {})
        status = validated_data.pop('status', None)

        # Update User profile if any field is provided
        user = instance.student.user if hasattr(instance.student, 'user') else instance.student
        updated_user = False
        if first_name is not None:
            user.first_name = first_name
            updated_user = True
        if last_name is not None:
            user.last_name = last_name
            updated_user = True
        if phone_number is not None:
            user.phone_number = phone_number
            updated_user = True
        if status is not None:
            user.status = status
            if status in [User.STATUS_PENDING, User.STATUS_REINVITED, User.STATUS_EXPIRED, User.STATUS_INACTIVE]:
                user.is_active = False
            elif status == User.STATUS_ACTIVE:
                user.is_active = True
            elif status == User.STATUS_DELETED:
                user.is_active = False
                user.is_deleted = True
            updated_user = True
        
        if updated_user:
            user.save()

        # Ensure course remains None for students (Inheritance from Batch)
        validated_data['course'] = None
        return super().update(instance, validated_data)

    def get_course_detail(self, obj):
        if obj.course:
            return {
                "id": obj.course.id,
                "title": obj.course.title
            }
        
        # Fallback to batch courses (Since students inherit courses from the batch)
        if obj.batch and obj.batch.courses.exists():
            courses = obj.batch.courses.all()
            titles = ", ".join([c.title for c in courses])
            return {
                "id": courses[0].id,  # Provide first ID to prevent frontend breaking
                "title": titles       # Show all course names in the UI
            }
            
        return None


class StudentImportItemSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(required=False, allow_blank=True, default='')
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    student_id = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=User.STATUS_CHOICES,
        required=False,
        help_text=USER_STATUS_HELP_TEXT,
    )
    # course_id is deprecated for students, they inherit all courses from the batch
    course_id = serializers.IntegerField(required=False, allow_null=True)
    batch_id = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        required=False # Often resolved from default_batch in View
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter course and batch queryset based on organization if context is available
        request = self.context.get('request')
        if request and 'view' in self.context:
            org_id = self.context['view'].kwargs.get('org_pk')
            if org_id:
                from curriculum.models import Course
                self.fields['course_id'].queryset = Course.objects.filter(organization_id=org_id)
                self.fields['batch_id'].queryset = Batch.objects.filter(organization_id=org_id)

class BulkAddStudentSerializer(serializers.Serializer):
    students = StudentImportItemSerializer(many=True)


class OrganizationAnalyticsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_staff = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_batches = serializers.IntegerField()
    total_courses = serializers.IntegerField()


class FileBulkUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    course_id = serializers.IntegerField(required=False, allow_null=True, help_text="ID of the course to assign students to")


class StudentFileBulkUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class StaffFileBulkUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    role_name = serializers.ChoiceField(choices=['org_admin', 'teacher'], default='teacher')
    status = serializers.ChoiceField(
        choices=User.STATUS_CHOICES,
        required=False,
        default=User.STATUS_PENDING,
        help_text="Default user account status for bulk-uploaded staff (pending, active, inactive, etc.)"
    )
    batch_id = serializers.IntegerField(required=False, help_text="ID of the batch to assign staff to")


class OrganizationStudentListSerializer(serializers.ModelSerializer):
    """
    Serializer for OrganizationMember (student role) to list all students in an organization.
    Shows student details including optional batch and course assignments.
    """
    id = serializers.CharField(source='user.id', read_only=True)
    student_id = serializers.SerializerMethodField(read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)
    phone_number = serializers.CharField(source='user.phone_number', required=False, allow_blank=True)
    status = serializers.SerializerMethodField(read_only=True)
    batch_ids = serializers.PrimaryKeyRelatedField(
        source='batches',
        queryset=Batch.objects.all(),
        many=True,
        required=False
    )
    course_id = serializers.PrimaryKeyRelatedField(
        source='course',
        queryset=Course.objects.all(),
        required=False,
        allow_null=True
    )
    batch_detail = serializers.SerializerMethodField(read_only=True)
    course_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'student_id', 'email', 'first_name', 'last_name', 'phone_number',
            'status', 'batch_ids', 'course_id', 'batch_detail', 'course_detail',
            'joined_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'student_id', 'email', 'status', 'batch_detail', 'course_detail', 'joined_at'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter course and batch queryset based on organization if context is available
        request = self.context.get('request')
        view = self.context.get('view')
        org_id = None
        if request and view:
            org_id = view.kwargs.get('org_pk')
            
        if org_id:
            from curriculum.models import Course
            self.fields['course_id'].queryset = Course.objects.filter(organization_id=org_id)
            self.fields['batch_ids'].queryset = Batch.objects.filter(organization_id=org_id)
        elif self.instance and isinstance(self.instance, OrganizationMember):
            from curriculum.models import Course
            self.fields['course_id'].queryset = Course.objects.filter(organization=self.instance.organization)
            self.fields['batch_ids'].queryset = Batch.objects.filter(organization=self.instance.organization)
        else:
             from curriculum.models import Course
             self.fields['course_id'].queryset = Course.objects.all()
             self.fields['batch_ids'].queryset = Batch.objects.all()

    def get_status(self, obj):
        return obj.user.effective_status

    def get_student_id(self, obj):
        # Retrieve the custom student ID number from BatchStudent enrollments
        enrollments = obj.batch_enrollments.all()
        for e in enrollments:
            if e.batch.organization_id == obj.organization_id and not getattr(e, 'is_deleted', False) and e.student_id_number:
                return e.student_id_number
        return ""

    def get_batch_detail(self, obj):
        return [
            {
                "id": b.id,
                "name": b.name,
                "courses": [
                    {"id": c.id, "title": c.title}
                    for c in b.courses.all()
                ]
            }
            for b in obj.batches.all()
        ]

    def get_course_detail(self, obj):
        if obj.course:
            return {
                "id": obj.course.id,
                "title": obj.course.title
            }
        return None

    def _update_user_profile(self, user, user_data):
        for field, value in user_data.items():
            setattr(user, field, value)
        user.save()

    def _get_student_id_val(self):
        request = self.context.get('request')
        if not request or 'student_id' not in request.data:
            return None
        student_id_val = request.data['student_id']
        try:
            from uuid import UUID
            UUID(str(student_id_val))
            return None
        except ValueError:
            return student_id_val

    def update(self, instance, validated_data):
        # 1. Handle user profile updates (first_name, last_name, phone_number)
        user_data = validated_data.pop('user', None)
        if user_data:
            self._update_user_profile(instance.user, user_data)

        # 2. Extract custom student_id (student_id_number) from raw request data
        student_id_val = self._get_student_id_val()

        # 3. Handle batches and BatchStudent sync
        batches_provided = 'batches' in validated_data
        if batches_provided:
            new_batches = validated_data.pop('batches')
            from .models import BatchStudent
            from organizations.views import _dedupe_batch_student_record

            # Delete BatchStudent records for batches in this org that are no longer assigned
            BatchStudent.objects.filter(
                student=instance,
                batch__organization=instance.organization,
            ).exclude(batch__in=new_batches).delete()

            # Create or update BatchStudent records for assigned batches
            for batch in new_batches:
                _dedupe_batch_student_record(BatchStudent.objects, batch=batch, student=instance)
                
                batch_student_defaults = {}
                if student_id_val is not None:
                    batch_student_defaults['student_id_number'] = student_id_val
                
                if 'course' in validated_data:
                    batch_student_defaults['course'] = validated_data.get('course')

                BatchStudent.objects.update_or_create(
                    batch=batch,
                    student=instance,
                    defaults=batch_student_defaults
                )

            instance.batches.set(new_batches)
        elif student_id_val is not None:
            from .models import BatchStudent
            BatchStudent.objects.filter(
                student=instance,
                batch__organization=instance.organization,
            ).update(student_id_number=student_id_val)

        # 4. Let DRF handle saving the remaining OrganizationMember fields (course, is_active)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Fetch batches dynamically from BatchStudent (linked via user.batch_enrollments)
        # to ensure existing students also show their batches correctly.
        enrollments = [
            e for e in instance.batch_enrollments.all()
            if e.batch.organization_id == instance.organization_id and not getattr(e, 'is_deleted', False)
        ]
        ret['batch_ids'] = [e.batch_id for e in enrollments]
        ret['batch_detail'] = [
            {"id": e.batch.id, "name": e.batch.name}
            for e in enrollments
        ]
        return ret

class OrganizationStudentCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(validators=[validate_non_dummy_email])
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=False, allow_blank=True, default="")
    phone_number = serializers.CharField(required=False, allow_blank=True, default="")
    student_id = serializers.CharField(required=False, allow_blank=True, default="", help_text="Custom student ID number")
    batch_ids = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        many=True,
        required=False,
        help_text="Optional list of batch IDs to enroll the student in"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter batch queryset based on organization if context is available
        request = self.context.get('request')
        view = self.context.get('view')
        org_id = None
        if request and view:
            org_id = view.kwargs.get('org_pk')
        if org_id:
            self.fields['batch_ids'].child_relation.queryset = Batch.objects.filter(organization_id=org_id)

    def validate_email(self, value):
        # Ensure the user is not already a member/student of this organization
        view = self.context.get('view')
        if view:
            org_id = view.kwargs.get('org_pk')
            if OrganizationMember.objects.filter(organization_id=org_id, user__email=value, is_deleted=False).exists():
                raise serializers.ValidationError("A member with this email already exists in the organization.")
        return value


