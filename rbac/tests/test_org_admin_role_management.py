# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from organizations.models import Organization, OrganizationMember
from rbac.models import Role, UserRole
from rbac.views import UserRoleViewSet

pytestmark = pytest.mark.django_db
User = get_user_model()
TEST_VAL = "testpassword123"

def _make_user(email, username):
    return User.objects.create_user(email=email, password=TEST_VAL, username=username)

def _seed_roles(*names):
    roles = {}
    for name in names:
        roles[name] = Role.objects.get_or_create(name=name)[0]
    return roles

def test_org_admin_role_filtering_and_actions():
    factory = APIRequestFactory()
    roles = _seed_roles("superadmin", "org_admin", "teacher", "student")
    
    org1 = Organization.objects.create(name="Org 1", slug="org-1")
    org2 = Organization.objects.create(name="Org 2", slug="org-2")
    
    # Users
    oa = _make_user("oa@test.com", "oa")
    teacher1 = _make_user("t1@test.com", "t1")
    student2 = _make_user("s2@test.com", "s2")
    sa = User.objects.create_superuser(email="sa@test.com", password=TEST_VAL, username="sa")
    
    # OA is Org Admin of Org 1
    OrganizationMember.objects.create(organization=org1, user=oa, role=roles["org_admin"])
    # OA has org_admin role in UserRole too
    UserRole.objects.create(user=oa, role=roles["org_admin"])
    
    # Teacher 1 is in Org 1
    OrganizationMember.objects.create(organization=org1, user=teacher1, role=roles["teacher"])
    UserRole.objects.create(user=teacher1, role=roles["teacher"])
    
    # Student 2 is in Org 2
    OrganizationMember.objects.create(organization=org2, user=student2, role=roles["student"])
    UserRole.objects.create(user=student2, role=roles["student"])
    
    # Superadmin UserRole (already created by django signals due to is_superuser=True)
    UserRole.objects.get_or_create(user=sa, role=roles["superadmin"])
    
    view = UserRoleViewSet.as_view({"get": "list"})
    
    # 1. OA lists roles - should see teacher1's role but NOT student2's role or superadmin's role
    request = factory.get("/api/user-roles/")
    force_authenticate(request, user=oa)
    resp = view(request)
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
    user_ids = [r["user_detail"]["id"] for r in results]
    assert str(teacher1.id) in user_ids
    assert str(student2.id) not in user_ids
    assert str(sa.id) not in user_ids
    
    # 2. OA queries with email query param
    request = factory.get("/api/user-roles/", {"user": "t1@test.com"})
    force_authenticate(request, user=oa)
    resp = view(request)
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
    assert len(results) == 1
    assert results[0]["user_detail"]["email"] == "t1@test.com"

    # 3. OA queries external user email - should return empty list
    request = factory.get("/api/user-roles/", {"user": "s2@test.com"})
    force_authenticate(request, user=oa)
    resp = view(request)
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
    assert len(results) == 0

    # 4. OA tries to assign student role to teacher1 (already in organization) - SUCCESS
    view_create = UserRoleViewSet.as_view({"post": "create"})
    request = factory.post("/api/user-roles/", {"user": str(teacher1.id), "role": roles["student"].id}, format="json")
    force_authenticate(request, user=oa)
    resp = view_create(request)
    assert resp.status_code == status.HTTP_201_CREATED
    
    # 5. OA tries to assign superadmin role to teacher1 - FORBIDDEN
    request = factory.post("/api/user-roles/", {"user": str(teacher1.id), "role": roles["superadmin"].id}, format="json")
    force_authenticate(request, user=oa)
    resp = view_create(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # 6. OA tries to assign student role to student2 (not in organization) - FORBIDDEN
    request = factory.post("/api/user-roles/", {"user": str(student2.id), "role": roles["teacher"].id}, format="json")
    force_authenticate(request, user=oa)
    resp = view_create(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # 7. OA tries to update teacher1's role to org_admin - SUCCESS
    view_update = UserRoleViewSet.as_view({"post": "update_role"})
    request = factory.post("/api/user-roles/update-role/", {"user": teacher1.email, "old_role": "teacher", "new_role": "org_admin"}, format="json")
    force_authenticate(request, user=oa)
    resp = view_update(request)
    assert resp.status_code == status.HTTP_200_OK

    # 8. OA tries to update teacher1's role to superadmin - FORBIDDEN
    request = factory.post("/api/user-roles/update-role/", {"user": teacher1.email, "old_role": "student", "new_role": "superadmin"}, format="json")
    force_authenticate(request, user=oa)
    resp = view_update(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # 9. OA tries to delete student2's role - FORBIDDEN
    view_delete = UserRoleViewSet.as_view({"delete": "delete_role"})
    request = factory.delete("/api/user-roles/delete-role/", {"user": student2.email, "role": "student"}, format="json")
    force_authenticate(request, user=oa)
    resp = view_delete(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # 10. OA tries to delete teacher1's role - SUCCESS
    request = factory.delete("/api/user-roles/delete-role/", {"user": teacher1.email, "role": "student"}, format="json")
    force_authenticate(request, user=oa)
    resp = view_delete(request)
    assert resp.status_code == status.HTTP_200_OK

    # 11. OA tries to self-assign a role - FORBIDDEN
    request = factory.post("/api/user-roles/", {"user": str(oa.id), "role": roles["teacher"].id}, format="json")
    force_authenticate(request, user=oa)
    resp = view_create(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # 12. OA tries to self-update their own role - FORBIDDEN
    request = factory.post("/api/user-roles/update-role/", {"user": oa.email, "old_role": "org_admin", "new_role": "teacher"}, format="json")
    force_authenticate(request, user=oa)
    resp = view_update(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # 13. OA tries to self-delete their own role - FORBIDDEN
    request = factory.delete("/api/user-roles/delete-role/", {"user": oa.email, "role": "org_admin"}, format="json")
    force_authenticate(request, user=oa)
    resp = view_delete(request)
    assert resp.status_code == status.HTTP_403_FORBIDDEN
