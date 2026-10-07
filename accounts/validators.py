# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from rest_framework import serializers


DUMMY_EMAIL_DOMAINS = {
    "example.com",
    "example.org",
    "example.net",
    "example.test",
    "test.com",
    "test.org",
    "test.net",
    "invalid.com",
    "invalid.org",
    "invalid.net",
    "dummy.com",
    "dummy.org",
    "dummy.net",
    "fake.com",
    "fake.org",
    "mailinator.com",
    "tempmail.com",
}

DUMMY_EMAIL_LOCAL_PARTS = {
    "test",
    "example",
    "dummy",
    "fake",
    "invalid",
    "noreply",
    "no-reply",
}


def validate_non_dummy_email(value):
    if not isinstance(value, str):
        raise serializers.ValidationError("Enter a valid email address.")

    value = value.strip()
    try:
        local_part, domain = value.rsplit("@", 1)
    except ValueError:
        raise serializers.ValidationError("Enter a valid email address.")

    local_part = local_part.lower()
    domain = domain.lower()

    if local_part in DUMMY_EMAIL_LOCAL_PARTS or domain in DUMMY_EMAIL_DOMAINS:
        raise serializers.ValidationError("Dummy email addresses are not allowed.")

    return value
