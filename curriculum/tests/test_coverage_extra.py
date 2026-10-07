# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from curriculum.models import Course, Module, Node
from curriculum.permissions import IsCourseAdminOrTeacher
from curriculum.utils import normalize_correct_labels
from organizations.models import Organization, OrganizationMember, Role, Batch
from accounts.models import User
from rest_framework.test import APIRequestFactory

TEST_SECRET = "test-pass-123"

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_extra_data(db):
    org = Organization.objects.create(name="Extra Org", slug="extra-org")
    Role.objects.get_or_create(name="superadmin")
    org_admin_role, _ = Role.objects.get_or_create(name="org_admin")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    student_role, _ = Role.objects.get_or_create(name="student")
    
    admin_user = User.objects.create_user(email="admin_extra@lms.com", password=TEST_SECRET, first_name="Admin", last_name="Extra")
    teacher_user = User.objects.create_user(email="teacher_extra@lms.com", password=TEST_SECRET, first_name="Teacher", last_name="Extra")
    student_user = User.objects.create_user(email="student_extra@lms.com", password=TEST_SECRET, first_name="Student", last_name="Extra")
    
    OrganizationMember.objects.create(organization=org, user=admin_user, role=org_admin_role)
    teacher_member = OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=student_user, role=student_role)
    
    course1 = Course.objects.create(organization=org, title="Course 1", status="Published")
    course2 = Course.objects.create(organization=org, title="Course 2", status="Draft")
    
    batch = Batch.objects.create(organization=org, name="Batch 1", start_date="2024-01-01", end_date="2024-12-31")
    batch.courses.add(course1)
    
    return {
        "org": org,
        "admin_user": admin_user,
        "teacher_user": teacher_user,
        "student_user": student_user,
        "course1": course1,
        "course2": course2,
        "batch": batch,
        "teacher_member": teacher_member
    }

@pytest.mark.django_db
def test_teacher_course_filtering_direct_and_batch(api_client, setup_extra_data):
    org = setup_extra_data["org"]
    teacher_user = setup_extra_data["teacher_user"]
    teacher_member = setup_extra_data["teacher_member"]
    course1 = setup_extra_data["course1"]
    course2 = setup_extra_data["course2"]
    batch = setup_extra_data["batch"]
    
    url = reverse("course-list-create", kwargs={"org_id": org.id})
    api_client.force_authenticate(user=teacher_user)
    
    # Case 1: Teacher has no direct course or batch assigned in membership
    # But they are in the 'teachers' ManyToMany of course1
    course1.teachers.add(teacher_user)
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["id"] == course1.id
    
    # Case 2: Teacher has course assigned via ManyToMany (Modern path)
    course2.teachers.add(teacher_user)
    api_client.get(url)
    # Case 3: Teacher has batch assigned in membership
    course1.teachers.clear()
    course2.teachers.clear()
    if hasattr(teacher_member, 'batches'):
        teacher_member.batches.add(batch)
    else:
        teacher_member.batch = batch
        teacher_member.save()
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    # batch has course1
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["id"] == course1.id

@pytest.mark.django_db
def test_course_list_filters(api_client, setup_extra_data):
    org = setup_extra_data["org"]
    admin_user = setup_extra_data["admin_user"]
    
    url = reverse("course-list-create", kwargs={"org_id": org.id})
    api_client.force_authenticate(user=admin_user)
    
    # Status filter
    response = api_client.get(f"{url}?status=Draft")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["status"] == "Draft"
    
    # Search filter
    response = api_client.get(f"{url}?search=Course 1")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["title"] == "Course 1"

@pytest.mark.django_db
def test_course_detail_error_responses(api_client, setup_extra_data):
    org = setup_extra_data["org"]
    admin_user = setup_extra_data["admin_user"]
    course1 = setup_extra_data["course1"]
    
    url = reverse("course-detail", kwargs={"org_id": org.id, "course_id": course1.id})
    api_client.force_authenticate(user=admin_user)
    
    # Invalid PUT (missing required title)
    response = api_client.put(url, data={"status": "Published"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    # Invalid PATCH (testing error return path although partial=True makes it hard to hit validation errors unless data is totally garbage or uniqueness fails)
    # We'll just confirm it works for partial.
    response = api_client.patch(url, data={"title": ""})
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_module_list_search(api_client, setup_extra_data):
    org = setup_extra_data["org"]
    admin_user = setup_extra_data["admin_user"]
    course1 = setup_extra_data["course1"]
    Module.objects.create(course=course1, title="Intro Module", sequence_order=1)
    Module.objects.create(course=course1, title="Advanced Module", sequence_order=2)
    
    url = reverse("module-list-create", kwargs={"org_id": org.id, "course_id": course1.id})
    api_client.force_authenticate(user=admin_user)
    
    response = api_client.get(f"{url}?search=Intro")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 1
    assert response.data['results'][0]["title"] == "Intro Module"


@pytest.mark.django_db
def test_normalize_correct_labels_paths():
    assert normalize_correct_labels(correct_options=["A", " b ", "a"]) == ["a", "b"]
    assert normalize_correct_labels(correct_option=" C, d ") == ["c", "d"]
    assert normalize_correct_labels(correct_options=None, correct_option=None, default_label="z") == ["z"]
    assert normalize_correct_labels(correct_options=[], correct_option="", default_label="") == []


@pytest.mark.django_db
def test_course_permission_object_paths(setup_extra_data):
    org = setup_extra_data["org"]
    teacher_user = setup_extra_data["teacher_user"]
    teacher_member = setup_extra_data["teacher_member"]
    course1 = setup_extra_data["course1"]
    module = Module.objects.create(course=course1, title="Perm Module", sequence_order=1)
    node = Node.objects.create(module=module, title="Perm Node", sequence_order=1)

    teacher_member.course = course1
    teacher_member.save()

    request = APIRequestFactory().get("/")
    request.user = teacher_user
    view = type("V", (), {"kwargs": {"org_id": org.id}})()
    permission = IsCourseAdminOrTeacher()

    assert permission.has_permission(request, view)
    assert permission.has_object_permission(request, view, course1)
    assert permission.has_object_permission(request, view, module)
    assert permission.has_object_permission(request, view, node)
    assert not permission.has_object_permission(request, view, object())


@pytest.mark.django_db
def test_course_permission_edge_cases(setup_extra_data):
    org = setup_extra_data["org"]
    admin_user = setup_extra_data["admin_user"]
    teacher_user = setup_extra_data["teacher_user"]
    course1 = setup_extra_data["course1"]
    
    permission = IsCourseAdminOrTeacher()
    request = APIRequestFactory().get("/")
    
    # 1. Unauthenticated user
    from django.contrib.auth.models import AnonymousUser
    request.user = AnonymousUser()
    view = type("V", (), {"kwargs": {"org_id": org.id}})()
    assert not permission.has_permission(request, view)
    
    # 2. Missing org_id in view kwargs
    request.user = teacher_user
    view_no_org = type("V", (), {"kwargs": {}})()
    assert not permission.has_permission(request, view_no_org)
    
    # 3. Archived course permission paths
    course1.status = 'Archived'
    course1.save()
    
    # Org admin can access archived course
    view = type("V", (), {"kwargs": {"org_id": org.id}})()
    request.user = admin_user
    assert permission.has_object_permission(request, view, course1)
    
    # Teacher cannot access archived course unless they are org admin
    request.user = teacher_user
    assert not permission.has_object_permission(request, view, course1)

