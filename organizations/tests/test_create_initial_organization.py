# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from io import StringIO

from accounts.models import User
from organizations.models import Organization, OrganizationMember, Batch
from rbac.models import Role


@pytest.mark.django_db
class TestCreateInitialOrganizationCommand:
    def test_creates_org_batch_and_superuser_in_single_command(self):
        out = StringIO()
        call_command(
            "create_initial_organization",
            name="Test Academy",
            slug="test-academy",
            admin_email="testadmin@academy.edu",
            password="StrongPassword123!",
            batch_name="Batch 2026",
            stdout=out,
        )

        output = out.getvalue()
        assert "Created organization: Test Academy" in output
        assert "Created default batch: Batch 2026" in output
        assert "Created superuser & staff admin user: testadmin@academy.edu" in output
        assert "Assigned user 'testadmin@academy.edu' as org_admin" in output

        # Verify DB records
        org = Organization.objects.get(slug="test-academy")
        assert org.name == "Test Academy"

        batch = Batch.objects.get(organization=org, name="Batch 2026")
        assert batch.is_active is True

        user = User.objects.get(email="testadmin@academy.edu")
        assert user.is_superuser is True
        assert user.is_staff is True
        assert user.check_password("StrongPassword123!") is True

        member = OrganizationMember.objects.get(organization=org, user=user)
        assert member.role.name == "org_admin"
        assert member.roles.filter(name="org_admin").exists()

    def test_alias_org_name_and_org_slug_arguments(self):
        out = StringIO()
        call_command(
            "create_initial_organization",
            org_name="Alias Academy",
            org_slug="alias-academy",
            admin_email="aliasadmin@academy.edu",
            password="StrongPassword123!",
            stdout=out,
        )

        org = Organization.objects.get(slug="alias-academy")
        assert org.name == "Alias Academy"
        user = User.objects.get(email="aliasadmin@academy.edu")
        assert user.is_superuser is True

    def test_existing_user_promoted_and_linked(self):
        existing_user = User.objects.create_user(
            email="existing@academy.edu",
            password="OldPassword123",
            first_name="Existing",
            last_name="User",
        )
        assert existing_user.is_superuser is False
        assert existing_user.is_staff is False

        out = StringIO()
        call_command(
            "create_initial_organization",
            name="Existing Org",
            slug="existing-org",
            admin_email="existing@academy.edu",
            password="NewPassword123",
            stdout=out,
        )

        existing_user.refresh_from_db()
        assert existing_user.is_superuser is True
        assert existing_user.is_staff is True
        assert existing_user.check_password("NewPassword123") is True

        org = Organization.objects.get(slug="existing-org")
        member = OrganizationMember.objects.get(organization=org, user=existing_user)
        assert member.role.name == "org_admin"

    def test_missing_password_in_non_interactive_raises(self):
        with pytest.raises(CommandError) as exc_info:
            call_command(
                "create_initial_organization",
                name="Fail Academy",
                slug="fail-academy",
                admin_email="nonexistent@academy.edu",
            )
        assert "Please provide --password" in str(exc_info.value)
