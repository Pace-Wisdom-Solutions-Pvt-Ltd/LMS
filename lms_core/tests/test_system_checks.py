# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

"""Guard against deployment-blocking configuration errors.

The pytest suite never uploads an image, so it previously passed even when
Pillow was missing from the dependency files. Django only surfaces that as a
``fields.E210`` system check error, which ``manage.py check``/``runserver``
raise at startup -- breaking a fresh install. These tests run the same checks
CI would otherwise skip.
"""
import pytest
from django.core.management import call_command


def test_django_system_checks_pass():
    """``manage.py check`` must be clean, or the server will not boot."""
    call_command("check")


def test_pillow_is_installed_for_imagefield():
    """Three models declare ImageField, which requires Pillow at import time."""
    pytest.importorskip(
        "PIL",
        reason="Pillow is required by accounts.User.profile_picture, "
        "curriculum.Course.thumbnail and organizations.Organization.logo",
    )


@pytest.mark.django_db
def test_no_missing_migrations():
    """Model changes must be committed alongside their migrations."""
    call_command("makemigrations", "--check", "--dry-run")
