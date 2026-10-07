# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from conftest import TEST_PASSWORD as PASSWORD


class CourseAdminAPITests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="OrgX", slug="orgx", contact_email="x@org.com")
        # Create users
        self.admin = User.objects.create_user(email="admin@orgx.com", password=PASSWORD, is_superuser=False)
        self.normal = User.objects.create_user(email="user@orgx.com", password=PASSWORD)

        # Ensure role exists
        role = Role.objects.get_or_create(name='org_admin')[0]

        # Link admin as org admin
        OrganizationMember.objects.create(organization=self.org, user=self.admin, role=role, is_active=True)

        self.client.force_authenticate(user=self.admin)

    def test_create_course_as_org_admin_succeeds(self):
        url = reverse('course-list-create', kwargs={'org_id': self.org.id})
        payload = {'title': 'New Course', 'status': 'Draft'}
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data.get('title'), 'New Course')

    def test_create_course_forbidden_for_non_admin(self):
        self.client.force_authenticate(user=self.normal)
        url = reverse('course-list-create', kwargs={'org_id': self.org.id})
        payload = {'title': 'Banned Course', 'status': 'Draft'}
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_course_invalid_input_returns_400(self):
        # Missing required title
        url = reverse('course-list-create', kwargs={'org_id': self.org.id})
        payload = {'status': 'Draft'}
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
