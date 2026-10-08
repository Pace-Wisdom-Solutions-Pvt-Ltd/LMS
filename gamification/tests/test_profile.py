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


def _completed_progress_setup(email):
    user = User.objects.create_user(email=email, password="password123")
    org = Organization.objects.create(name=f"Org {email}", slug=email.split("@")[0])
    role, _ = Role.objects.get_or_create(name="student")
    member = OrganizationMember.objects.create(user=user, organization=org, role=role)
    course = Course.objects.create(organization=org, title="Course")
    module = Module.objects.create(course=course, title="Module")
    node = Node.objects.create(module=module, title="Node")
    progress = StudentNodeProgress.objects.create(student=member, node=node, status="Completed")
    return member, node, progress


def test_resaving_completed_progress_does_not_award_points_again():
    member, node, progress = _completed_progress_setup("resave@test.com")

    for _ in range(5):
        progress.save()
    StudentNodeProgress.objects.filter(pk=progress.pk).first().save()

    profile = GamificationProfile.objects.get(organization_member=member)
    assert profile.total_points == 10
    assert member.node_completion_rewards.filter(node=node).count() == 1


def test_points_awarded_on_transition_to_completed_only():
    user = User.objects.create_user(email="transition@test.com", password="password123")
    org = Organization.objects.create(name="Transition Org", slug="transition-org")
    role, _ = Role.objects.get_or_create(name="student")
    member = OrganizationMember.objects.create(user=user, organization=org, role=role)
    course = Course.objects.create(organization=org, title="Course")
    module = Module.objects.create(course=course, title="Module")
    node = Node.objects.create(module=module, title="Node")

    progress = StudentNodeProgress.objects.create(student=member, node=node, status="In_Progress")
    assert not GamificationProfile.objects.filter(organization_member=member).exists()

    progress.status = "Completed"
    progress.save()
    progress.save()

    assert GamificationProfile.objects.get(organization_member=member).total_points == 10


def test_recompleting_node_after_progress_reset_does_not_award_again():
    member, node, progress = _completed_progress_setup("reset@test.com")

    # Progress rows are soft-deleted when quiz content changes; the student redoes the node
    progress.delete()
    StudentNodeProgress.objects.create(student=member, node=node, status="Completed")

    assert GamificationProfile.objects.get(organization_member=member).total_points == 10
