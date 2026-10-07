# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Role, UserRole


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def assign_superadmin_role(sender, instance, created, **kwargs):
    """
    Automatically assigns the 'superadmin' Role to any User created or updated
    with is_superuser=True.
    """
    if instance.is_superuser:
        # Fetch the superadmin role
        role, _ = Role.objects.get_or_create(
            name="superadmin", defaults={"description": "Full system access"}
        )

        # Assign it if they don't already have it
        UserRole.objects.get_or_create(user=instance, role=role)


@receiver(pre_save, sender=settings.AUTH_USER_MODEL)
def track_deactivation(sender, instance, **kwargs):
    """
    Checks if an existing active user is being deactivated globally.
    """
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            # If the user is active, but is being changed to inactive
            if old_instance.is_active and not instance.is_active:
                instance._was_deactivated = True
        except sender.DoesNotExist:
            pass


def _notify_deactivated_user(user, org):
    """
    Sends an email to the deactivated user.
    """
    from lms_core.email_utils import render_branded_email, send_html_email_via_ses

    try:
        html_body = render_branded_email(
            title="Account Deactivated",
            intro=(
                f"Hello {user.first_name or user.email},\n\n"
                "This is to inform you that your account has been deactivated globally by the system administrator. "
                "You will no longer be able to log in or access organization materials."
            ),
            cta_label="Contact Support",
            cta_url=f"mailto:{org.contact_email or 'support@lms.com'}",
            recipient_email=user.email,
            recipient_name=user.get_full_name(),
            organization=org,
            footer_note="If you believe this is a mistake, please contact your organization administrator."
        )
        send_html_email_via_ses(
            subject="Account Deactivated",
            text_body="We would like to inform you that your account has been deactivated globally by the system administrator.",
            html_body=html_body,
            recipient_list=[user.email],
            organization=org
        )
    except Exception:
        pass


def _notify_stakeholders(user, org, role_name):
    """
    Sends emails to org admins/teachers based on the deactivated user's role.
    """
    from django.contrib.auth import get_user_model
    from lms_core.email_utils import render_branded_email, send_html_email_via_ses

    user_model = get_user_model()
    recipients = None
    type_label = ""

    if role_name == 'student':
        recipients = user_model.objects.filter(
            organization_memberships__organization=org,
            organization_memberships__role__name__in=["org_admin", "teacher"],
            organization_memberships__is_active=True,
            organization_memberships__is_deleted=False,
            is_active=True
        ).distinct()
        type_label = "Student"
    elif role_name == 'teacher':
        recipients = user_model.objects.filter(
            organization_memberships__organization=org,
            organization_memberships__role__name="org_admin",
            organization_memberships__is_active=True,
            organization_memberships__is_deleted=False,
            is_active=True
        ).distinct()
        type_label = "Teacher"
    elif role_name == 'org_admin':
        recipients = user_model.objects.filter(
            organization_memberships__organization=org,
            organization_memberships__role__name="org_admin",
            organization_memberships__is_active=True,
            organization_memberships__is_deleted=False,
            is_active=True
        ).exclude(id=user.id).distinct()
        type_label = "Org Admin"

    if not recipients or not recipients.exists():
        return

    message_text = f"{type_label} {user.get_full_name() or user.email} has been deactivated globally by the superadmin."
    subject_text = f"Notice: {type_label} Deactivated - {user.get_full_name() or user.email}"

    for r in recipients:
        try:
            html_body = render_branded_email(
                title=f"{type_label} Deactivated",
                intro=(
                    f"Hello {r.first_name or r.email},\n\n"
                    f"This is to inform you that the {type_label.lower()} {user.get_full_name()} "
                    f"({user.email}) has been deactivated globally by the super administrator."
                ),
                cta_label="View Members",
                cta_url=f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')}/org-admin/dashboard",
                recipient_email=r.email,
                recipient_name=r.get_full_name(),
                organization=org,
                footer_note="This is an automated system notice."
            )
            send_html_email_via_ses(
                subject=subject_text,
                text_body=message_text,
                html_body=html_body,
                recipient_list=[r.email],
                organization=org
            )
        except Exception:
            pass


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def send_deactivation_notifications(sender, instance, created, **kwargs):
    """
    Sends notifications and emails to org admins, teachers, and the user themselves
    when a user is deactivated globally by a superadmin.
    """
    if getattr(instance, "_was_deactivated", False):
        # Prevent double execution
        instance._was_deactivated = False

        from organizations.models import OrganizationMember

        user = instance
        # 1. Fetch all memberships in active organizations
        memberships = OrganizationMember.objects.filter(
            user=user,
            is_deleted=False,
            organization__is_active=True
        ).select_related('organization', 'role')

        for membership in memberships:
            org = membership.organization
            role_name = membership.role.name

            # A. Notify the deactivated user themselves
            _notify_deactivated_user(user, org)

            # B. Notify the stakeholders based on role
            _notify_stakeholders(user, org, role_name)
