# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import io
import pandas as pd
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from organizations.models import Organization, Batch, BatchStudent
from rbac.models import Role
from accounts.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_org_and_batch(db):
    org = Organization.objects.create(name="Bulk Org", slug="bulk-org")
    from django.utils import timezone
    import datetime
    today = timezone.now().date()
    batch = Batch.objects.create(
        organization=org, 
        name="Bulk Batch",
        start_date=today,
        end_date=today + datetime.timedelta(days=30)
    )
    
    # Ensure role exists
    Role.objects.get_or_create(name='student')
    Role.objects.get_or_create(name='teacher')
    Role.objects.get_or_create(name='org_admin')
    
    # Create a course for the organization
    from curriculum.models import Course
    course = Course.objects.create(
        organization=org,
        title="Sample Course"
    )
    
    admin_user = User.objects.create_user(email="admin@bulk.com", password="password123", is_superuser=True)
    return org, batch, admin_user, course

@pytest.mark.django_db
class TestBulkUploadFile:
    def test_bulk_upload_csv_success(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        bulk_url = url + "bulk-upload-file/"
        
        # Pre-create users in organization
        u1 = User.objects.create_user(email="student1@test.com", password="password123")
        u2 = User.objects.create_user(email="student2@test.com", password="password123")
        from organizations.models import OrganizationMember
        OrganizationMember.objects.create(organization=org, user=u1, role=Role.objects.get(name='student'))
        OrganizationMember.objects.create(organization=org, user=u2, role=Role.objects.get(name='student'))

        # Create CSV content
        csv_content = "email,first_name,last_name\nstudent1@test.com,John,Doe\nstudent2@test.com,Jane,Smith"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file, 'course_id': course.id}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        assert User.objects.filter(email="student1@test.com").exists()
        assert User.objects.filter(email="student2@test.com").exists()
        assert BatchStudent.objects.filter(batch=batch).count() == 2

    def test_bulk_upload_excel_success(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        bulk_url = url + "bulk-upload-file/"
        
        # Pre-create users in organization
        u1 = User.objects.create_user(email="excel1@test.com", password="password123")
        u2 = User.objects.create_user(email="excel2@test.com", password="password123")
        from organizations.models import OrganizationMember
        OrganizationMember.objects.create(organization=org, user=u1, role=Role.objects.get(name='student'))
        OrganizationMember.objects.create(organization=org, user=u2, role=Role.objects.get(name='student'))

        # Create Excel content using pandas
        df = pd.DataFrame([
            {'email': 'excel1@test.com', 'first_name': 'Excel', 'last_name': 'One'},
            {'email': 'excel2@test.com', 'first_name': 'Excel', 'last_name': 'Two'}
        ])
        excel_file = io.BytesIO()
        df.to_excel(excel_file, index=False)
        excel_file.seek(0)
        excel_file.name = 'students.xlsx'
        
        response = api_client.post(bulk_url, {'file': excel_file, 'course_id': course.id}, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        assert User.objects.filter(email="excel1@test.com").exists()
        assert User.objects.filter(email="excel2@test.com").exists()
        assert BatchStudent.objects.filter(batch=batch).count() == 2

    def test_bulk_upload_invalid_format(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        bulk_url = url + "bulk-upload-file/"
        
        txt_file = io.BytesIO(b"some text")
        txt_file.name = 'students.txt'
        
        response = api_client.post(bulk_url, {'file': txt_file, 'course_id': course.id}, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Unsupported file format" in response.data['error']

    def test_bulk_upload_missing_email_column(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        bulk_url = url + "bulk-upload-file/"
        
        csv_content = "name,phone\nJohn,1234567890"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file, 'course_id': course.id}, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Missing mandatory 'email' column" in response.data['error']

    def _upload_csv(self, api_client, org, batch, course):
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        csv_file = io.BytesIO("email,first_name\nstudent@example.com,John".encode('utf-8'))
        csv_file.name = 'students.csv'
        return api_client.post(url + "bulk-upload-file/", {'file': csv_file, 'course_id': course.id}, format='multipart')

    def test_bulk_upload_allowed_for_batch_created_long_ago(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch

        # Batch planned well in advance but still running
        from django.utils import timezone
        from datetime import timedelta
        batch.created_at = timezone.now() - timedelta(weeks=8)
        batch.save()

        api_client.force_authenticate(user=admin)
        response = self._upload_csv(api_client, org, batch, course)

        assert response.data.get('error') != 'Cannot add students to an inactive or expired batch.'

    def test_bulk_upload_expired_batch_rejected(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch

        from django.utils import timezone
        from datetime import timedelta
        batch.start_date = timezone.localdate() - timedelta(days=30)
        batch.end_date = timezone.localdate() - timedelta(days=1)
        batch.save()

        api_client.force_authenticate(user=admin)
        response = self._upload_csv(api_client, org, batch, course)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] == 'Cannot add students to an inactive or expired batch.'

    def test_bulk_upload_inactive_batch_rejected(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        batch.is_active = False
        batch.save()

        api_client.force_authenticate(user=admin)
        response = self._upload_csv(api_client, org, batch, course)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] == 'Cannot add students to an inactive or expired batch.'

    def test_bulk_upload_validation_row_by_row_errors(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        bulk_url = url + "bulk-upload-file/"
        
        # Create user globally but NOT in organization
        User.objects.create_user(email="not_in_org@test.com", password="password123")

        # Row 2: non_existent@test.com -> doesn't exist
        # Row 3: not_in_org@test.com -> exists but not in org
        csv_content = "email,first_name,last_name\nnon_existent@test.com,First,Last\nnot_in_org@test.com,NoOrg,Member"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file, 'course_id': course.id}, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "row_errors" in response.data
        
        errors = response.data['row_errors']
        assert len(errors) == 2
        
        assert int(errors[0]['row']) == 2
        assert "does not exist" in errors[0]['errors'][0]
        
        assert int(errors[1]['row']) == 3
        assert "not a member of this organization" in errors[1]['errors'][0]

    def test_bulk_upload_ignore_duplicates_and_already_enrolled(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-list', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        bulk_url = url + "bulk-upload-file/"
        
        u1 = User.objects.create_user(email="enrolled@test.com", password="password123")
        u2 = User.objects.create_user(email="new_enroll@test.com", password="password123")
        from organizations.models import OrganizationMember
        OrganizationMember.objects.create(organization=org, user=u1, role=Role.objects.get(name='student'))
        OrganizationMember.objects.create(organization=org, user=u2, role=Role.objects.get(name='student'))

        # Enroll u1 beforehand
        BatchStudent.objects.create(batch=batch, student=u1, student_id_number="STU_OLD")
        
        # Upload:
        # - enrolled@test.com (already enrolled)
        # - new_enroll@test.com
        # - new_enroll@test.com (duplicate in file)
        csv_content = "email,first_name,last_name\nenrolled@test.com,Enrolled,Student\nnew_enroll@test.com,New,Student\nnew_enroll@test.com,New,Student"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'students.csv'
        
        response = api_client.post(bulk_url, {'file': csv_file, 'course_id': course.id}, format='multipart')
        
        # Should succeed because duplicates and already enrolled are ignored/handled
        assert response.status_code == status.HTTP_201_CREATED
        assert BatchStudent.objects.filter(batch=batch).count() == 2  # u1 and u2

    def test_download_template_endpoint(self, api_client, setup_org_and_batch):
        org, batch, admin, course = setup_org_and_batch
        api_client.force_authenticate(user=admin)
        
        url = reverse('organization-batch-students-download-template', kwargs={'org_pk': org.id, 'batch_pk': batch.id})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.headers['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        assert 'attachment; filename="student_bulk_upload_template.xlsx"' in response.headers['Content-Disposition']
        
        # Read file with pandas to verify columns
        excel_data = io.BytesIO(response.content)
        df = pd.read_excel(excel_data)
        assert list(df.columns) == ['email', 'first_name', 'last_name', 'phone_number', 'student_id']
