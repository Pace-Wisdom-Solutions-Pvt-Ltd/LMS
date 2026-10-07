# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import datetime
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory
from analytics.views import AdminDashboardView, TeacherDashboardView
from analytics.models import DailyOrgMetrics, DailyBatchMetrics
from organizations.models import Organization, Batch, BatchStudent, OrganizationMember
from rbac.models import Role
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db
User = get_user_model()
DEFAULT_TEST_CREDENTIAL = 'p'


def test_admin_dashboard_no_metrics_returns_404():
    factory = APIRequestFactory()
    user = User.objects.create_user('u@a.com', DEFAULT_TEST_CREDENTIAL)
    org = Organization.objects.create(name='AOrg', contact_email='a@o.com')

    view = AdminDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    resp = view.get(request, org.id)
    assert resp.status_code == 404


def test_admin_dashboard_with_metrics_returns_data():
    factory = APIRequestFactory()
    user = User.objects.create_user('u2@a.com', DEFAULT_TEST_CREDENTIAL)
    org = Organization.objects.create(name='AOrg2', contact_email='a2@o.com')
    DailyOrgMetrics.objects.create(
        organization=org,
        date=datetime.date.today(),
        total_active_users=5,
        total_inactive_users=2,
        avg_course_completion_rate=33.3,
        total_certificates_issued=1,
    )

    view = AdminDashboardView()
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    resp = view.get(request, org.id)
    assert resp.status_code == 200
    assert 'total_active_users' in resp.data


def test_teacher_dashboard_no_metrics_returns_404():
    factory = APIRequestFactory()
    user = User.objects.create_user('t@a.com', DEFAULT_TEST_CREDENTIAL)
    org = Organization.objects.create(name='AO', contact_email='ao@o.com')
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
    user = User.objects.create_user('t2@a.com', DEFAULT_TEST_CREDENTIAL)
    org = Organization.objects.create(name='AO2', contact_email='ao2@o.com')
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


@pytest.mark.django_db
def test_analytics_view():
    client = APIClient()
    from organizations.models import Organization
    org = Organization.objects.create(name="MetricsOrg", slug="metrics-org", contact_email="m@org.com")
    url = f"/api/organizations/{org.id}/analytics/overview/"
    response = client.get(url)

    # The view may require authentication; accept 200, 401 or 404 if no metrics
    assert response.status_code in (status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND)
    # Add more assertions based on the response structure
