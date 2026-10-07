# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.contrib.auth import get_user_model
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from curriculum.models import Course, Module, Node, StudentNodeProgress
from gamification.models import GamificationProfile

pytestmark = pytest.mark.django_db
User = get_user_model()


def test_gamification_profile_points_and_level_progression():
    user = User.objects.create_user(email="student_game@test.com", password="password123")
    org = Organization.objects.create(name="Game Org", slug="game-org")
    role, _ = Role.objects.get_or_create(name="student")
    member = OrganizationMember.objects.create(user=user, organization=org, role=role)
    course = Course.objects.create(organization=org, title="Game Course")
    module = Module.objects.create(course=course, title="Game Module")
    node = Node.objects.create(module=module, title="Game Node")

    assert not GamificationProfile.objects.filter(organization_member=member).exists()

    progress = StudentNodeProgress.objects.create(
        student=member,
        node=node,
        status="Completed"
    )

    profile = GamificationProfile.objects.get(organization_member=member)
    assert profile.total_points == 10
    assert profile.current_level == "Beginner"

    # Test leveling progression
    profile.total_points = 95
    profile.save()

    node2 = Node.objects.create(module=module, title="Game Node 2")
    StudentNodeProgress.objects.create(student=member, node=node2, status="Completed")
    profile.refresh_from_db()
    assert profile.total_points == 105
    assert profile.current_level == "Novice"
