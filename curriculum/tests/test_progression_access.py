# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from curriculum.models import Course, Module, Node, LearningMaterial, StudentNodeProgress
from organizations.models import Organization, Batch, BatchStudent, OrganizationMember
from rbac.models import Role

User = get_user_model()

@pytest.mark.django_db
def test_sequential_module_and_node_progression():
    client = APIClient()
    student = User.objects.create_user(email="student@progression.com", password="password123")
    client.force_authenticate(student)

    # 1. Setup Organization, Course, Modules, and Nodes
    org = Organization.objects.create(name="Progression Org", slug="prog-org", contact_email="prog@org.com")
    course = Course.objects.create(title="Progression Course", organization=org, status="Published")

    # Create OrganizationMember for student
    student_role, _ = Role.objects.get_or_create(name="student")
    member = OrganizationMember.objects.create(organization=org, user=student, role=student_role)

    # Module 1
    m1 = Module.objects.create(title="Module 1", course=course, sequence_order=1)
    # Node 1: Header (not completable)
    n1 = Node.objects.create(title="M1 Header", module=m1, sequence_order=1)
    # Node 2: Completable (has learning material)
    n2 = Node.objects.create(title="M1 Node 2", module=m1, sequence_order=2)
    LearningMaterial.objects.create(node=n2, content_type="Link", content_url="https://example.com")
    # Node 3: Completable (has learning material)
    n3 = Node.objects.create(title="M1 Node 3", module=m1, sequence_order=3)
    LearningMaterial.objects.create(node=n3, content_type="Link", content_url="https://example.com")

    # Module 2
    m2 = Module.objects.create(title="Module 2", course=course, sequence_order=2)
    # Node 4: Completable
    n4 = Node.objects.create(title="M2 Node 4", module=m2, sequence_order=1)
    LearningMaterial.objects.create(node=n4, content_type="Link", content_url="https://example.com")

    # Enroll student in the course/batch
    batch = Batch.objects.create(
        organization=org,
        name="Batch A",
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
    )
    batch.courses.add(course)
    BatchStudent.objects.create(batch=batch, student=member)

    roadmap_url = f"/api/organizations/{org.id}/courses/{course.id}/roadmap/"

    # --- Step 1: Initial state (no progress) ---
    res = client.get(roadmap_url)
    assert res.status_code == status.HTTP_200_OK
    modules_data = res.data["modules"]
    
    assert modules_data[0]["id"] == m1.id
    assert modules_data[0]["is_accessible"] is True
    
    nodes_m1 = {node["id"]: node for node in modules_data[0]["nodes"]}
    # n1 is not in nodes_m1 because it's a non-completable section header
    assert nodes_m1[n2.id]["is_accessible"] is True
    assert nodes_m1[n3.id]["is_accessible"] is False

    assert modules_data[1]["id"] == m2.id
    assert modules_data[1]["is_accessible"] is False
    assert modules_data[1]["nodes"][0]["is_accessible"] is False

    # Verify NodeDetail GET API endpoint locks
    res_n3 = client.get(f"/api/organizations/{org.id}/courses/{course.id}/modules/{m1.id}/nodes/{n3.id}/")
    assert res_n3.status_code == status.HTTP_403_FORBIDDEN
    assert "locked" in res_n3.data["detail"]

    # --- Step 2: Complete the first completable node (n2) ---
    StudentNodeProgress.objects.create(student=member, node=n2, status="Completed")

    res = client.get(roadmap_url)
    assert res.status_code == status.HTTP_200_OK
    modules_data = res.data["modules"]
    nodes_m1 = {node["id"]: node for node in modules_data[0]["nodes"]}
    assert nodes_m1[n3.id]["is_accessible"] is True
    assert modules_data[1]["is_accessible"] is False

    # Verify NodeDetail GET API is now unlocked for n3
    res_n3 = client.get(f"/api/organizations/{org.id}/courses/{course.id}/modules/{m1.id}/nodes/{n3.id}/")
    assert res_n3.status_code == status.HTTP_200_OK

    # Verify n4 is still locked
    res_n4 = client.get(f"/api/organizations/{org.id}/courses/{course.id}/modules/{m2.id}/nodes/{n4.id}/")
    assert res_n4.status_code == status.HTTP_403_FORBIDDEN
    assert "previous module" in res_n4.data["detail"]

    # --- Step 3: Complete the remaining completable node (n3) in Module 1 ---
    StudentNodeProgress.objects.create(student=member, node=n3, status="Completed")

    res = client.get(roadmap_url)
    assert res.status_code == status.HTTP_200_OK
    modules_data = res.data["modules"]
    assert modules_data[1]["is_accessible"] is True
    assert modules_data[1]["nodes"][0]["is_accessible"] is True

    # Verify NodeDetail GET API is now unlocked for n4
    res_n4 = client.get(f"/api/organizations/{org.id}/courses/{course.id}/modules/{m2.id}/nodes/{n4.id}/")
    assert res_n4.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_staff_progression_bypass():
    client = APIClient()
    superuser = User.objects.create_superuser(email="admin@progression.com", password="password123")
    client.force_authenticate(superuser)

    org = Organization.objects.create(name="Progression Org 2", slug="prog-org-2", contact_email="prog2@org.com")
    course = Course.objects.create(title="Progression Course 2", organization=org, status="Published")

    m1 = Module.objects.create(title="Module 1", course=course, sequence_order=1)
    n1 = Node.objects.create(title="M1 Header", module=m1, sequence_order=1)
    n2 = Node.objects.create(title="M1 Node 2", module=m1, sequence_order=2)
    LearningMaterial.objects.create(node=n2, content_type="Link", content_url="https://example.com")

    m2 = Module.objects.create(title="Module 2", course=course, sequence_order=2)
    n3 = Node.objects.create(title="M2 Node 3", module=m2, sequence_order=1)
    LearningMaterial.objects.create(node=n3, content_type="Link", content_url="https://example.com")

    roadmap_url = f"/api/organizations/{org.id}/courses/{course.id}/roadmap/"

    # Staff should have everything unlocked immediately without batch enrollment or completion progress
    res = client.get(roadmap_url)
    assert res.status_code == status.HTTP_200_OK
    modules_data = res.data["modules"]
    
    assert modules_data[0]["is_accessible"] is True
    assert modules_data[0]["nodes"][0]["is_accessible"] is True
    assert modules_data[1]["is_accessible"] is True
    assert modules_data[1]["nodes"][0]["is_accessible"] is True

    # Detail endpoints should also bypass progression restrictions
    res_n3 = client.get(f"/api/organizations/{org.id}/courses/{course.id}/modules/{m2.id}/nodes/{n3.id}/")
    assert res_n3.status_code == status.HTTP_200_OK
