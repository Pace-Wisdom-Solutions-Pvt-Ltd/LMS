# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import secrets

import pytest
from rest_framework.test import APIClient
from rest_framework.views import APIView
from rbac.permissions import IsSuperAdmin, IsAdmin
from django.contrib.auth import get_user_model

TEST_PASSWORD = secrets.token_urlsafe(16)

@pytest.mark.django_db
def test_is_super_admin():
    user = get_user_model().objects.create_user(email="admin@rbac.com", password=TEST_PASSWORD, is_superuser=True)
    request = APIClient().request()
    request.user = user

    permission = IsSuperAdmin()
    assert permission.has_permission(request, APIView())

@pytest.mark.django_db
def test_is_admin():
    user = get_user_model().objects.create_user(email="admin@rbac.com", password=TEST_PASSWORD)
    request = APIClient().request()
    request.user = user

    # Mock roles
    from rbac.models import Role, UserRole
    # permission expects role name 'admin' (legacy check); create it for tests
    role, _ = Role.objects.get_or_create(name="admin", defaults={"description": "Admin"})
    UserRole.objects.create(user=user, role=role)

    permission = IsAdmin()
    assert permission.has_permission(request, APIView())

# Added tests for uncovered lines in rbac/permissions.py
@pytest.mark.django_db
def test_is_teacher_permission():
    from rbac.permissions import IsTeacher
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="teacher@rbac.com", password=TEST_PASSWORD)
    from rbac.models import Role, UserRole
    role, _ = Role.objects.get_or_create(name="teacher", defaults={"description": "Teacher"})
    UserRole.objects.create(user=user, role=role)

    request = APIClient().request()
    request.user = user

    permission = IsTeacher()
    assert permission.has_permission(request, None)

# Added tests for uncovered lines in rbac/permissions.py
@pytest.mark.django_db
def test_is_admin_permission():
    from rbac.permissions import IsAdmin
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="admin@rbac.com", password=TEST_PASSWORD)
    from rbac.models import Role, UserRole
    role, _ = Role.objects.get_or_create(name="admin", defaults={"description": "Admin"})
    UserRole.objects.create(user=user, role=role)

    request = APIClient().request()
    request.user = user

    permission = IsAdmin()
    assert permission.has_permission(request, None)
