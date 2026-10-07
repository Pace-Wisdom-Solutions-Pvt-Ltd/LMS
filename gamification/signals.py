# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db.models.signals import post_save
from django.dispatch import receiver
from curriculum.models import StudentNodeProgress
from gamification.models import GamificationProfile
from organizations.models import OrganizationMember

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

        profile, _ = GamificationProfile.objects.get_or_create(organization_member=member)
        
        # Award 10 points for completing a node
        points_awarded = 10 
        profile.total_points += points_awarded
        
        # Dynamic leveling logic
        if profile.total_points >= 500:
            profile.current_level = "Expert"
        elif profile.total_points >= 250:
            profile.current_level = "Intermediate"
        elif profile.total_points >= 100:
            profile.current_level = "Novice"
            
        profile.save()
