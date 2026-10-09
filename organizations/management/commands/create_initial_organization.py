# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import datetime
import getpass
import sys
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from accounts.models import User
from organizations.models import Batch, Organization, OrganizationMember
from rbac.models import Role


class Command(BaseCommand):
    help = "Bootstrap the initial Organization, default Batch, and Org Admin (with superuser/admin panel access) in a single command."

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            type=str,
            default="",
            help="Name of the initial organization (default: 'Default Organization').",
        )
        parser.add_argument(
            "--org-name",
            type=str,
            default="",
            help="Alias for --name.",
        )
        parser.add_argument(
            "--slug",
            type=str,
            default="",
            help="Unique URL slug (defaults to slugified name).",
        )
        parser.add_argument(
            "--org-slug",
            type=str,
            default="",
            help="Alias for --slug.",
        )
        parser.add_argument(
            "--email",
            type=str,
            default="",
            help="Organization contact email (defaults to admin-email or 'admin@lms.local').",
        )
        parser.add_argument(
            "--admin-email",
            type=str,
            default="",
            help="Email of the user to assign as org_admin (creates user if not found).",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="",
            help="Password for the org admin user if creating a new user or updating password.",
        )
        parser.add_argument(
            "--admin-password",
            type=str,
            default="",
            help="Alias for --password.",
        )
        parser.add_argument(
            "--first-name",
            type=str,
            default="Admin",
            help="First name for the admin user (default: 'Admin').",
        )
        parser.add_argument(
            "--last-name",
            type=str,
            default="",
            help="Last name for the admin user (default: '').",
        )
        parser.add_argument(
            "--batch-name",
            type=str,
            default="Batch 1",
            help="Name of the initial batch to create (default: 'Batch 1').",
        )
        parser.add_argument(
            "--no-superuser",
            action="store_true",
            default=False,
            help="Do not grant Django admin superuser and staff access to the admin user.",
        )

    def _parse_options(self, options):
        name = (options.get("org_name") or options.get("name") or "Default Organization").strip()
        slug = (options.get("org_slug") or options.get("slug") or "").strip() or slugify(name)
        admin_email = (options.get("admin_email") or "").strip()
        email = (options.get("email") or "").strip() or admin_email or "admin@lms.local"
        batch_name = (options.get("batch_name") or "").strip()
        password = options.get("admin_password") or options.get("password") or ""
        first_name = (options.get("first_name") or "Admin").strip()
        last_name = (options.get("last_name") or "").strip()
        make_superuser = not options.get("no_superuser", False)

        return {
            "name": name,
            "slug": slug,
            "admin_email": admin_email,
            "email": email,
            "batch_name": batch_name,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            "make_superuser": make_superuser,
        }

    def _get_or_create_organization(self, name, slug, email):
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
        return org

    def _create_batch_if_needed(self, org, batch_name):
        if not batch_name:
            return None

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
        return batch

    def _prompt_password(self, admin_email):
        if not sys.stdin.isatty():
            raise CommandError(
                f"User '{admin_email}' does not exist and no --password was supplied. "
                f"Please provide --password to create this user."
            )

        password = ""
        while not password:
            password = getpass.getpass(f"Enter password for admin user '{admin_email}': ").strip()
            if not password:
                self.stderr.write("Password cannot be blank.")
        return password

    def _create_user(self, admin_email, password, first_name, last_name, make_superuser):
        if make_superuser:
            user = User.objects.create_superuser(
                email=admin_email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                status=User.STATUS_ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS(f"Created superuser & staff admin user: {user.email}"))
        else:
            user = User.objects.create_user(
                email=admin_email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                status=User.STATUS_ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS(f"Created admin user: {user.email}"))
        return user

    def _update_existing_user(self, user, password, make_superuser):
        self.stdout.write(self.style.WARNING(f"User '{user.email}' already exists."))
        if make_superuser and not (user.is_superuser and user.is_staff):
            user.is_superuser = True
            user.is_staff = True
            user.save(update_fields=["is_superuser", "is_staff"])
            self.stdout.write(self.style.SUCCESS(f"Granted superuser and staff privileges to user: {user.email}"))
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(f"Updated password for user: {user.email}"))

    def _setup_admin_user(self, admin_email, password, first_name, last_name, make_superuser):
        user = User.objects.filter(email__iexact=admin_email).first()
        if not user:
            if not password:
                password = self._prompt_password(admin_email)
            user = self._create_user(admin_email, password, first_name, last_name, make_superuser)
        else:
            self._update_existing_user(user, password, make_superuser)
        return user

    def _assign_org_admin(self, org, user):
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
        member.roles.add(org_admin_role)
        if m_created:
            self.stdout.write(self.style.SUCCESS(f"Assigned user '{user.email}' as org_admin for '{org.name}'."))
        else:
            if member.role != org_admin_role:
                member.role = org_admin_role
                member.save(update_fields=["role"])
            self.stdout.write(self.style.WARNING(f"User '{user.email}' is already a member of '{org.name}' (verified org_admin role)."))
        return member

    @transaction.atomic
    def handle(self, *args, **options):
        params = self._parse_options(options)
        org = self._get_or_create_organization(params["name"], params["slug"], params["email"])
        self._create_batch_if_needed(org, params["batch_name"])

        if params["admin_email"]:
            user = self._setup_admin_user(
                params["admin_email"],
                params["password"],
                params["first_name"],
                params["last_name"],
                params["make_superuser"],
            )
            self._assign_org_admin(org, user)

        self.stdout.write(self.style.SUCCESS("Bootstrap completed successfully."))
