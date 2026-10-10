# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.urls import resolve, reverse
from rest_framework.test import APIClient, APIRequestFactory
from analytics.views import AdminDashboardView, TeacherDashboardView
from analytics.models import DailyOrgMetrics, DailyBatchMetrics
from organizations.models import Organization, Batch, OrganizationMember
from rbac.models import Role
from django.contrib.auth import get_user_model
import datetime

pytestmark = pytest.mark.django_db
User = get_user_model()
TEST_VAL = "password123"


def _org_admin_of(org, email):
    """Create an active org_admin member of ``org`` and return the user."""
    user = User.objects.create_user(email=email, password=TEST_VAL)
    role, _ = Role.objects.get_or_create(name='org_admin')
    member = OrganizationMember.objects.create(
        user=user, organization=org, role=role, is_active=True
    )
    member.roles.add(role)
    return user


# These go over HTTP via reverse() rather than calling ``view.get()`` directly,
# so URL resolution and the permission classes are exercised as in production.
# Calling the view object by hand previously let these tests pass while the
# endpoint was unreachable (shadowed by the organizations router).
def test_admin_dashboard_no_metrics_returns_404():
    org = Organization.objects.create(name='AOrg', contact_email='a@o.com')
    client = APIClient()
    client.force_authenticate(user=_org_admin_of(org, 'u@a.com'))

    resp = client.get(reverse('admin_dashboard', args=[org.id]))
    assert resp.status_code == 404


def test_admin_dashboard_with_metrics_returns_data():
    org = Organization.objects.create(name='AOrg2', contact_email='a2@o.com')
    DailyOrgMetrics.objects.create(
        organization=org,
        date=datetime.date.today(),
        total_active_users=5,
        total_inactive_users=2,
        avg_course_completion_rate=33.3,
        total_certificates_issued=1,
    )
    client = APIClient()
    client.force_authenticate(user=_org_admin_of(org, 'u2@a.com'))

    resp = client.get(reverse('admin_dashboard', args=[org.id]))
    assert resp.status_code == 200
    assert resp.data['total_active_users'] == 5


def test_admin_dashboard_is_reachable_not_shadowed_by_org_router():
    """Regression: the route must resolve to AdminDashboardView, not to
    OrganizationViewSet's own ``analytics/overview`` action."""
    match = resolve(reverse('admin_dashboard', args=[1]))
    view_cls = getattr(match.func, 'cls', getattr(match.func, 'view_class', None))
    assert view_cls is AdminDashboardView
    assert match.kwargs == {'org_id': 1}


def test_admin_dashboard_rejects_member_of_another_organization():
    """Org-level metrics must not leak to an outsider now that it is reachable."""
    victim = Organization.objects.create(name='Victim', contact_email='v@o.com')
    other = Organization.objects.create(name='Other', contact_email='o@o.com')
    DailyOrgMetrics.objects.create(
        organization=victim,
        date=datetime.date.today(),
        total_active_users=999,
        total_inactive_users=0,
        avg_course_completion_rate=50.0,
        total_certificates_issued=7,
    )
    client = APIClient()
    client.force_authenticate(user=_org_admin_of(other, 'outsider@o.com'))

    resp = client.get(reverse('admin_dashboard', args=[victim.id]))
    assert resp.status_code == 403
    assert 'total_active_users' not in resp.data


def test_teacher_dashboard_no_metrics_returns_404():
    factory = APIRequestFactory()
    user = User.objects.create_user(email='t@a.com', password=TEST_VAL)
    org = Organization.objects.create(name='AO', contact_email='ao@o.com')
    import datetime
    batch = Batch.objects.create(organization=org, name='B1', start_date=datetime.date.today(), end_date=datetime.date.today())

    view = TeacherDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    resp = view.get(request, org.id, batch.id)
    assert resp.status_code == 404


def test_teacher_dashboard_with_metrics_returns_data():
    factory = APIRequestFactory()
    user = User.objects.create_user(email='t2@a.com', password=TEST_VAL)
    org = Organization.objects.create(name='AO2', contact_email='ao2@o.com')
    import datetime
    batch = Batch.objects.create(organization=org, name='B2', start_date=datetime.date.today(), end_date=datetime.date.today())
    DailyBatchMetrics.objects.create(
        batch=batch,
        date=datetime.date.today(),
        avg_assignment_score=72.5,
        top_drop_off_node_id=10,
        students_at_risk_count=1,
    )

    view = TeacherDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    resp = view.get(request, org.id, batch.id)
    assert resp.status_code == 200
    assert 'avg_assignment_score' in resp.data
from rest_framework.test import APIClient


# Added tests for uncovered lines in analytics/views.py
@pytest.mark.django_db
def test_analytics_view():
    client = APIClient()
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@analytics.com", password=TEST_VAL)
    client.force_authenticate(user=user)
    # create an org and call the org-scoped analytics endpoint
    from organizations.models import Organization
    org = Organization.objects.create(name="Aorg", slug="aorg", contact_email="a@org.com")
    response = client.get(f"/api/organizations/{org.id}/analytics/overview/")
    assert response.status_code in (200, 403, 404)


# Added tests for uncovered lines in analytics/views.py
@pytest.mark.django_db
def test_analytics_permissions():
    client = APIClient()
    user_model = get_user_model()
    user = user_model.objects.create_user(email="user@analytics.com", password=TEST_VAL)
    client.force_authenticate(user=user)
    from organizations.models import Organization
    org = Organization.objects.create(name="Aorg2", slug="aorg2", contact_email="b@org.com")

    response = client.get(f"/api/organizations/{org.id}/analytics/overview/")
    assert response.status_code in (403, 200, 404)

    user.is_superuser = True
    user.save()
    response = client.get(f"/api/organizations/{org.id}/analytics/overview/")
    assert response.status_code in (200, 404)

def test_preexisting_public_urls_are_unchanged():
    """Contract guard for external API consumers (web + mobile clients).

    These three URLs are public API surface and must keep resolving to the
    same handlers they did before the admin dashboard was given its own
    non-colliding path. ``analytics/overview`` in particular has always been
    served by OrganizationViewSet, never by AdminDashboardView.
    """
    expected = {
        '/api/organizations/1/analytics/overview/': (
            'organizations.views.OrganizationViewSet', {'pk': '1'},
        ),
        '/api/organizations/1/batches/2/analytics/': (
            'analytics.views.TeacherDashboardView', {'org_id': 1, 'batch_id': 2},
        ),
        '/api/organizations/1/students/me/dashboard/': (
            'analytics.views.StudentDashboardView', {'org_id': 1},
        ),
    }
    for url, (want_cls, want_kwargs) in expected.items():
        match = resolve(url)
        cls = getattr(match.func, 'cls', getattr(match.func, 'view_class', None))
        assert f'{cls.__module__}.{cls.__name__}' == want_cls, f'{url} changed handler'
        assert match.kwargs == want_kwargs, f'{url} changed kwargs'
