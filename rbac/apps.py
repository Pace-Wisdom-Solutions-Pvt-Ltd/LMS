# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.apps import AppConfig


class RbacConfig(AppConfig):
    name = "rbac"

    def ready(self):
        import rbac.signals
