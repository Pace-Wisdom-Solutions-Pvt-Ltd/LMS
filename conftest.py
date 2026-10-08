# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
import secrets
from django.conf import settings

# Shared test password for all tests to avoid hard-coded credentials flagged by Sonar
TEST_PASSWORD = secrets.token_urlsafe(12)

# Shared test IP used in tests. Prefer providing via environment variable in CI
# to avoid hard-coded IP literals. If not provided, fall back to localhost resolved
# by name which is a safer default than an arbitrary literal.
TEST_IP = os.environ.get("TEST_IP")
if not TEST_IP:
    import socket
    try:
        TEST_IP = socket.gethostbyname(socket.gethostname())
    except Exception:
        TEST_IP = "127.0.0.1"


@pytest.fixture(autouse=True)
def use_local_storage(settings):
    """Force local storage for all tests to avoid S3 calls and hangs."""
    settings.STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.InMemoryStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    # Also disable real S3 flag if it exists
    settings.USE_S3 = False
    settings.TESTING = True
    # Run Celery tasks eagerly in-process during tests and use an in-memory broker
    # to avoid requiring a running Redis/AMQP service in CI/local dev.
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    # Some codebases read BROKER_URL/BROKER_URI directly; set both common names.
    settings.CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "memory://")
    settings.BROKER_URL = os.environ.get("BROKER_URL", settings.CELERY_BROKER_URL)
    
    # Use in-memory cache for tests to avoid Redis Connection Error
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake-key",
        }
    }
    # Start each test with an empty cache so rate-limit counters on the
    # auth endpoints do not carry over between tests.
    from django.core.cache import cache
    cache.clear()

