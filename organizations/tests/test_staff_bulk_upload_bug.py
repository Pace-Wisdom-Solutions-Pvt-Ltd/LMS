# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import io
import pandas as pd
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
def setup_org_and_admin(db):
    org = Organization.objects.create(name="Bug Repro Org", slug="bug-repro-org")
    
    # Ensure roles exist
    Role.objects.get_or_create(name='teacher')
    Role.objects.get_or_create(name='org_admin')
    
    admin_user = User.objects.create_user(email="admin@bug.com", password="password123")
    role = Role.objects.get(name='org_admin')
    OrganizationMember.objects.create(organization=org, user=admin_user, role=role)
    
    return org, admin_user

@pytest.mark.django_db
class TestStaffBulkUploadBug:
    def test_staff_bulk_upload_with_complex_headers_and_numeric_phone(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': org.id})
        
        # CSV with complex headers and numeric phone
        # Note: email (Mandatory) should be mapped to email
        df = pd.DataFrame([
            {
                'email (Mandatory)': 'alice@bug.com', 
                'first_name': 'Alice', 
                'last_name': 'Bug',
                'phone_number': 9876543210, # Numeric value
                'role': 'teacher'
            }
        ])
        
        excel_file = io.BytesIO()
        df.to_excel(excel_file, index=False)
        excel_file.seek(0)
        excel_file.name = 'staff_bug.xlsx'
        
        response = api_client.post(bulk_url, {'file': excel_file}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 1
        
        user = User.objects.get(email="alice@bug.com")
        assert user.first_name == "Alice"
        assert user.last_name == "Bug"
        # The phone number should be saved as a string and NOT have .0 if it was input as number
        assert user.phone_number == "9876543210"
