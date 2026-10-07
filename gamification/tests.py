# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.test import TestCase
from accounts.models import User
from organizations.models import Organization, OrganizationMember
from curriculum.models import Course, Module, Node, StudentNodeProgress
from gamification.models import GamificationProfile

class GamificationSignalTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="student@test.com", password="password")
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.member = OrganizationMember.objects.create(user=self.user, organization=self.org, role_id=1)
        self.course = Course.objects.create(organization=self.org, title="Test Course")
        self.module = Module.objects.create(course=self.course, title="Test Module")
        self.node = Node.objects.create(module=self.module, title="Test Node")
        
    def test_points_awarded_on_node_completion(self):
        # Initial check
        self.assertFalse(GamificationProfile.objects.filter(organization_member=self.member).exists())
        
        # Create progress and set to completed to trigger signal
        progress = StudentNodeProgress.objects.create(
            student=self.user,
            node=self.node,
            status='In_Progress'
        )
        progress.status = 'Completed'
        progress.save()
        
        # Verify GamificationProfile was created and points awarded
        profile = GamificationProfile.objects.get(organization_member=self.member)
        self.assertEqual(profile.total_points, 10)
        self.assertEqual(profile.current_level, "Beginner")
