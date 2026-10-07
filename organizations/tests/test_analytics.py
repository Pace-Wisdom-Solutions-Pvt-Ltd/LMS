# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from organizations.models import Organization, OrganizationMember, Batch
from accounts.models import User
from rbac.models import Role

@pytest.mark.django_db
class TestOrganizationAnalytics:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        # Create roles
        self.admin_role, _ = Role.objects.get_or_create(name="org_admin")
        self.teacher_role, _ = Role.objects.get_or_create(name="teacher")
        self.student_role, _ = Role.objects.get_or_create(name="student")

        # Create Organization
        self.org = Organization.objects.create(
            name="Analytics Org", slug="analytics-org", contact_email="analytics@org.com"
        )

        # Create Users
        self.admin_user = User.objects.create_user(email="admin@org.com", password="password", first_name="Admin", last_name="User")
        self.teacher_user = User.objects.create_user(email="teacher@org.com", password="password", first_name="Teacher", last_name="User")
        self.student_user1 = User.objects.create_user(email="student1@org.com", password="password", first_name="Student1", last_name="User")
        self.student_user2 = User.objects.create_user(email="student2@org.com", password="password", first_name="Student2", last_name="User")

        # Create Memberships
        OrganizationMember.objects.create(organization=self.org, user=self.admin_user, role=self.admin_role)
        OrganizationMember.objects.create(organization=self.org, user=self.teacher_user, role=self.teacher_role)
        OrganizationMember.objects.create(organization=self.org, user=self.student_user1, role=self.student_role)
        OrganizationMember.objects.create(organization=self.org, user=self.student_user2, role=self.student_role)

        # Create Batch
        Batch.objects.create(organization=self.org, name="Batch 1", start_date="2026-01-01", end_date="2026-06-01")

        # Create Sample Courses
        from curriculum.models import Course
        Course.objects.create(organization=self.org, title="Course 1", status='Published')
        Course.objects.create(organization=self.org, title="Course 2", status='Draft')

        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

    def test_analytics_overview(self):
        # URL name is generated as basename-action-name (with underscores replaced by hyphens)
        url = reverse('organization-analytics-overview', kwargs={'pk': self.org.id})
        response = self.client.get(url)

        assert response.status_code == 200
        data = response.data
        assert data['total_users'] == 4
        assert data['total_staff'] == 2 # Admin + Teacher
        assert data['total_students'] == 2
        assert data['total_batches'] == 1
        assert data['total_courses'] == 2

    def test_analytics_overview_excludes_inactive_memberships(self):
        OrganizationMember.objects.filter(
            organization=self.org,
            user=self.student_user2,
        ).update(is_active=False)

        url = reverse('organization-analytics-overview', kwargs={'pk': self.org.id})
        response = self.client.get(url)

        assert response.status_code == 200
        data = response.data
        assert data['total_users'] == 3
        assert data['total_staff'] == 2
        assert data['total_students'] == 1
