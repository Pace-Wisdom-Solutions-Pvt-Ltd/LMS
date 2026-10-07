# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization
from curriculum.models import Course, Module, Node, Assessment, LearningMaterial

class CurriculumAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="test@example.com", password="password")
        self.org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="contact@example.com")
        
        self.course = Course.objects.create(organization=self.org, title="101 Course", status="Published")
        self.module = Module.objects.create(course=self.course, title="Module 1", sequence_order=1)
        self.node1 = Node.objects.create(module=self.module, title="Node 1 Video", sequence_order=1)
        self.node2 = Node.objects.create(module=self.module, title="Node 2 Quiz", sequence_order=2, prerequisite_node=self.node1)
        
        self.material = LearningMaterial.objects.create(
            node=self.node1, content_type="Video", content_url="https://example.com/video.mp4"
        )
        
        self.assessment = Assessment.objects.create(
            node=self.node2, assignment_type="MCQ", prompt="What is 2+2?",
            expected_answer_schema={"correct_option_id": 1, "points": 10},
            passing_score_percentage=100
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.user)

    def test_course_list(self):
        url = reverse('course-list-create', kwargs={'org_id': self.org.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_roadmap_retrieve(self):
        url = reverse('course-roadmap', kwargs={'org_id': self.org.id, 'course_id': self.course.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Assert nested structure
        self.assertIn('modules', response.data)
        self.assertEqual(len(response.data['modules']), 1)
        
        module_data = response.data['modules'][0]
        self.assertEqual(len(module_data['nodes']), 2)
        
        node1_data = module_data['nodes'][0]
        self.assertIsNotNone(node1_data['learning_material'])
        self.assertIsNone(node1_data['assessment'])
        
        node2_data = module_data['nodes'][1]
        self.assertIsNone(node2_data['learning_material'])
        self.assertIsNotNone(node2_data['assessment'])
        
        # Security test: ensure expected_answer_schema is NOT in the student payload
        self.assertNotIn('expected_answer_schema', node2_data['assessment'])

    def test_submit_assessment(self):
        url = reverse('assignment-submission', kwargs={'node_id': self.node2.id})
        payload = {"payload": {"selected_option_id": 1}}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("Evaluation in progress", response.data['message'])

    def test_complete_material_node(self):
        url = reverse('node-complete', kwargs={'node_id': self.node1.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Node marked as completed.')
