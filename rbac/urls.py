# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RoleViewSet, UserRoleViewSet

router = DefaultRouter()
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"user-roles", UserRoleViewSet, basename="userrole")

urlpatterns = [
    path("", include(router.urls)),
]
