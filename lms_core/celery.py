# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import platform
import multiprocessing
from celery import Celery

# On macOS, force "spawn" start method to avoid fork safety issues with Python 3.13+ in Celery workers
if platform.system() == "Darwin":
    try:
        multiprocessing.set_start_method("spawn", force=True)
    except Exception:
        pass

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_core.settings')

app = Celery('lms_core')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# ── Task routing & performance tuning ────────────────────────────────────────

app.conf.update(
    worker_prefetch_multiplier=1,
    task_soft_time_limit=60,
    task_time_limit=90,
    task_acks_late=True,
    result_expires=3600,
)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
