# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from curriculum.models import StudentNodeProgress
from gamification.models import GamificationProfile, NodeCompletionReward
from organizations.models import OrganizationMember


NODE_COMPLETION_POINTS = 10


def _level_for_points(points):
    if points >= 500:
        return "Expert"
    if points >= 250:
        return "Intermediate"
    if points >= 100:
        return "Novice"
    return None


@receiver(post_save, sender=StudentNodeProgress)
def update_gamification_on_completion(sender, instance, created, **kwargs):
    if instance.status == 'Completed':
        member = instance.student
        from django.contrib.auth import get_user_model
        user_model = get_user_model()
        if isinstance(member, user_model):
            try:
                member = OrganizationMember.objects.get(
                    user=member,
                    organization=instance.node.module.course.organization
                )
            except OrganizationMember.DoesNotExist:
                return
        if not member:
            return

        with transaction.atomic():
            # Award points only the first time this member completes this node.
            # Re-saving a completed progress row must not award points again.
            _, reward_created = NodeCompletionReward.objects.get_or_create(
                organization_member=member,
                node=instance.node,
                defaults={'points': NODE_COMPLETION_POINTS}
            )
            if not reward_created:
                return

            profile, _ = GamificationProfile.objects.get_or_create(organization_member=member)
            profile = GamificationProfile.objects.select_for_update().get(pk=profile.pk)
            profile.total_points += NODE_COMPLETION_POINTS

            level = _level_for_points(profile.total_points)
            if level:
                profile.current_level = level

            profile.save()

        # Check if entire course is completed and issue certificate
        try:
            from gamification.utils import get_or_create_course_certificate
            get_or_create_course_certificate(
                user=member.user,
                course=instance.node.module.course,
                organization=instance.node.module.course.organization
            )
        except Exception:
            pass
