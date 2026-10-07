# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import os
import secrets
import pytest
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model
from rbac.views import UserRoleViewSet
from rbac.models import Role, UserRole

pytestmark = pytest.mark.django_db
User = get_user_model()

# Use an environment-backed test password to avoid hard-coded credentials in tests
TEST_PASSWORD = os.environ.get("TEST_USER_PASSWORD") or secrets.token_urlsafe(16)


def _legacy_userrole_queryset_filtering_and_destroy():
    factory = APIRequestFactory()
    admin = User.objects.create_user('a@r.com', TEST_PASSWORD)
    role = Role.objects.create(name='teacher')
    u = User.objects.create_user('u@r.com', TEST_PASSWORD)
    ur = UserRole.objects.create(user=u, role=role)

    view = UserRoleViewSet()
    # filter by user
    req = factory.get('/?user=%s' % u.id)
    req.user = admin
    request = view.initialize_request(req)
    request.user = admin
    view.request = request
    qs = view.get_queryset()
    assert qs.filter(user__id=u.id).exists()

    # test destroy returns message
    view.kwargs = {'pk': str(ur.id)}
    resp = view.destroy(request, pk=str(ur.id))
    assert resp.status_code == 200
    assert 'revoked' in resp.data['detail']
