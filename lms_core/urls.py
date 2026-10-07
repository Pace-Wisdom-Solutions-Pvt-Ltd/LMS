# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

"""
URL configuration for lms_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings               
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from accounts.views import ChangePasswordView

API_ORG_PREFIX = "api/organizations/"

urlpatterns = [
    path("admin/", admin.site.urls),
    # ── API ───────────────────────────────────────────────────────────────────
    path("api/", include("accounts.urls")),
    path("auth/change-password/", ChangePasswordView.as_view(), name="root_change_password"),
    path("api/", include("rbac.urls")),
    path(API_ORG_PREFIX, include("organizations.urls")),
    path(API_ORG_PREFIX, include("analytics.urls")),
    path("api/", include("curriculum.urls")),
    path("api/", include("gamification.urls")),
    # ── OpenAPI schema + docs ─────────────────────────────────────────────────
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)