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
    org = Organization.objects.create(name="Student Bulk Org", slug="student-bulk-org")
    
    # Ensure roles exist
    Role.objects.get_or_create(name='student')
    Role.objects.get_or_create(name='teacher')
    Role.objects.get_or_create(name='org_admin')
    
    admin_user = User.objects.create_user(email="admin@student.com", password="password123")
    role = Role.objects.get(name='org_admin')
    OrganizationMember.objects.create(organization=org, user=admin_user, role=role)
    
    return org, admin_user

@pytest.mark.django_db
class TestStudentBulkUpload:
    def test_download_template(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        template_url = reverse('organization-students-download-template', kwargs={'org_pk': org.id})
        response = api_client.get(template_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.headers['Content-Disposition'] == 'attachment; filename="student_organization_bulk_upload_template.xlsx"'
        
        # Read file from response and verify headers
        df = pd.read_excel(io.BytesIO(response.content))
        assert list(df.columns) == ['email', 'first_name', 'last_name', 'phone_number', 'student_id']

    def test_student_bulk_upload_csv_success(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-students-bulk-upload', kwargs={'org_pk': org.id})
        
        csv_content = "email,first_name,last_name,phone_number\nstudent1@lms.com,S1,Last,+919999999999\nstudent2@lms.com,S2,Last,+918888888888"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        
        s1 = User.objects.get(email="student1@lms.com")
        assert s1.first_name == "S1"
        assert s1.last_name == "Last"
        assert s1.phone_number == "919999999999"
        assert OrganizationMember.objects.filter(organization=org, user=s1, role__name='student').exists()
        
        s2 = User.objects.get(email="student2@lms.com")
        assert s2.first_name == "S2"
        assert OrganizationMember.objects.filter(organization=org, user=s2, role__name='student').exists()

    def test_student_bulk_upload_excel_success(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-students-bulk-upload', kwargs={'org_pk': org.id})
        
        df = pd.DataFrame([
            {'email': 'excel1@lms.com', 'first_name': 'E1', 'last_name': 'Last'},
            {'email': 'excel2@lms.com', 'first_name': 'E2', 'last_name': 'Last'}
        ])
        excel_file = io.BytesIO()
        df.to_excel(excel_file, index=False)
        excel_file.seek(0)
        excel_file.name = 'students.xlsx'
        
        response = api_client.post(bulk_url, {'file': excel_file}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        
        e1 = User.objects.get(email="excel1@lms.com")
        assert OrganizationMember.objects.filter(organization=org, user=e1, role__name='student').exists()

    def test_student_bulk_upload_missing_email_error(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-students-bulk-upload', kwargs={'org_pk': org.id})
        
        # Missing 'email' header
        csv_content = "first_name,last_name\nNoEmail,Student"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file}, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
        assert "Missing mandatory 'email' column" in response.data['error']

    def test_student_bulk_upload_row_validation_error(self, api_client, setup_org_and_admin):
        org, admin = setup_org_and_admin
        api_client.force_authenticate(user=admin)
        
        bulk_url = reverse('organization-students-bulk-upload', kwargs={'org_pk': org.id})
        
        # Empty email value in a row
        csv_content = "email,first_name,last_name\n,NoEmail,Student"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file}, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "row_errors" in response.data
        assert int(response.data['row_errors'][0]['row']) == 2
        assert "Missing mandatory 'email'" in response.data['row_errors'][0]['errors'][0]
