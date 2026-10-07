# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from accounts.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_staff(db):
    org = Organization.objects.create(name="Filter Org", slug="filter-org")
    admin_role = Role.objects.get(name='org_admin')
    teacher_role = Role.objects.get(name='teacher')
    
    admin_user = User.objects.create_user(email="admin@filter.com", password="password123")
    teacher_user = User.objects.create_user(email="teacher@filter.com", password="password123")
    
    OrganizationMember.objects.create(organization=org, user=admin_user, role=admin_role)
    OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    
    return org, admin_user, teacher_user

@pytest.mark.django_db
class TestStaffFilter:
    def test_filter_staff_by_role(self, api_client, setup_staff):
        org, admin, _ = setup_staff
        url = reverse('organization-staff-list', kwargs={'org_pk': org.id})
        
        # Authenticate as admin
        api_client.force_authenticate(user=admin)
        
        # 1. No filter - should return both (admin and teacher)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Check results in paginated response
        assert response.data['count'] == 2
        
        # 2. Filter by org_admin
        response = api_client.get(url, {'role': 'org_admin'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['role_detail']['name'] == 'org_admin'
        
        # 3. Filter by teacher
        response = api_client.get(url, {'role': 'teacher'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['role_detail']['name'] == 'teacher'
        
        # 4. Invalid role filter - should return empty list (or all, but based on code it filters)
        response = api_client.get(url, {'role': 'student'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
