# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import secrets

import pytest
from django.contrib.auth import get_user_model
from rbac.permissions import _get_user_roles, IsSuperAdmin, IsAdmin, IsOrgAdmin, IsTeacher, IsStudent, IsSelf
from rbac.models import Role, UserRole
from organizations.models import Organization, OrganizationMember

from types import SimpleNamespace

pytestmark = pytest.mark.django_db
User = get_user_model()
TEST_PASSWORD = secrets.token_urlsafe(16)


def make_request_with_user(user):
    return SimpleNamespace(user=user)


def test_get_user_roles_and_caching():
    user = User.objects.create_user('p@r.com', TEST_PASSWORD, username='puser')
    role = Role.objects.get_or_create(name='teacher')[0]
    UserRole.objects.create(user=user, role=role)

    req = make_request_with_user(user)
    roles = _get_user_roles(req)
    assert 'teacher' in roles
    # cached value reused
    req.user = user
    roles2 = _get_user_roles(req)
    assert roles2 is roles


def test_permissions_superuser_and_roles():
    admin = User.objects.create_superuser('su@r.com', TEST_PASSWORD, username='su')
    req = make_request_with_user(admin)
    assert IsSuperAdmin().has_permission(req, None)
    assert IsAdmin().has_permission(req, None)
    assert IsTeacher().has_permission(req, None)
    assert IsStudent().has_permission(req, None)

    # normal user without roles
    u = User.objects.create_user('n@r.com', TEST_PASSWORD, username='nu')
    req2 = make_request_with_user(u)
    assert not IsSuperAdmin().has_permission(req2, None)
    assert not IsAdmin().has_permission(req2, None)
    assert not IsTeacher().has_permission(req2, None)
    assert not IsStudent().has_permission(req2, None)

    # grant admin role
    r_admin = Role.objects.get_or_create(name='admin')[0]
    UserRole.objects.create(user=u, role=r_admin)
    # re-evaluate with a fresh request to avoid cached empty roles
    req2 = make_request_with_user(u)
    assert IsAdmin().has_permission(req2, None)

    # grant teacher role
    r_teacher = Role.objects.get_or_create(name='teacher')[0]
    UserRole.objects.create(user=u, role=r_teacher)
    req2 = make_request_with_user(u)
    assert IsTeacher().has_permission(req2, None)

    # grant student role
    r_student = Role.objects.get_or_create(name='student')[0]
    UserRole.objects.create(user=u, role=r_student)
    req2 = make_request_with_user(u)
    assert IsStudent().has_permission(req2, None)


def test_permissions_org_admin_membership_fallback_and_is_self():
    org_admin_role = Role.objects.get_or_create(name='org_admin')[0]
    user = User.objects.create_user('orgadmin@r.com', TEST_PASSWORD, username='orgadmin')
    org = Organization.objects.create(name="RBAC Org", slug="rbac-org")
    OrganizationMember.objects.create(organization=org, user=user, role=org_admin_role, is_active=True)

    req = make_request_with_user(user)
    assert IsOrgAdmin().has_permission(req, None)

    other = User.objects.create_user('other@r.com', TEST_PASSWORD, username='other')
    assert IsSelf().has_object_permission(req, None, user)
    assert not IsSelf().has_object_permission(req, None, other)


def test_get_user_roles_returns_empty_for_anonymous():
    anon = SimpleNamespace(is_authenticated=False)
    req = SimpleNamespace(user=anon)
    assert _get_user_roles(req) == set()
