# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import secrets

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from rbac.models import Role, UserRole
from rbac.serializers import RoleSerializer, UserRoleSerializer
from rbac.views import RoleViewSet, UserRoleViewSet

pytestmark = pytest.mark.django_db
User = get_user_model()
TEST_PASSWORD = secrets.token_urlsafe(16)


def _make_user(email, username, *, superuser=False):
    if superuser:
        return User.objects.create_superuser(email=email, password=TEST_PASSWORD, username=username)
    return User.objects.create_user(email, TEST_PASSWORD, username=username)


def _seed_roles(*names):
    roles = {}
    for name in names:
        roles[name] = Role.objects.get_or_create(name=name)[0]
    return roles


def _get(factory, path, user, data=None):
    request = factory.get(path, data or {})
    force_authenticate(request, user=user)
    return request


def _post(factory, path, user, data=None):
    request = factory.post(path, data or {}, format="json")
    force_authenticate(request, user=user)
    return request


def _delete(factory, path, user, data=None):
    request = factory.delete(path, data or {}, format="json")
    force_authenticate(request, user=user)
    return request


def _response_rows(response):
    data = response.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


def test_role_list_hides_superadmin_for_authenticated_non_superuser():
    factory = APIRequestFactory()
    _seed_roles("superadmin", "teacher", "student")
    user = _make_user("user@rbac.com", "user_rbac")

    view = RoleViewSet.as_view({"get": "list"})
    response = view(_get(factory, "/api/roles/", user))

    assert response.status_code == status.HTTP_200_OK

    role_names = {row["name"] for row in _response_rows(response)}
    assert "superadmin" not in role_names
    assert {"teacher", "student"} <= role_names


def test_role_list_keeps_superadmin_visible_for_superuser():
    factory = APIRequestFactory()
    _seed_roles("superadmin", "teacher", "student")
    superuser = _make_user("admin@rbac.com", "admin_rbac", superuser=True)

    view = RoleViewSet.as_view({"get": "list"})
    response = view(_get(factory, "/api/roles/", superuser))

    assert response.status_code == status.HTTP_200_OK

    role_names = {row["name"] for row in _response_rows(response)}
    assert "superadmin" in role_names


def test_org_roles_requires_org_admin_access():
    factory = APIRequestFactory()
    _seed_roles("superadmin", "org_admin", "teacher", "student")
    user = _make_user("user@rbac.com", "user_rbac")

    view = RoleViewSet.as_view({"get": "org_roles"})
    response = view(_get(factory, "/api/roles/org-roles/", user))

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_org_roles_hides_superadmin_for_org_admin():
    factory = APIRequestFactory()
    roles = _seed_roles("superadmin", "org_admin", "teacher", "student")
    org_admin = _make_user("oa@rbac.com", "oa_rbac")
    UserRole.objects.create(user=org_admin, role=roles["org_admin"])

    view = RoleViewSet.as_view({"get": "org_roles"})
    response = view(_get(factory, "/api/roles/org-roles/", org_admin))

    assert response.status_code == status.HTTP_200_OK

    role_names = [row["name"] for row in _response_rows(response)]
    assert "superadmin" not in role_names
    assert "org_admin" in role_names
    assert "teacher" in role_names
    assert "student" in role_names


def test_role_and_userrole_serializers():
    role = Role.objects.get_or_create(name="student")[0]
    user = _make_user("serializer@rbac.com", "serializer_rbac")

    role_data = RoleSerializer(role).data
    assert role_data["name"] == "student"

    serializer = UserRoleSerializer(data={"user": str(user.id), "role": role.id})
    assert serializer.is_valid(), serializer.errors
    serializer.save()

    duplicate = UserRoleSerializer(data={"user": str(user.id), "role": role.id})
    assert not duplicate.is_valid()
    assert "already has" in str(duplicate.errors)


