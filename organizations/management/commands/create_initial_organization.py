# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from accounts.models import User
from organizations.models import Batch, Organization, OrganizationMember
from rbac.models import Role


class Command(BaseCommand):
    help = "Bootstrap the initial Organization, default Batch, and Org Admin in the open-source edition."

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            type=str,
            default="Default Organization",
            help="Name of the initial organization (default: 'Default Organization').",
        )
        parser.add_argument(
            "--slug",
            type=str,
            default="",
            help="Unique URL slug (defaults to slugified name).",
        )
        parser.add_argument(
            "--email",
            type=str,
            default="admin@lms.local",
            help="Organization contact email (default: 'admin@lms.local').",
        )
        parser.add_argument(
            "--admin-email",
            type=str,
            default="",
            help="Email of an existing user to assign as org_admin.",
        )
        parser.add_argument(
            "--batch-name",
            type=str,
            default="Batch 1",
            help="Name of the initial batch to create (default: 'Batch 1').",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        name = options["name"].strip()
        slug = options["slug"].strip() or slugify(name)
        email = options["email"].strip()
        admin_email = options["admin_email"].strip()
        batch_name = options["batch_name"].strip()

        org, created = Organization.objects.get_or_create(
            slug=slug,
            defaults={
                "name": name,
                "contact_email": email,
                "is_active": True,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created organization: {org.name} (id={org.id}, slug={org.slug})"))
        else:
            self.stdout.write(self.style.WARNING(f"Organization already exists: {org.name} (id={org.id}, slug={org.slug})"))

        # Create default batch if batch_name is provided
        if batch_name:
            today = datetime.date.today()
            end_date = today + datetime.timedelta(days=365)
            batch, b_created = Batch.objects.get_or_create(
                organization=org,
                name=batch_name,
                defaults={
                    "start_date": today,
                    "end_date": end_date,
                    "is_active": True,
                },
            )
            if b_created:
                self.stdout.write(self.style.SUCCESS(f"Created default batch: {batch.name} (id={batch.id})"))
            else:
                self.stdout.write(self.style.WARNING(f"Default batch already exists: {batch.name} (id={batch.id})"))

        # Link Org Admin if email provided
        if admin_email:
            try:
                user = User.objects.get(email__iexact=admin_email)
            except User.DoesNotExist:
                raise CommandError(f"User with email '{admin_email}' does not exist. Please create the user first.")

            org_admin_role, _ = Role.objects.get_or_create(
                name="org_admin",
                defaults={"description": "Organization Administrator"},
            )

            member, m_created = OrganizationMember.objects.get_or_create(
                organization=org,
                user=user,
                defaults={
                    "role": org_admin_role,
                    "is_active": True,
                },
            )
            if m_created:
                member.roles.add(org_admin_role)
                self.stdout.write(self.style.SUCCESS(f"Assigned user '{user.email}' as org_admin for {org.name}."))
            else:
                self.stdout.write(self.style.WARNING(f"User '{user.email}' is already a member of {org.name}."))

        self.stdout.write(self.style.SUCCESS("Bootstrap completed successfully."))
