# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import datetime
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from analytics.views import StudentDashboardView
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from curriculum.models import Course, Module, Node, StudentNodeProgress, LearningMaterial
from gamification.models import GamificationProfile
from rbac.models import Role

pytestmark = pytest.mark.django_db
User = get_user_model()

def make_org_course_with_nodes(suffix=""):
    unique_id = uuid.uuid4().hex[:6]
    org = Organization.objects.create(name=f'SOrg_{suffix or unique_id}', contact_email=f's_{suffix or unique_id}@o.com')
    course = Course.objects.create(organization=org, title='SCourse', description='', status='Published')
    mod = Module.objects.create(course=course, title='M1')
    n1 = Node.objects.create(module=mod, title='N1')
    LearningMaterial.objects.create(node=n1, content_type='Link', content_url='x')
    n2 = Node.objects.create(module=mod, title='N2')
    LearningMaterial.objects.create(node=n2, content_type='Link', content_url='x')
    return org, course, mod, [n1, n2]

def test_student_dashboard_handles_no_batches():
    factory = APIRequestFactory()
    u = User.objects.create_user('stu@a.com', 'p')
    req = factory.get('/')
    req.user = u
    resp = StudentDashboardView().get(req, org_id=1)
    assert resp.status_code == 200

def test_student_dashboard_no_profile_and_no_progress():
    factory = APIRequestFactory()
    user = User.objects.create_user('stu1@x.com', 'p', username='stu1')
    org, _, _, _ = make_org_course_with_nodes()

    view = StudentDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    view.kwargs = {'org_id': org.id}

    resp = view.get(request, org.id)
    assert resp.status_code == 200
    assert isinstance(resp.data.get('progress'), list)
    assert resp.data['gamification']['points'] == 0

def test_student_dashboard_with_progress_and_profile():
    factory = APIRequestFactory()
    user = User.objects.create_user('stu2@x.com', 'p', username='stu2')
    org, course, _, nodes = make_org_course_with_nodes()

    StudentNodeProgress.objects.create(student=user, node=nodes[0], status='Completed', last_accessed=datetime.datetime.now())
    StudentNodeProgress.objects.create(student=user, node=nodes[1], status='InProgress', last_accessed=datetime.datetime.now())

    role, _ = Role.objects.get_or_create(name='student')
    org_member, _ = OrganizationMember.objects.get_or_create(organization=org, user=user, defaults={'role': role})
    GamificationProfile.objects.update_or_create(
        organization_member=org_member,
        defaults={'total_points': 150, 'current_level': 'Intermediate'}
    )

    view = StudentDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    view.kwargs = {'org_id': org.id}

    resp = view.get(request, org.id)
    assert resp.status_code == 200
    assert resp.data['gamification']['points'] == 150
    assert isinstance(resp.data.get('certificates'), list)
    assert 'resume_learning_node_id' in resp.data

def test_student_dashboard_counts_only_batch_assigned_courses():
    factory = APIRequestFactory()
    user = User.objects.create_user('stu-batch@x.com', 'p', username='stu-batch')
    org = Organization.objects.create(name=f'Dashboard Org {uuid.uuid4().hex[:6]}', contact_email='dash@o.com')
    course_1 = Course.objects.create(organization=org, title='Assigned Course', description='', status='Published')
    course_2 = Course.objects.create(organization=org, title='Unassigned Course', description='', status='Published')
    module_1 = Module.objects.create(course=course_1, title='M1')
    module_2 = Module.objects.create(course=course_2, title='M2')
    node_1 = Node.objects.create(module=module_1, title='N1')
    LearningMaterial.objects.create(node=node_1, content_type='Link', content_url='x')
    node_2 = Node.objects.create(module=module_2, title='N2')
    LearningMaterial.objects.create(node=node_2, content_type='Link', content_url='x')

    batch = Batch.objects.create(
        organization=org,
        name='Batch 1',
        start_date='2026-01-01',
        end_date='2026-12-31',
    )
    batch.courses.add(course_1)
    BatchStudent.objects.create(batch=batch, student=user, course=None)
    StudentNodeProgress.objects.create(student=user, node=node_1, status='Completed')

    view = StudentDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    view.kwargs = {'org_id': org.id}

    resp = view.get(request, org.id)

    assert resp.status_code == 200
    assert resp.data['cards']['enrolled_courses'] == 1
    assert len(resp.data['progress']) == 1
    assert resp.data['progress'][0]['course_title'] == 'Assigned Course'
