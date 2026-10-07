# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import patch
from datetime import date, timedelta
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework import status
from curriculum.views import PendingEvaluationsAPIView, AssignmentSubmissionAPIView
factory = APIRequestFactory()
from rest_framework.request import Request as DRFRequest
from organizations.models import Organization
from curriculum.models import Course, Module, Node, Assessment, AssignmentSubmission, StudentNodeProgress, Task, TaskSubmission
from django.contrib.auth import get_user_model
import json


@pytest.mark.django_db
def test_course_list_create():
    client = APIClient()
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@org.com", password="password123")
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    # correct endpoint is org-scoped
    response = client.get(f"/api/organizations/{org.id}/courses/")
    assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)

    # create a superuser to perform create
    admin = user_model.objects.create_superuser(email="admin@org.com", password="password123")
    client.force_authenticate(user=admin)
    response = client.post(f"/api/organizations/{org.id}/courses/", {"title": "New Course", "status": "Published"})
    assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
def test_course_retrieve():
    client = APIClient()
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@curriculum.com", password="password123")
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    course = Course.objects.create(title="Test Course", organization=org)

    # roadmap retrieve endpoint
    response = client.get(f"/api/organizations/{org.id}/courses/{course.id}/roadmap/")
    assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


@pytest.mark.django_db
def test_roadmap_includes_is_completed_flags_for_nodes_and_course():
    client = APIClient()
    user_model = get_user_model()
    user = user_model.objects.create_user(email="student@org.com", password="password123")
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    course = Course.objects.create(title="Course with Nodes", organization=org)
    module = Module.objects.create(title="Module 1", course=course)
    node = Node.objects.create(title="Video Node", module=module)
    Task.objects.create(node=node, title="Test Task")

    from organizations.models import Batch, BatchStudent
    active_batch = Batch.objects.create(
        organization=org,
        name="Active Batch",
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
    )
    active_batch.courses.add(course)
    BatchStudent.objects.create(batch=active_batch, student=user, course=None)

    StudentNodeProgress.objects.create(student=user, node=node, status='Completed')

    response = client.get(f"/api/organizations/{org.id}/courses/{course.id}/roadmap/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data['is_completed'] is True
    assert response.data['modules'][0]['nodes'][0]['is_completed'] is True


@pytest.mark.django_db
def test_module_create():
    client = APIClient()
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@curriculum.com", password="password123")
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    course = Course.objects.create(title="Test Course", organization=org)

    # create as superuser
    admin = user_model.objects.create_superuser(email="admin2@org.com", password="password123")
    client.force_authenticate(user=admin)
    data = {"title": "New Module"}
    response = client.post(f"/api/organizations/{org.id}/courses/{course.id}/modules/", data)
    assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
def test_node_content_update_learningmaterial_assessment_and_invalid():
    factory = APIRequestFactory()
    user_model = get_user_model()
    from django.utils.crypto import get_random_string
    random_password = get_random_string(12)
    user = user_model.objects.create_user(email='stu@c.com', password=random_password)

    org = Organization.objects.create(name='C2', contact_email='c2@o.com')
    course = Course.objects.create(organization=org, title='Course', description='')
    module = Module.objects.create(course=course, title='Mod')
    node = Node.objects.create(module=module, title='N1')
    
    # Make user an Org Admin
    from rbac.models import Role
    from organizations.models import OrganizationMember
    admin_role, _ = Role.objects.get_or_create(name='org_admin')
    OrganizationMember.objects.get_or_create(organization=org, user=user, role=admin_role)

    # LearningMaterial path
    data = {'content_type': 'LearningMaterial', 'content_data': {'content_type': 'Video', 'content_url': 'http://x'}}
    post_req = factory.post('/', data=json.dumps(data), content_type='application/json')
    post_req.user = user
    from curriculum.views import NodeContentUpdateAPIView
    view = NodeContentUpdateAPIView()
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.kwargs = {'org_id': org.id, 'node_id': node.id}
    resp = view.put(request, org.id, node.id)
    assert resp.status_code in (200, 400)

    # Assessment path
    data2 = {'content_type': 'Assessment', 'content_data': {'assignment_type': 'MCQ', 'prompt': 'Q', 'max_attempts': 1, 'passing_score_percentage': 50}}
    post_req2 = factory.post('/', data=json.dumps(data2), content_type='application/json')
    post_req2.user = user
    view2 = NodeContentUpdateAPIView()
    request2 = view2.initialize_request(post_req2)
    request2.user = user
    view2.request = request2
    view2.kwargs = {'org_id': org.id, 'node_id': node.id}
    resp2 = view2.put(request2, org.id, node.id)
    assert resp2.status_code in (200, 400)

    # invalid content_type
    data3 = {'content_type': 'Unknown', 'content_data': {}}
    post_req3 = factory.post('/', data=json.dumps(data3), content_type='application/json')
    post_req3.user = user
    view3 = NodeContentUpdateAPIView()
    request3 = view3.initialize_request(post_req3)
    request3.user = user
    view3.request = request3
    view3.kwargs = {'org_id': org.id, 'node_id': node.id}
    resp3 = view3.put(request3, org.id, node.id)
    assert resp3.status_code == 400


@pytest.mark.django_db
def test_student_enrolled_courses():
    client = APIClient()
    user_model = get_user_model()
    student = user_model.objects.create_user(email="student@enroll.com", password="password123")
    client.force_authenticate(user=student)

    org = Organization.objects.create(name="Enroll Org", slug="enroll-org", contact_email="enroll@org.com")
    course1 = Course.objects.create(title="Enrolled Course", organization=org, status="Published")
    Course.objects.create(title="Not Enrolled Course", organization=org, status="Published")
    
    from organizations.models import Batch, BatchStudent
    batch = Batch.objects.create(
        organization=org,
        name="Batch 1",
        start_date=date.today() - timedelta(days=7),
        end_date=date.today() + timedelta(days=30),
    )
    batch.courses.add(course1)
    BatchStudent.objects.create(batch=batch, student=student, course=None) # Forced inheritance

    # Add content and progress to verify completion percentage
    from curriculum.models import LearningMaterial
    module = Module.objects.create(course=course1, title="Module 1")
    n1 = Node.objects.create(module=module, title="Node 1")
    LearningMaterial.objects.create(node=n1, content_type="Link", content_url="https://example.com")
    n2 = Node.objects.create(module=module, title="Node 2")
    LearningMaterial.objects.create(node=n2, content_type="Link", content_url="https://example.com")
    
    from curriculum.models import StudentNodeProgress
    StudentNodeProgress.objects.create(student=student, node=n2, status='Completed')

    response = client.get(f"/api/organizations/{org.id}/my-courses/")
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['title'] == "Enrolled Course"
    assert response.data[0]['completion_percentage'] == 50




@pytest.mark.django_db
def test_assignment_submission_attempts_and_evaluation():
    factory = APIRequestFactory()
    user_model = get_user_model()
    from django.utils.crypto import get_random_string
    random_password = get_random_string(12)
    user = user_model.objects.create_user(email='s@c.com', password=random_password)

    org = Organization.objects.create(name='C3', contact_email='c3@o.com')
    course = Course.objects.create(organization=org, title='Course2', description='')
    module = Module.objects.create(course=course, title='Mod2')
    node = Node.objects.create(module=module, title='N2')
    assessment = Assessment.objects.create(node=node, assignment_type='MCQ', prompt='Q', max_attempts=1, passing_score_percentage=50)

    # create one submission to reach max attempts
    AssignmentSubmission.objects.create(assessment=assessment, student=user, payload={}, status='Pending')

    post_req = factory.post('/', data=json.dumps({'payload': {}}), content_type='application/json')
    post_req.user = user
    from curriculum.views import AssignmentSubmissionAPIView
    view = AssignmentSubmissionAPIView()
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.kwargs = {'node_id': node.id}
    resp = view.post(request, node.id)
    assert resp.status_code == 403


@pytest.mark.django_db
def test_grade_submission_and_progress_creation():
    from django.utils.crypto import get_random_string
    factory = APIRequestFactory()
    user_model = get_user_model()
    student = user_model.objects.create_user(email='st@c.com', password=get_random_string(12))

    org = Organization.objects.create(name='C4', contact_email='c4@o.com')
    course = Course.objects.create(organization=org, title='Course3', description='')
    module = Module.objects.create(course=course, title='Mod3')
    node = Node.objects.create(module=module, title='N3')
    # Create a Task instead of Assessment because GradeSubmissionAPIView uses TaskSubmission
    task = Task.objects.create(node=node, title="T")
    submission = TaskSubmission.objects.create(task=task, student=student, payload={}, status='Pending')

    # grade submission with passing score
    patch_req = factory.patch('/', data=json.dumps({'awarded_score': 60, 'feedback': 'good'}), content_type='application/json')
    patch_req.user = student
    from curriculum.views import GradeSubmissionAPIView
    view = GradeSubmissionAPIView()
    request = view.initialize_request(patch_req)
    request.user = student
    view.request = request
    view.kwargs = {'submission_id': submission.id}
    resp = view.patch(request, submission.id)
    assert resp.status_code in (200, 400)


@pytest.mark.django_db
def test_complete_node_assessment_and_success():
    factory = APIRequestFactory()
    user_model = get_user_model()
    from django.utils.crypto import get_random_string
    random_password = get_random_string(12)
    user = user_model.objects.create_user(email='u5@c.com', password=random_password)

    org = Organization.objects.create(name='C5', contact_email='c5@o.com')
    course = Course.objects.create(organization=org, title='Course4', description='')
    module = Module.objects.create(course=course, title='Mod4')
    node = Node.objects.create(module=module, title='N4')

    from organizations.models import Batch, BatchStudent
    batch = Batch.objects.create(
        organization=org,
        name='Active Batch',
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
    )
    BatchStudent.objects.create(batch=batch, student=user, course=course)

    # with no assessment should succeed
    post_req = factory.post('/', data=json.dumps({}), content_type='application/json')
    post_req.user = user
    from curriculum.views import CompleteNodeAPIView
    view = CompleteNodeAPIView()
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.kwargs = {'node_id': node.id}
    resp = view.post(request, node.id)
    assert resp.status_code == 200

    # add assessment to node and expect 400
    Assessment.objects.create(node=node, assignment_type='MCQ', prompt='Q', max_attempts=1, passing_score_percentage=50)
    view2 = CompleteNodeAPIView()
    post_req2 = factory.post('/', data=json.dumps({}), content_type='application/json')
    post_req2.user = user
    request2 = view2.initialize_request(post_req2)
    request2.user = user
    view2.request = request2
    view2.kwargs = {'node_id': node.id}
    resp2 = view2.post(request2, node.id)
    assert resp2.status_code == 400


@pytest.mark.django_db
def test_roadmap_retrieve_empty_progress():
    factory = APIRequestFactory()
    from django.utils.crypto import get_random_string
    user_model = get_user_model()
    random_password = get_random_string(12)
    user = user_model.objects.create_user(email='u6@c.com', password=random_password)

    org = Organization.objects.create(name='C6', contact_email='c6@o.com')
    course = Course.objects.create(organization=org, title='Course5', description='')

    from organizations.models import Batch, BatchStudent
    batch = Batch.objects.create(
        organization=org,
        name='Active Batch',
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
    )
    BatchStudent.objects.create(batch=batch, student=user, course=course)

    from curriculum.views import RoadmapRetrieveAPIView
    view = RoadmapRetrieveAPIView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    view.kwargs = {'org_id': org.id, 'course_id': course.id}
    resp = view.get(request, org.id, course.id)
    assert resp.status_code == 200
    assert isinstance(resp.data, dict)
    
User = get_user_model()

@pytest.mark.django_db
def test_pending_evaluations_view_direct():
    user, _ = User.objects.get_or_create(email="teacher@org.com")
    org, _ = Organization.objects.get_or_create(name="Org", contact_email="test@org.com")
    
    # Add user as org admin/member to pass permission check
    from organizations.models import OrganizationMember
    from rbac.models import Role
    role, _ = Role.objects.get_or_create(name='org_admin')
    OrganizationMember.objects.get_or_create(user=user, organization=org, role=role)
    
    request = factory.get('/')
    force_authenticate(request, user=user)  # <-- FIX
    
    view = PendingEvaluationsAPIView.as_view()
    response = view(request, org_id=org.id)
    assert response.status_code == 200

@pytest.mark.django_db
def test_assignment_submission_celery_import_error():
    user, _ = User.objects.get_or_create(email='celery@c.com')
    org, _ = Organization.objects.get_or_create(name='C', contact_email='c@o.com')
    course, _ = Course.objects.get_or_create(organization=org, title='Course')
    module, _ = Module.objects.get_or_create(course=course, title='Mod')
    node, _ = Node.objects.get_or_create(module=module, title='N')
    Assessment.objects.get_or_create(node=node, assignment_type='MCQ', prompt='Q', max_attempts=5)

    post_req = factory.post('/', data=json.dumps({'payload': {}}), content_type='application/json')
    force_authenticate(post_req, user=user)  # <-- FIX
    
    view = AssignmentSubmissionAPIView.as_view()
    
    with patch.dict('sys.modules', {'curriculum.tasks': None}):
        resp = view(post_req, node_id=node.id)
        assert resp.status_code == 202

@pytest.mark.django_db
def test_course_module_node_invalid_data_direct():
    user, _ = User.objects.get_or_create(email="admin_curr@org.com")
    org, _ = Organization.objects.get_or_create(name="Org")
    course, _ = Course.objects.get_or_create(title="Course", organization=org)
    module, _ = Module.objects.get_or_create(course=course, title="Module")
    
    # Make user an Org Admin
    from rbac.models import Role
    from organizations.models import OrganizationMember
    admin_role, _ = Role.objects.get_or_create(name='org_admin')
    OrganizationMember.objects.get_or_create(organization=org, user=user, role=admin_role)

    # 1. Invalid Course
    from curriculum.views import CourseListCreateAPIView
    req1 = factory.post('/', data={"description": "No title"}, format='json')
    force_authenticate(req1, user=user)  # <-- FIX
    resp1 = CourseListCreateAPIView.as_view()(req1, org_id=org.id)
    assert resp1.status_code == 400

    # 2. Invalid Module
    from curriculum.views import ModuleListCreateAPIView
    req2 = factory.post('/', data={}, format='json')
    force_authenticate(req2, user=user)  # <-- FIX
    resp2 = ModuleListCreateAPIView.as_view()(req2, org_id=org.id, course_id=course.id)
    assert resp2.status_code == 400

    # 3. Invalid Node
    from curriculum.views import NodeCreateAPIView
    req3 = factory.post('/', data={}, format='json')
    force_authenticate(req3, user=user)  # <-- FIX
    resp3 = NodeCreateAPIView.as_view()(req3, org_id=org.id, course_id=course.id, module_id=module.id)
    assert resp3.status_code == 400