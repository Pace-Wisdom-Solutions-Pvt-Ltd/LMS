# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from rest_framework import status
from curriculum.models import Course  # Replace with actual model

@pytest.mark.django_db
def test_curriculum_view():
    client = APIClient()
    # Call the org-scoped courses list endpoint
    from organizations.models import Organization
    org = Organization.objects.create(name="CurOrg", slug="cur-org", contact_email="c@org.com")
    url = f"/api/organizations/{org.id}/courses/"
    response = client.get(url)

    assert response.status_code in (status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    # Add more assertions based on the response structure