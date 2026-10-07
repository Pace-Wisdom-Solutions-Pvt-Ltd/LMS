# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    UserViewSet,
    AcceptInviteView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    ReinviteView,
    VerifyInviteTokenView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    # Auth endpoints
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("auth/accept-invite/", AcceptInviteView.as_view(), name="accept_invite"),
    path("auth/verify-invite/", VerifyInviteTokenView.as_view(), name="verify_invite"),
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("auth/reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view({"post": "logout"}), name="logout"),
    # User Profile (users/me/)
    path("", include(router.urls)),
    # Reinvite
    path("users/<str:identifier>/reinvite/", ReinviteView.as_view(), name="reinvite"),
]
