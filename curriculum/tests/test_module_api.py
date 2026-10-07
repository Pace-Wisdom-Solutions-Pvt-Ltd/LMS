# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization
from curriculum.models import Course, Module

class ModuleAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="test@example.com", password="password")
        self.org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="contact@example.com")
        
        self.course = Course.objects.create(organization=self.org, title="101 Course", status="Published")
        self.module = Module.objects.create(course=self.course, title="Module 1", sequence_order=1)
        
        # Make user an Org Admin
        from rbac.models import Role
        from organizations.models import OrganizationMember
        admin_role, _ = Role.objects.get_or_create(name='org_admin')
        OrganizationMember.objects.create(organization=self.org, user=self.user, role=admin_role)
        
        # Authenticate
        self.client.force_authenticate(user=self.user)

    def test_module_list(self):
        url = reverse('module-list-create', kwargs={'org_id': self.org.id, 'course_id': self.course.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], "Module 1")

    def test_module_retrieve(self):
        url = reverse('module-detail', kwargs={
            'org_id': self.org.id, 
            'course_id': self.course.id, 
            'module_id': self.module.id
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Module 1")

    def test_module_update_put(self):
        url = reverse('module-detail', kwargs={
            'org_id': self.org.id, 
            'course_id': self.course.id, 
            'module_id': self.module.id
        })
        payload = {
            'title': "Module 1 Updated",
            'description': "New description",
            'sequence_order': 2
        }
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Module 1 Updated")
        self.assertEqual(response.data['sequence_order'], 2)

    def test_module_update_patch(self):
        url = reverse('module-detail', kwargs={
            'org_id': self.org.id, 
            'course_id': self.course.id, 
            'module_id': self.module.id
        })
        payload = {'title': "Module 1 Patched"}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Module 1 Patched")

    def test_module_delete(self):
        url = reverse('module-detail', kwargs={
            'org_id': self.org.id, 
            'course_id': self.course.id, 
            'module_id': self.module.id
        })
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Module.objects.count(), 0)
