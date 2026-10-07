# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.contrib.auth import get_user_model
from rbac.permissions import IsAdmin, IsOrgAdmin, IsTeacher, IsStudent, IsSelf
from rest_framework.test import APIRequestFactory

User = get_user_model()

def test_user_manager_exceptions():
    with pytest.raises(ValueError, match="The Email must be set"):
        User.objects.create_user(email=None)

    with pytest.raises(ValueError, match="Superuser must have is_staff=True"):
        User.objects.create_superuser(email="super@test.com", password="pwd", is_staff=False)

    with pytest.raises(ValueError, match="Superuser must have is_superuser=True"):
        User.objects.create_superuser(email="super@test.com", password="pwd", is_superuser=False)

@pytest.mark.django_db
def test_create_user_no_password():
    user = User.objects.create_user(email="nopass@test.com")
    assert not user.has_usable_password()

class DummyView:
    pass

def test_permission_classes_anonymous():
    factory = APIRequestFactory()
    request = factory.get('/')
    request.user = None
    
    view = DummyView()
    
    assert not IsAdmin().has_permission(request, view)
    assert not IsOrgAdmin().has_permission(request, view)
    assert not IsTeacher().has_permission(request, view)
    assert not IsStudent().has_permission(request, view)

@pytest.mark.django_db
def test_permission_classes_superuser():
    factory = APIRequestFactory()
    request = factory.get('/')
    request.user = User.objects.create_superuser(email="superadmin@test.com", password="pwd")
    
    view = DummyView()
    
    assert IsAdmin().has_permission(request, view)
    assert IsOrgAdmin().has_permission(request, view)
    assert IsTeacher().has_permission(request, view)
    assert IsStudent().has_permission(request, view)

@pytest.mark.django_db
def test_is_self_permission():
    factory = APIRequestFactory()
    request = factory.get('/')
    user1 = User.objects.create_user(email="u1@test.com")
    user2 = User.objects.create_user(email="u2@test.com")
    
    request.user = user1
    view = DummyView()
    
    assert IsSelf().has_object_permission(request, view, user1)
    assert not IsSelf().has_object_permission(request, view, user2)
