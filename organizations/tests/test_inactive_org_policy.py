# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, OrganizationMember
from rbac.models import Role

@pytest.fixture
def setup_policy_test(db):
    # Setup Roles
    _, _ = Role.objects.get_or_create(name="superadmin")
    org_admin_role, _ = Role.objects.get_or_create(name="org_admin")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")
    student_role, _ = Role.objects.get_or_create(name="student")

    # Setup Organizations
    active_org = Organization.objects.create(name="Active Org", slug="active-org", contact_email="active@org.com", is_active=True)
    inactive_org = Organization.objects.create(name="Inactive Org", slug="inactive-org", contact_email="inactive@org.com", is_active=False)

    # Setup Users
    super_admin = User.objects.create_user(email="super@admin.com", password="password123", is_superuser=True)
    active_org_admin = User.objects.create_user(email="active_admin@org.com", password="password123")
    inactive_org_admin = User.objects.create_user(email="inactive_admin@org.com", password="password123")
    multi_org_user = User.objects.create_user(email="multi@user.com", password="password123")

    # Member Assignments
    OrganizationMember.objects.create(user=active_org_admin, organization=active_org, role=org_admin_role)
    OrganizationMember.objects.create(user=inactive_org_admin, organization=inactive_org, role=org_admin_role)
    
    # Multi-org user: belongs to both an active and an inactive organization
    OrganizationMember.objects.create(user=multi_org_user, organization=active_org, role=teacher_role)
    OrganizationMember.objects.create(user=multi_org_user, organization=inactive_org, role=student_role)

    return {
        "active_org": active_org,
        "inactive_org": inactive_org,
        "super_admin": super_admin,
        "active_org_admin": active_org_admin,
        "inactive_admin": inactive_org_admin,
        "multi_user": multi_org_user,
    }

@pytest.mark.django_db
class TestInactiveOrgPolicy:
    def test_super_admin_login_always_allowed(self, setup_policy_test):
        client = APIClient()
        response = client.post(reverse('login'), {
            "email": "super@admin.com",
            "password": "password123"
        })
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_active_org_admin_login_allowed(self, setup_policy_test):
        client = APIClient()
        response = client.post(
            reverse('login'), 
            {"email": "active_admin@org.com", "password": "password123"},
            HTTP_HOST="active-org.localhost"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_inactive_org_admin_login_allowed_but_no_orgs(self, setup_policy_test):
        client = APIClient()
        response = client.post(
            reverse('login'), 
            {"email": "inactive_admin@org.com", "password": "password123"},
            HTTP_HOST="inactive-org.localhost"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        # Tenant is inactive, so user has no active memberships and is blocked from login
        assert "Your account or organization is currently inactive" in response.data["detail"]

    def test_multi_org_user_login_allowed_but_filters_inactive(self, setup_policy_test):
        client = APIClient()
        response = client.post(
            reverse('login'), 
            {"email": "multi@user.com", "password": "password123"},
            HTTP_HOST="active-org.localhost"
        )
        assert response.status_code == status.HTTP_200_OK

