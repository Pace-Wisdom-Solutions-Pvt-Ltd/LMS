# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request as DRFRequest
from django.contrib.auth import get_user_model
from organizations.views import OrganizationViewSet, OrganizationMemberViewSet, BatchStudentViewSet
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role
from unittest.mock import patch

pytestmark = pytest.mark.django_db
User = get_user_model()




def test_organization_member_get_queryset_none():
    factory = APIRequestFactory()
    user = User.objects.create_user('u@org.com', 'p')
    view = OrganizationMemberViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    view.kwargs = {}
    qs = view.get_queryset()
    assert qs.count() == 0


@patch("organizations.views._send_invite_link")
def test_batchstudent_create_and_destroy_flow(_mock_send_invite):
    factory = APIRequestFactory()
    user = User.objects.create_user('admin@org.com', 'p')
    org = Organization.objects.create(name='OrgX', contact_email='x@o.com')
    import datetime
    batch = Batch.objects.create(organization=org, name='Fall', start_date=datetime.date.today(), end_date=datetime.date.today())

    # ensure student role exists
    _, _ = Role.objects.get_or_create(name='student')

    view = BatchStudentViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    data = {'students': [{'email': 's1@x.com', 'first_name': 'S1'}]}
    post_req = factory.post('/', data=data, format='json')
    post_req.user = user
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.format_kwarg = None
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id}
    resp = view.create(request, org.id, batch.id)
    assert resp.status_code in (201,)

    # create a batch student and then delete
    bs = BatchStudent.objects.filter(batch=batch).first()
    del_req = factory.delete('/')
    del_req.user = user
    del_request = view.initialize_request(del_req)
    del_request.user = user
    view.request = del_request
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id, 'pk': str(bs.student.user.id)}
    resp2 = view.destroy(del_request, org.id, batch.id, pk=str(bs.student.user.id))
    assert resp2.status_code in (204,)


@patch("organizations.views._send_invite_link")
def test_batchstudent_resends_invite_for_existing_inactive_user(mock_send_invite):
    factory = APIRequestFactory()
    admin = User.objects.create_user('admin2@org.com', 'p')
    org = Organization.objects.create(name='OrgY', contact_email='y@o.com')
    import datetime
    batch = Batch.objects.create(
        organization=org,
        name='Spring',
        start_date=datetime.date.today(),
        end_date=datetime.date.today(),
    )
    Role.objects.get_or_create(name='student')
    User.objects.create_user(
        email="inactive_student@x.com",
        is_active=False,
    )

    view = BatchStudentViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    data = {'students': [{'email': 'inactive_student@x.com', 'first_name': 'S1'}]}
    post_req = factory.post('/', data=data, format='json')
    post_req.user = admin
    request = view.initialize_request(post_req)
    request.user = admin
    view.request = request
    view.format_kwarg = None
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id}

    resp = view.create(request, org.id, batch.id)

    assert resp.status_code == 201
    mock_send_invite.assert_called_once_with("inactive_student@x.com", organization=org)
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from organizations.models import Organization

# Renamed 'User' to 'user_model' to follow naming conventions

# Added tests for uncovered lines in organizations/views.py
@pytest.mark.django_db
@patch("organizations.serializers._send_invite_link")
def test_organization_member_create(_mock_send_invite):
    client = APIClient()
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="admin@org.com", password="password123", is_superuser=True)
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    # ensure role exists
    from rbac.models import Role
    Role.objects.get_or_create(name="teacher", defaults={"description": "Teacher"})
    response = client.post(
        f"/api/organizations/{org.id}/members/",
        {"user_email": "member@org.com", "role_name": "teacher"},
        format='json'
    )
    assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)

@pytest.mark.django_db
@patch("organizations.serializers._send_invite_link")
def test_organization_member_permissions(_mock_send_invite):
    client = APIClient()
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@org.com", password="password123")
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    from rbac.models import Role
    Role.objects.get_or_create(name="teacher", defaults={"description": "Teacher"})
    response = client.post(
        f"/api/organizations/{org.id}/members/",
        {"user_email": "member@org.com", "role_name": "teacher"},
        format='json'
    )
    assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST)

    user.is_superuser = True
    user.save()
    response = client.post(
        f"/api/organizations/{org.id}/members/",
        {"user_email": "member@org.com", "role_name": "teacher"},
        format='json'
    )
    assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)

@pytest.mark.django_db
def test_organization_retrieve():
    client = APIClient()
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@org.com", password="password123")
    client.force_authenticate(user=user)

    org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="test@org.com")
    # make the user an organization member so they can retrieve
    from rbac.models import Role
    from organizations.models import OrganizationMember
    role, _ = Role.objects.get_or_create(name="org_admin", defaults={"description": "Org Admin"})
    OrganizationMember.objects.create(organization=org, user=user, role=role)

    response = client.get(f"/api/organizations/{org.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data.get("name") == "Test Org"