def test_update_role_updates_existing_assignment_using_role_alias():
    factory = APIRequestFactory()
    admin = _make_user("admin@rbac.com", "admin_up", superuser=True)
    roles = _seed_roles("teacher", "student")
    user = _make_user("student@rbac.com", "student_up")
    UserRole.objects.create(user=user, role=roles["teacher"])

    view = UserRoleViewSet.as_view({"post": "update_role"})
    response = view(
        _post(
            factory,
            "/api/user-roles/update-role/",
            admin,
            {"user": user.email, "role": "student"},
        )
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["role_detail"]["name"] == "student"
    assert UserRole.objects.filter(user=user, role=roles["student"]).exists()
    assert not UserRole.objects.filter(user=user, role=roles["teacher"]).exists()


def test_update_role_rejects_duplicate_assignment():
    factory = APIRequestFactory()
    admin = _make_user("admin@rbac.com", "admin_dup", superuser=True)
    roles = _seed_roles("teacher", "student")
    user = _make_user("student@rbac.com", "student_dup")
    UserRole.objects.create(user=user, role=roles["teacher"])
    UserRole.objects.create(user=user, role=roles["student"])

    view = UserRoleViewSet.as_view({"post": "update_role"})
    response = view(
        _post(
            factory,
            "/api/user-roles/update-role/",
            admin,
            {
                "user": user.email,
                "old_role": "teacher",
                "new_role": "student",
            },
        )
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already has" in response.data["detail"]


def test_update_role_requires_old_role_when_multiple_assignments_exist():
    factory = APIRequestFactory()
    admin = _make_user("admin@rbac.com", "admin_multi", superuser=True)
    roles = _seed_roles("teacher", "student", "org_admin")
    user = _make_user("student@rbac.com", "student_multi")
    UserRole.objects.create(user=user, role=roles["teacher"])
    UserRole.objects.create(user=user, role=roles["student"])

    view = UserRoleViewSet.as_view({"post": "update_role"})
    response = view(
        _post(
            factory,
            "/api/user-roles/update-role/",
            admin,
            {"user": user.email, "new_role": "org_admin"},
        )
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "multiple roles" in response.data["detail"]


def test_update_role_updates_specific_assignment_when_old_role_is_provided():
    factory = APIRequestFactory()
    admin = _make_user("admin@rbac.com", "admin_specific", superuser=True)
    roles = _seed_roles("teacher", "student", "org_admin")
    user = _make_user("student@rbac.com", "student_specific")
    UserRole.objects.create(user=user, role=roles["teacher"])
    UserRole.objects.create(user=user, role=roles["student"])

    view = UserRoleViewSet.as_view({"post": "update_role"})
    response = view(
        _post(
            factory,
            "/api/user-roles/update-role/",
            admin,
            {
                "user": user.email,
                "old_role": "teacher",
                "new_role": "org_admin",
            },
        )
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["role_detail"]["name"] == "org_admin"
    assert UserRole.objects.filter(user=user, role=roles["org_admin"]).exists()
    assert not UserRole.objects.filter(user=user, role=roles["teacher"]).exists()


def test_delete_role_endpoint_supports_role_id_alias():
    factory = APIRequestFactory()
    admin = _make_user("admin@rbac.com", "admin_del", superuser=True)
    role_teacher = _seed_roles("teacher")["teacher"]
    user = _make_user("student@rbac.com", "student_del")
    UserRole.objects.create(user=user, role=role_teacher)

    view = UserRoleViewSet.as_view({"delete": "delete_role"})
    response = view(
        _delete(
            factory,
            "/api/user-roles/delete-role/",
            admin,
            {"user": str(user.id), "role_id": role_teacher.id},
        )
    )

    assert response.status_code == status.HTTP_200_OK
    assert "revoked" in response.data["detail"]
    assert not UserRole.objects.filter(user=user, role=role_teacher).exists()


def test_delete_role_endpoint_returns_404_when_assignment_is_missing():
    factory = APIRequestFactory()
    admin = _make_user("admin@rbac.com", "admin_missing", superuser=True)
    role_teacher = _seed_roles("teacher")["teacher"]
    user = _make_user("student@rbac.com", "student_missing")

    view = UserRoleViewSet.as_view({"delete": "delete_role"})
    response = view(
        _delete(
            factory,
            "/api/user-roles/delete-role/",
            admin,
            {"user": str(user.id), "role": role_teacher.id},
        )
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not assigned" in response.data["detail"]
