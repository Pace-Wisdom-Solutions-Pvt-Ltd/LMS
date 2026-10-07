# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
import datetime
from accounts.models import User
from organizations.models import Organization, OrganizationMember, Batch
from rbac.models import Role
from conftest import TEST_PASSWORD as PASSWORD


class OrganizationViewsSimpleTests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='OrgView', slug='orgview', contact_email='v@o', is_active=True)
        self.user = User.objects.create_user(email='u@o', password=PASSWORD)
        role = Role.objects.get_or_create(name='org_admin')[0]
        OrganizationMember.objects.create(organization=self.org, user=self.user, role=role, is_active=True)
        self.client.force_authenticate(user=self.user)

    def test_analytics_overview_counts(self):
        # create additional users and batches
        student = User.objects.create_user(email='s@o', password=PASSWORD)
        OrganizationMember.objects.create(organization=self.org, user=student, role=Role.objects.get(name='org_admin'))
        Batch.objects.create(
            organization=self.org,
            name='Batch A',
            start_date=datetime.date.today(),
            end_date=datetime.date.today(),
        )
        url = reverse('organization-analytics-overview', kwargs={'pk': self.org.id})
        resp = self.client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data
        assert 'total_users' in data and data['total_users'] >= 1

