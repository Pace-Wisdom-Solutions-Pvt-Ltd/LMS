# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.http import HttpRequest
from accounts.utils import get_subdomain
from rest_framework import serializers
from accounts.validators import validate_non_dummy_email

class DummyRequest(HttpRequest):
    def __init__(self, host):
        super().__init__()
        self._host = host
    def get_host(self):
        return self._host

@pytest.mark.parametrize('host,expected', [
    ('localhost', None),
    ('127.0.0.1', None),
    ('::1', None),
    ('example.local', None),
    ('pace.localhost', 'pace'),
    ('test.lms.com', 'test'),
    ('lms.com', None),
    ('sub.domain.example.org', 'sub'),
])
def test_get_subdomain(host, expected):
    request = DummyRequest(host)
    assert get_subdomain(request) == expected


@pytest.mark.parametrize('host,expected', [
    ('PACE.LocalHost:8000', 'pace'),
    ('Sub.Example.Com:443', 'sub'),
])
def test_get_subdomain_handles_case_and_port(host, expected):
    request = DummyRequest(host)
    assert get_subdomain(request) == expected


def test_validate_non_dummy_email_accepts_real_email():
    assert validate_non_dummy_email(" real.user@company.com ") == "real.user@company.com"


@pytest.mark.parametrize("value,error_text", [
    (None, "Enter a valid email address."),
    ("not-an-email", "Enter a valid email address."),
    ("dummy@company.com", "Dummy email addresses are not allowed."),
    ("real@mailinator.com", "Dummy email addresses are not allowed."),
])
def test_validate_non_dummy_email_rejects_invalid_and_dummy_values(value, error_text):
    with pytest.raises(serializers.ValidationError) as exc:
        validate_non_dummy_email(value)
    assert error_text in str(exc.value)
