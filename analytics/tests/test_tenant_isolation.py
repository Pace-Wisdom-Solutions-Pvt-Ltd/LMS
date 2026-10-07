# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

"""Tenant-isolation regression tests for the analytics dashboards.

These exercise the views over HTTP (via the URL router) rather than calling
``view.get()`` directly, so that permission classes and URL kwargs are applied
exactly as they are in production.
"""
import datetime

import pytest
from rest_framework.test import APIClient

from analytics.models import DailyBatchMetrics
from organizations.models import Organization, Batch, OrganizationMember
from rbac.models import Role
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db
User = get_user_model()

TEST_CREDENTIAL = "p"


def _member_of(org, email):
    """Create an active member of ``org`` and return the underlying user."""
    user = User.objects.create_user(email, TEST_CREDENTIAL)
    role, _ = Role.objects.get_or_create(name="student")
    OrganizationMember.objects.create(
        user=user, organization=org, role=role, is_active=True
    )
    return user


def test_batch_analytics_rejects_batch_from_another_organization():
    """A batch belonging to another org must not be readable through org_id."""
    org_a = Organization.objects.create(name="OrgA", contact_email="a@o.com")
    org_b = Organization.objects.create(name="OrgB", contact_email="b@o.com")

    today = datetime.date.today()
    batch_b = Batch.objects.create(
        organization=org_b, name="Batch B", start_date=today, end_date=today
    )
    DailyBatchMetrics.objects.create(
        batch=batch_b,
        date=today,
        avg_assignment_score=88.8,
        top_drop_off_node_id=7,
        students_at_risk_count=5,
    )

    client = APIClient()
    client.force_authenticate(user=_member_of(org_a, "attacker@a.com"))

    resp = client.get(f"/api/organizations/{org_a.id}/batches/{batch_b.id}/analytics/")

    assert resp.status_code == 404
    assert "avg_assignment_score" not in resp.data


def test_batch_analytics_returns_metrics_for_own_organization():
    """The same endpoint still works for a batch that does belong to the org."""
    org = Organization.objects.create(name="OrgOwn", contact_email="own@o.com")

    today = datetime.date.today()
    batch = Batch.objects.create(
        organization=org, name="Own Batch", start_date=today, end_date=today
    )
    DailyBatchMetrics.objects.create(
        batch=batch,
        date=today,
        avg_assignment_score=42.0,
        top_drop_off_node_id=3,
        students_at_risk_count=1,
    )

    client = APIClient()
    client.force_authenticate(user=_member_of(org, "member@own.com"))

    resp = client.get(f"/api/organizations/{org.id}/batches/{batch.id}/analytics/")

    assert resp.status_code == 200
    assert resp.data["avg_assignment_score"] == 42.0
