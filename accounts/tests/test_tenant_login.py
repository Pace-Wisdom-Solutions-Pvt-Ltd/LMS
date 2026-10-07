# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, OrganizationMember
from rbac.models import Role

User = get_user_model()
DEFAULT_VAL = "password123"

@pytest.mark.django_db
class TestTenantLogin:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        # Roles
        self.role_admin, _ = Role.objects.get_or_create(name="org_admin")
        
        # Organizations
        self.org_pace = Organization.objects.create(name="Pace", slug="pace")
        self.org_other = Organization.objects.create(name="Other", slug="other")
        
        # SuperAdmin
        self.superadmin = User.objects.create_superuser(
            email="super@lms.com", password=DEFAULT_VAL, username="superuser"
        )
        
        # Regular User (Pace Member)
        self.user_pace = User.objects.create_user(
            email="pace_user@lms.com", password=DEFAULT_VAL, username="paceuser"
        )
        OrganizationMember.objects.create(
            organization=self.org_pace, user=self.user_pace, role=self.role_admin
        )

    def test_superadmin_login_any_domain_success(self):
        """SuperAdmin should be allowed to log in on any domain/subdomain."""
        # Main domain
        res1 = self.client.post(reverse('login'), {"email": self.superadmin.email, "password": DEFAULT_VAL}, HTTP_HOST="localhost:5173")
        assert res1.status_code == status.HTTP_200_OK
        
        # Subdomain
        res2 = self.client.post(reverse('login'), {"email": self.superadmin.email, "password": DEFAULT_VAL}, HTTP_HOST="pace.localhost:5173")
        assert res2.status_code == status.HTTP_200_OK

    def test_regular_user_login_any_domain_success(self):
        """Regular users should be allowed to log in on any domain/subdomain."""
        # Main domain
        res1 = self.client.post(reverse('login'), {"email": self.user_pace.email, "password": DEFAULT_VAL}, HTTP_HOST="localhost:5173")
        assert res1.status_code == status.HTTP_200_OK
        
        # Assigned Subdomain
        res2 = self.client.post(reverse('login'), {"email": self.user_pace.email, "password": DEFAULT_VAL}, HTTP_HOST="pace.localhost:5173")
        assert res2.status_code == status.HTTP_200_OK
        
        # Wrong/Unassigned Subdomain
        res3 = self.client.post(reverse('login'), {"email": self.user_pace.email, "password": DEFAULT_VAL}, HTTP_HOST="other.localhost:5173")
        assert res3.status_code == status.HTTP_200_OK
        
        # Invalid/Technical Subdomain
        res4 = self.client.post(reverse('login'), {"email": self.user_pace.email, "password": DEFAULT_VAL}, HTTP_HOST="ghost.localhost:5173")
        assert res4.status_code == status.HTTP_200_OK

    def test_login_response_payload_not_filtered_by_host(self):
        """Verify that the login response returns all memberships regardless of current host."""
        # even on a 'ghost' subdomain, the user should get their 'Pace' membership info
        response = self.client.post(
            reverse('login'),
            {"email": self.user_pace.email, "password": DEFAULT_VAL},
            HTTP_HOST="ghost.localhost:5173"
        )
        assert response.status_code == status.HTTP_200_OK
        # Should see Pace organization
        orgs = response.data["organizations"]
        assert len(orgs) == 1
        assert orgs[0]["org_id"] == self.org_pace.id
