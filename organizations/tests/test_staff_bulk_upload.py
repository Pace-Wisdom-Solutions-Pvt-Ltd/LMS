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
    org = Organization.objects.create(name="Staff Bulk Org", slug="staff-bulk-org")
    
    # Ensure roles exist
    Role.objects.get_or_create(name='student')
    Role.objects.get_or_create(name='teacher')
    Role.objects.get_or_create(name='org_admin')
    
    admin_user = User.objects.create_user(email="admin@staff.com", password="password123")
    role = Role.objects.get(name='org_admin')
    OrganizationMember.objects.create(organization=org, user=admin_user, role=role)
    
    return org, admin_user

@pytest.mark.django_db
class TestStaffBulkUpload:
    def test_staff_bulk_upload_csv_success(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': org.id})
        
        # CSV with specific roles
        csv_content = "email,first_name,last_name,role\nteacher1@lms.com,T1,Last,teacher\nadmin1@lms.com,A1,Last,org_admin"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'staff.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        
        t1 = User.objects.get(email="teacher1@lms.com")
        assert OrganizationMember.objects.filter(organization=org, user=t1, role__name='teacher').exists()
        
        a1 = User.objects.get(email="admin1@lms.com")
        assert OrganizationMember.objects.filter(organization=org, user=a1, role__name='org_admin').exists()

    def test_staff_bulk_upload_excel_default_role(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': org.id})
        
        # Excel content without 'role' column
        df = pd.DataFrame([
            {'email': 'staff1@lms.com', 'first_name': 'S1', 'last_name': 'Last'},
            {'email': 'staff2@lms.com', 'first_name': 'S2', 'last_name': 'Last'}
        ])
        excel_file = io.BytesIO()
        df.to_excel(excel_file, index=False)
        excel_file.seek(0)
        excel_file.name = 'staff.xlsx'
        
        # Post with default role 'org_admin' in the serializer field
        response = api_client.post(bulk_url, {'file': excel_file, 'role_name': 'org_admin'}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        
        s1 = User.objects.get(email="staff1@lms.com")
        assert OrganizationMember.objects.filter(organization=org, user=s1, role__name='org_admin').exists()

    def test_staff_bulk_upload_invalid_role_falls_back(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': org.id})
        
        csv_content = "email,first_name,last_name,role\nbadrole@lms.com,Bad,Role,invalid_role"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'staff.csv'
        
        # Should fall back to 'teacher' (default in serializer if not provided, or logic in view)
        response = api_client.post(bulk_url, {'file': csv_file}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        u = User.objects.get(email="badrole@lms.com")
        assert OrganizationMember.objects.filter(organization=org, user=u, role__name='teacher').exists()

    def test_staff_bulk_upload_with_overrides(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        from organizations.models import Batch
        from curriculum.models import Course
        from django.utils import timezone
        import datetime
        
        # Create a batch and course to override with
        batch = Batch.objects.create(
            organization=org, name="Override Batch", 
            start_date=timezone.now().date(), 
            end_date=timezone.now().date() + datetime.timedelta(days=10)
        )
        Course.objects.create(organization=org, title="Override Course")
        
        bulk_url = reverse('organization-staff-bulk-upload', kwargs={'org_pk': org.id})
        
        csv_content = "email,first_name,last_name\noverridden@lms.com,Over,Ridden"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'staff_override.csv'
        
        # Post with overrides
        response = api_client.post(bulk_url, {
            'file': csv_file, 
            'batch_id': batch.id,
        }, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        u = User.objects.get(email="overridden@lms.com")
        member = OrganizationMember.objects.get(organization=org, user=u)
        assert member.batches.filter(id=batch.id).exists()
