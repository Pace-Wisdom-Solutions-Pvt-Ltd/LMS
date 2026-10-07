# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth.hashers import check_password
from django.test import RequestFactory
from django.contrib.messages.storage.fallback import FallbackStorage
from importlib import import_module
from django.conf import settings

from accounts.admin import CustomUserAdmin, CustomUserCreationForm, CustomUserChangeForm
from accounts.models import User

SessionStore = import_module(settings.SESSION_ENGINE).SessionStore


@pytest.mark.django_db
def test_custom_user_admin_password_hash_display():
    """Verify that password is not rendered as raw editable text, but as ReadOnlyPasswordHashField."""
    admin_user = User.objects.create_superuser(
        email="admin@test.com", password="SuperPassword123!", first_name="Admin", last_name="User"
    )
    test_user = User.objects.create_user(
        email="learner@test.com", password="LearnerPassword123!", first_name="Learner", last_name="User"
    )

    site = AdminSite()
    user_admin = CustomUserAdmin(User, site)
    rf = RequestFactory()
    req = rf.get(f"/admin/accounts/user/{test_user.pk}/change/")
    req.user = admin_user

    resp = user_admin.change_view(req, str(test_user.pk))
    assert resp.status_code == 200
    resp.render()
    content = resp.content.decode()

    # Must contain password reset link and algorithm info
    assert "Reset password" in content
    assert "../password/" in content
    assert "pbkdf2_sha256" in content


@pytest.mark.django_db
def test_admin_password_reset_stores_hash_only():
    """Verify that resetting password via admin stores only the hash and validates with check_password."""
    admin_user = User.objects.create_superuser(
        email="super@test.com", password="SuperPassword123!", first_name="Admin", last_name="User"
    )
    test_user = User.objects.create_user(
        email="target@test.com", password="InitialPassword123!", first_name="Target", last_name="User"
    )

    site = AdminSite()
    user_admin = CustomUserAdmin(User, site)
    rf = RequestFactory()

    req = rf.post(
        f"/admin/accounts/user/{test_user.pk}/password/",
        data={
            "password1": "BrandNewSecurePass@2026",
            "password2": "BrandNewSecurePass@2026",
        },
    )
    req.user = admin_user
    req.session = SessionStore()
    req._messages = FallbackStorage(req)

    resp = user_admin.user_change_password(req, str(test_user.pk))
    assert resp.status_code == 302  # redirect after successful reset

    test_user.refresh_from_db()
    # Ensure it's stored as hash, NOT raw text
    assert test_user.password.startswith("pbkdf2_sha256$")
    assert test_user.password != "BrandNewSecurePass@2026"
    assert check_password("BrandNewSecurePass@2026", test_user.password) is True


@pytest.mark.django_db
def test_admin_user_creation_form_hashes_password():
    """Verify that adding a user via CustomUserCreationForm hashes password."""
    form = CustomUserCreationForm(
        data={
            "email": "created_via_admin@test.com",
            "first_name": "New",
            "last_name": "AdminUser",
            "password1": "CreatedPass@123",
            "password2": "CreatedPass@123",
        }
    )
    assert form.is_valid(), form.errors
    user = form.save()
    assert user.password.startswith("pbkdf2_sha256$")
    assert check_password("CreatedPass@123", user.password) is True
