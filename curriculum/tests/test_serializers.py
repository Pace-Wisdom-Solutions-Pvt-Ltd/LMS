# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.test import RequestFactory
from conftest import TEST_PASSWORD

pytestmark = pytest.mark.django_db
from accounts.models import User
from organizations.models import Organization, Batch, BatchStudent
import datetime
from curriculum.models import Course, Module, Node, LearningMaterial, StudentNodeProgress
from curriculum.serializers import (
    TeacherBasicSerializer, CourseSerializer, EnrolledCourseSerializer
)


PASSWORD = TEST_PASSWORD


def test_teacher_basic_full_name_and_fallback():
    u = User.objects.create_user(email='no_name@example.com', password=PASSWORD)
    ser = TeacherBasicSerializer(u)
    assert ser.data['full_name'] == u.email

    u2 = User.objects.create_user(email='named@example.com', password=PASSWORD)
    u2.first_name = 'Jane'
    u2.last_name = 'Doe'
    u2.save()
    ser2 = TeacherBasicSerializer(u2)
    assert ser2.data['full_name'] == 'Jane Doe'


def test_course_serializer_batches_and_student_count():
    org = Organization.objects.create(name='OrgA', slug='orga', contact_email='a@o')
    course = Course.objects.create(organization=org, title='C1', status='Published')
    batch = Batch.objects.create(
        organization=org,
        name='B1',
        start_date=datetime.date.today(),
        end_date=datetime.date.today(),
    )
    batch.courses.add(course)

    # Create a student enrollment tied to the course via BatchStudent
    student = User.objects.create_user(email='s@o', password=PASSWORD)
    BatchStudent.objects.create(batch=batch, student=student, course=course)

    ser = CourseSerializer(course)
    # student_count should count unique enrolled students
    assert ser.data['student_count'] == 1
    batches_detail = ser.data['batches_detail']
    assert isinstance(batches_detail, list) and batches_detail[0]['id'] == batch.id





def test_enrolled_course_completion_percentage_calculation():
    org = Organization.objects.create(name='OrgB', slug='orgb', contact_email='b@o')
    user = User.objects.create_user(email='learner@o', password=PASSWORD)
    course = Course.objects.create(organization=org, title='C2', status='Published')
    module = Module.objects.create(course=course, title='M1')
    n1 = Node.objects.create(module=module, title='N1')
    n2 = Node.objects.create(module=module, title='N2')
    LearningMaterial.objects.create(node=n1, content_type='Video')
    LearningMaterial.objects.create(node=n2, content_type='PDF')

    # mark only n1 as completed
    StudentNodeProgress.objects.create(student=user, node=n1, status='Completed')

    # Build a fake request context with authenticated user
    factory = RequestFactory()
    req = factory.get('/')
    req.user = user

    ser = EnrolledCourseSerializer(course, context={'request': req})
    # both nodes have learning material, 1 completed out of 2 => 50
    assert ser.data['completion_percentage'] == 50
