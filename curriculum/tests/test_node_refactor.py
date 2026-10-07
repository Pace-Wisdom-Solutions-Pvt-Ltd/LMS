# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from organizations.models import Organization
from curriculum.models import Course, Module, Node

class NodeRefactorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="admin@example.com", password="password", is_superuser=True)
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.course = Course.objects.create(organization=self.org, title="Test Course")
        self.module = Module.objects.create(course=self.course, title="Test Module")
        self.node = Node.objects.create(module=self.module, title="Test Node")
        
        self.client.force_authenticate(user=self.user)

    def test_node_list_url_structure(self):
        """Verify the new Node list URL structure with course_id."""
        url = reverse('node-create', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Test Node")

    def test_node_create_url_structure(self):
        """Verify Node creation with the new URL structure."""
        url = reverse('node-create', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id
        })
        data = {'title': 'New Node', 'sequence_order': 2}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Node.objects.filter(module=self.module).count(), 2)

    def test_node_detail_get(self):
        url = reverse('node-detail', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id,
            'node_id': self.node.id
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.node.title)

    def test_node_detail_put(self):
        url = reverse('node-detail', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id,
            'node_id': self.node.id
        })
        data = {'title': 'Updated Node', 'sequence_order': 5}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.node.refresh_from_db()
        self.assertEqual(self.node.title, 'Updated Node')

    def test_node_detail_patch(self):
        url = reverse('node-detail', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id,
            'node_id': self.node.id
        })
        data = {'title': 'Patched Node'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.node.refresh_from_db()
        self.assertEqual(self.node.title, 'Patched Node')

    def test_node_detail_delete(self):
        url = reverse('node-detail', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id,
            'node_id': self.node.id
        })
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Node.objects.filter(id=self.node.id).exists())

    def test_node_ownership_validation_failure(self):
        """Test that validation fails if IDs don't match the hierarchy."""
        another_course = Course.objects.create(organization=self.org, title="Another Course")
        # Trying to access node with a wrong course_id
        url = reverse('node-detail', kwargs={
            'org_id': self.org.id,
            'course_id': another_course.id,
            'module_id': self.module.id,
            'node_id': self.node.id
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_node_create_with_null_fields(self):
        """Regression test for TypeError: can only concatenate list (not 'NoneType') to list."""
        url = reverse('node-create', kwargs={
            'org_id': self.org.id,
            'course_id': self.course.id,
            'module_id': self.module.id
        })
        data = {
            'title': 'Node with Nulls',
            'quiz_name': 'Test Quiz',
            'quiz_question_text': 'What is 1+1?',
            'quiz_option_a': '2',
            'quiz_option_b': '3',
            'quiz_extra_options': None,  # This caused the error
            'questions_input': None      # This could also cause the error
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


