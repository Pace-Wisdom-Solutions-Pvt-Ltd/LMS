# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from datetime import timedelta
import uuid

from django.conf import settings
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.utils import timezone
from rest_framework.views import APIView
from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, filters, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
    inline_serializer,
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers as drf_serializers

from rbac.models import Role, UserRole
from rbac.permissions import IsAdmin, IsSuperAdmin, IsOrgAdmin, IsTeacher, IsStudent, IsSelf
from lms_core.email_utils import (
    build_frontend_url,
    render_branded_email,
    send_html_email_via_ses,
)
from .models import InviteToken
from .serializers import (
    UserSerializer,
    UserUpdateSerializer,
    UserInviteSerializer,
    LoginSerializer,
    AcceptInviteSerializer,
    ForgotPasswordSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()

INVITE_EXPIRY_SECONDS = 604800  # 7 days
REINVITE_COOLDOWN_HOURS = 24

MSG_ACTIVATE_ACCOUNT = "Please accept your invitation to activate your account."
MSG_LOGIN_INVITE_EXPIRED = "Your invitation has expired. Please contact your administrator."


def check_user_active_and_invited_status(user):
    if user.status == User.STATUS_EXPIRED or user.effective_status == User.STATUS_EXPIRED:
        return Response(
            {"detail": MSG_LOGIN_INVITE_EXPIRED},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.effective_status in [User.STATUS_PENDING, User.STATUS_REINVITED]:
        return Response(
            {"detail": MSG_ACTIVATE_ACCOUNT},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.is_active:
        return Response(
            {"detail": MSG_ACCOUNT_INACTIVE},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return None


def _get_user_org_memberships(user):
    from organizations.models import OrganizationMember

    return OrganizationMember.objects.filter(user=user)


def _get_active_org_memberships(user):
    from organizations.models import OrganizationMember

    return OrganizationMember.objects.filter(
        user=user,
        is_active=True,
        organization__is_active=True,
    ).select_related("organization", "role")


def _build_orgs_payload(memberships, include_name=False):
    orgs_data = []
    for membership in memberships:
        org_payload = {
            "org_id": membership.organization.id,
            "role": membership.role.name,
            "logo": membership.organization.logo.url if getattr(membership.organization, "logo", None) else None,
        }
        if include_name:
            org_payload["org_name"] = membership.organization.name
        orgs_data.append(org_payload)
    return orgs_data


# ── Password Authentication ──────────────────────────────────────────────────


def _build_signed_token(user_email: str) -> str:
    signer = TimestampSigner()
    payload = f"{user_email}:{uuid.uuid4().hex}"
    return signer.sign(payload)


def _extract_email_from_signed_token(token: str, max_age=None) -> str:
    signer = TimestampSigner()
    payload = signer.unsign(token, max_age=max_age)
    return payload.split(":", 1)[0] if ":" in payload else payload


def _send_invite_link(user_email: str, organization=None, created_by=None):
    """
    Create a DB-backed invite token, revoke any previous tokens for the same
    user, and send the invitation email.
    """
    user = User.objects.get(email=user_email)

    # 1. Revoke all existing active tokens for this user
    InviteToken.objects.filter(user=user, is_revoked=False).update(is_revoked=True)

    # 2. Sign a fresh token
    signed_value = _build_signed_token(user_email)

    # 3. Determine attempt number
    attempt_number = user.reinvite_count + 1

    # 4. Persist the token in the DB
    now = timezone.now()
    InviteToken.objects.create(
        user=user,
        token=signed_value,
        expires_at=now + timedelta(seconds=INVITE_EXPIRY_SECONDS),
        attempt_number=attempt_number,
        created_by=created_by,
        organization=organization,
    )

    # 5. Update user tracking fields and lifecycle status
    user.last_invited_at = now
    user.status = User.STATUS_PENDING if attempt_number == 1 else User.STATUS_REINVITED
    user.is_active = False
    user.save(update_fields=['last_invited_at', 'status', 'is_active'])

    # 6. Build and send the email
    # Send link directly to frontend with token
    # Frontend will validate token on page load and show reset-password form
    invite_link = f"{build_frontend_url('/reset-password')}?token={signed_value}"
    organization_name = getattr(organization, "name", "") or "LMS"

    text_message = (
        f"You've been invited to join {organization_name}. "
        f"Accept your invitation and set your password here: {invite_link}\n"
        "This link will expire in 7 days."
    )
    html_message = render_branded_email(
        title="You Have Been Invited",
        intro=(
            f"You have been invited to join {organization_name}. "
            "Use the button below to activate your account and set your password. "
            "This invitation link will expire in 7 days."
        ),
        cta_label="Accept Invitation",
        cta_url=invite_link,
        recipient_email=user_email,
        organization=organization,
        footer_note="You can also copy and paste this secure invitation link into your browser.",
    )

    send_html_email_via_ses(
        subject="You have been invited to LMS",
        text_body=text_message,
        html_body=html_message,
        recipient_list=[user_email],
        organization=organization,
    )



# ── Invite-related Constants & Helpers ───────────────────────────────────────

MSG_INVALID_INVITE = "Invalid invite link."
MSG_INVITE_EXPIRED = "Your invitation has expired."
MSG_DELETED_ACCOUNT = "This invitation is no longer valid because the account was deleted."
MSG_INVITE_USED = "This invite link has already been used."
MSG_INVITE_REVOKED = "This invite link has been revoked. Please use the latest invite link."
MSG_USER_NOT_FOUND = "User not found."
MSG_ACCOUNT_INACTIVE = "Account is inactive. Please contact support."
MSG_ORG_INACTIVE = "Your account is associated with an inactive organization. Please contact your administrator."

def _handle_expired_user_status(email):
    """Update user status to EXPIRED if they exist and are not active/deleted."""
    user = User.all_objects.filter(email=email, is_deleted=False).first()
    if not user:
        user = User.all_objects.filter(email=email, is_deleted=True).first()
    if user:
        if user.is_deleted:
            return MSG_DELETED_ACCOUNT
        if user.status not in [User.STATUS_ACTIVE, User.STATUS_DELETED]:
            user.status = User.STATUS_EXPIRED
            user.save(update_fields=["status"])
    return MSG_INVITE_EXPIRED

def _validate_invite_token(token):
    """
    Validates the invite token and returns (email, user, db_token) or (None, None, error_response).
    Consolidates logic for VerifyInviteTokenView and AcceptInviteView.
    """
    if not token:
        return None, None, Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        email = _extract_email_from_signed_token(token, max_age=INVITE_EXPIRY_SECONDS)
    except SignatureExpired:
        try:
            email = _extract_email_from_signed_token(token)
            msg = _handle_expired_user_status(email)
            return None, None, Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        except BadSignature:
            return None, None, Response({"detail": MSG_INVALID_INVITE}, status=status.HTTP_400_BAD_REQUEST)
    except BadSignature:
        return None, None, Response({"detail": MSG_INVALID_INVITE}, status=status.HTTP_400_BAD_REQUEST)

    user = User.all_objects.filter(email__iexact=email, is_deleted=False).first()
    if not user:
        user = User.all_objects.filter(email__iexact=email, is_deleted=True).first()
    if user and user.is_deleted:
        return None, None, Response({"detail": MSG_DELETED_ACCOUNT}, status=status.HTTP_400_BAD_REQUEST)

    db_token = InviteToken.objects.filter(token=token).first()
    if not db_token:
        if not user:
            return None, None, Response({"detail": MSG_USER_NOT_FOUND}, status=status.HTTP_400_BAD_REQUEST)
        # Backward compatibility: older invite links were only signed tokens
        # and were not persisted in the InviteToken table.
        return email, user, None

    if db_token.is_used:
        return None, None, Response({"detail": MSG_INVITE_USED}, status=status.HTTP_400_BAD_REQUEST)

    if db_token.is_revoked:
        return None, None, Response({"detail": MSG_INVITE_REVOKED}, status=status.HTTP_400_BAD_REQUEST)

    return email, user, db_token


from django.shortcuts import redirect

class VerifyInviteTokenView(APIView):
    """
    GET /api/auth/verify-invite/?token=...
    Validates the token is valid, not expired, and not revoked.
    Returns JSON response with validation status (can be called by frontend to validate before form submission).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        email, _, result = _validate_invite_token(token)
        
        # If result is a Response object, it means validation failed
        if isinstance(result, Response):
            return result

        # Token is valid
        return Response(
            {
                "detail": "Token is valid.",
                "email": email,
                "is_valid": True
            },
            status=status.HTTP_200_OK
        )



def _send_password_reset_link(user_email: str, organization=None):
    token = _build_signed_token(user_email)

    # Send link directly to frontend with token
    # Frontend will validate token on page load and show reset-password form
    reset_link = f"{build_frontend_url('/reset-password')}?token={token}"
    organization_name = getattr(organization, "name", "") or "LMS"

    text_message = (
        f"Reset your {organization_name} password using the link below: {reset_link}\n"
        "This link will expire in 7 days. Use the set-password page to complete it."
    )
    html_message = render_branded_email(
        title="Password Reset Request",
        intro=(
            f"We received a request to reset your {organization_name} password. "
            "Use the button below to choose a new password. "
            "This secure link will expire in 7 days."
        ),
        cta_label="Reset Password",
        cta_url=reset_link,
        recipient_email=user_email,
        organization=organization,
        footer_note="If you did not request a password reset, you can safely ignore this email.",
    )

    send_html_email_via_ses(
        subject="Reset your LMS password",
        text_body=text_message,
        html_body=html_message,
        recipient_list=[user_email],
        organization=organization,
    )

def _build_org_data(member):
    roles_list = [r.name for r in member.roles.all()]
    if not roles_list and member.role:
        roles_list = [member.role.name]
        
    primary_role = member.role.name if member.role else None
    if not primary_role and roles_list:
        primary_role = roles_list[0]
        
    logo_url = member.organization.logo.url if getattr(member.organization, "logo", None) else None
    
    return {
        "org_id": member.organization.id,
        "org_name": member.organization.name,
        "role": primary_role,
        "roles": roles_list,
        "logo": logo_url,
    }


class LoginView(APIView):
    """
    POST /api/auth/login/
    Expects email and password and returns JWT tokens.
    """

    permission_classes = [AllowAny]

    def _validate_credentials(self, email, password):
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            pass
        return None

    def _validate_user_status(self, user):
        return check_user_active_and_invited_status(user)

    @extend_schema(
        tags=["Authentication"],
        summary="Login",
        description="Authenticate with email and password to obtain access and refresh tokens.",
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "access": drf_serializers.CharField(),
                    "refresh": drf_serializers.CharField(),
                    "user": UserSerializer(),
                },
            ),
            400: OpenApiResponse(description="Invalid credentials."),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = getattr(serializer, "validated_data", {})
        email = str(validated_data.get("email", ""))
        password = str(validated_data.get("password", ""))

        user = self._validate_credentials(email, password)
        if not user:
            return Response(
                {"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST
            )

        status_response = self._validate_user_status(user)
        if status_response:
            return status_response

        # ── Organization Data & Payload ──────────────────────────────────────────
        from organizations.models import OrganizationMember
        active_memberships = OrganizationMember.objects.filter(
            user=user, is_active=True, organization__is_active=True
        ).select_related("organization", "role").prefetch_related("roles")

        if not user.is_superuser and not active_memberships.exists():
            return Response(
                {"detail": "Your account or organization is currently inactive. Please contact support."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        orgs_data = [_build_org_data(member) for member in active_memberships]

        refresh = RefreshToken.for_user(user)
        refresh["organizations"] = orgs_data

        # Update last login
        from django.contrib.auth.models import update_last_login
        update_last_login(None, user)

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user, context={"request": request}).data,
                "organizations": orgs_data,
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/
    Sends a password reset link to the provided email address.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Forgot password",
        description=(
            "Send a password reset link to the user's email address. "
            "The response does not reveal whether the email is registered."
        ),
        request=ForgotPasswordSerializer,
        responses={
            200: inline_serializer(
                name="ForgotPasswordResponse",
                fields={"detail": drf_serializers.CharField()},
            ),
        },
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get("email", "")

        user = User.objects.filter(email__iexact=email).first()
        if user:
            membership = (
                user.organization_memberships.filter(
                    is_active=True,
                    organization__is_active=True,
                )
                .select_related("organization")
                .first()
            )
            _send_password_reset_link(
                user.email,
                organization=getattr(membership, "organization", None),
            )

        return Response(
            {
                "detail": (
                    "If an account with that email exists, a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/
    Accepts a signed token from the password reset link and sets a new password.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Reset password",
        description=(
            "Verify a password reset link token, set a new password, and obtain access and refresh tokens."
        ),
        request=inline_serializer(
            name="ResetPasswordRequest",
            fields={
                "token": drf_serializers.CharField(help_text="Signed token from password reset email"),
                "password": drf_serializers.CharField(write_only=True, help_text="New password"),
            },
        ),
        responses={
            200: inline_serializer(
                name="ResetPasswordResponse",
                fields={
                    "access": drf_serializers.CharField(),
                    "refresh": drf_serializers.CharField(),
                    "user": UserSerializer(),
                },
            ),
            400: OpenApiResponse(description="Invalid or expired token."),
        },
    )
    def post(self, request):
        from .serializers import ResetPasswordSerializer
        
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = getattr(serializer, "validated_data", {})
        token = str(validated_data.get("token", ""))
        password = str(validated_data.get("password", ""))

        _, user, result = _validate_invite_token(token)
        if isinstance(result, Response):
            # If the token was not a valid invite token, _validate_invite_token
            # will still accept a signed password reset token if the user exists.
            return result

        db_token = result
        if not user:
            return Response(
                {"detail": MSG_USER_NOT_FOUND},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active and user.effective_status not in [User.STATUS_PENDING, User.STATUS_REINVITED]:
            return Response(
                {"detail": MSG_ACCOUNT_INACTIVE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Activate pending invite users when they reset their password via an
        # invite link so the same frontend flow can support both invite and
        # password reset tokens.
        if user.effective_status in [User.STATUS_PENDING, User.STATUS_REINVITED]:
            user.is_active = True
            user.status = User.STATUS_ACTIVE

        # Set the new password in the database
        user.set_password(password)
        user.save()

        if db_token:
            db_token.is_used = True
            db_token.is_revoked = True
            db_token.save(update_fields=["is_used", "is_revoked"])

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # Embed organization info
        all_memberships = _get_user_org_memberships(user)
        org_memberships = _get_active_org_memberships(user)

        # Policy: If you are part of the organizational structure (have memberships),
        # you must have at least one active membership in an active organization to login.
        if not user.is_superuser and all_memberships.exists() and not org_memberships.exists():
            return Response(
                {"detail": MSG_ORG_INACTIVE},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Embed org_id, org_name, and role in the token
        org_data = _build_orgs_payload(org_memberships, include_name=True)

        refresh["org_id"] = org_data[0]["org_id"] if org_data else None
        refresh["org_name"] = org_data[0]["org_name"] if org_data else None
        refresh["role"] = org_data[0]["role"] if org_data else None
        refresh["logo"] = org_data[0]["logo"] if org_data else None

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "organizations": org_data,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Allows an authenticated user to change their password by providing current_password, new_password, and confirm_password.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Authentication"],
        summary="Change password",
        description="Change password for the currently authenticated user.",
        request=ChangePasswordSerializer,
        responses={
            200: inline_serializer(
                name="ChangePasswordResponse",
                fields={
                    "detail": drf_serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description="Validation error (e.g. incorrect current password, passwords do not match)."),
            401: OpenApiResponse(description="Unauthorized."),
        },
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data["new_password"]
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])

        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


# ── Logout view — blacklists the refresh token ────────────────────────────────


class LogoutView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Authentication"],
        summary="Logout",
        description=(
            "Blacklists the provided **refresh** token, effectively logging the user out. "
            "The access token will still be valid until it expires (60 min), so clients "
            "should discard it locally."
        ),
        request=inline_serializer(
            name="LogoutRequest",
            fields={"refresh": drf_serializers.CharField()},
        ),
        responses={
            205: inline_serializer(
                name="LogoutResponse",
                fields={"detail": drf_serializers.CharField()},
            ),
            400: OpenApiResponse(description="Missing or invalid refresh token."),
        },
    )
    @action(detail=False, methods=["post"])
    def logout(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {"detail": "Refresh token is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_205_RESET_CONTENT,
            )
        except Exception:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ── User ViewSet ──────────────────────────────────────────────────────────────


class UserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Profile and user management viewset for authenticated users.
    Exposes /users/me/ as well as /users/{id}/ for retrieve (GET), update (PUT/PATCH),
    and /users/ for list (GET).
    """
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = UserUpdateSerializer(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance, context={"request": request}).data)

    @extend_schema(
        tags=["Users"],
        summary="My profile (GET) / Update my profile (PATCH)",
        description=(
            "**GET** — Returns the profile of the currently authenticated user.\n\n"
            "**PATCH** — Partially updates the profile of the currently authenticated user."
        ),
        responses={200: UserSerializer},
    )
    @action(
        detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated]
    )
    def me(self, request):
        """Retrieve or update the currently authenticated user's own profile."""
        if request.method == "GET":
            serializer = UserSerializer(request.user, context={"request": request})
            return Response(serializer.data)

        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class AcceptInviteView(APIView):
    """
    POST /api/auth/accept-invite/
    Expects a signed token from the invite link and a new password. Sets the password and returns JWT tokens.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Accept Invite",
        description="Verify an invite link token, set the user's password, and obtain access and refresh tokens.",
        request=AcceptInviteSerializer,
        responses={
            200: inline_serializer(
                name="AcceptInviteResponse",
                fields={
                    "access": drf_serializers.CharField(),
                    "refresh": drf_serializers.CharField(),
                    "user": UserSerializer(),
                },
            ),
            400: OpenApiResponse(
                description="Invalid or expired token, or invalid password."
            ),
        },
    )
    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = getattr(serializer, "validated_data", {})
        token = str(validated_data.get("token", ""))
        password = str(validated_data.get("password", ""))

        _, user, result = _validate_invite_token(token)
        if isinstance(result, Response):
            return result
        db_token = result

        if not user:
            return Response(
                {"detail": MSG_USER_NOT_FOUND}, status=status.HTTP_400_BAD_REQUEST
            )

        # Set the new password
        user.set_password(password)
        user.is_active = True
        user.status = User.STATUS_ACTIVE
        user.save()

        if db_token:
            db_token.is_used = True
            db_token.is_revoked = True
            db_token.save(update_fields=['is_used', 'is_revoked'])

        refresh = RefreshToken.for_user(user)

        # Embed organization info
        all_memberships = _get_user_org_memberships(user)
        org_memberships = _get_active_org_memberships(user)

        # Policy: If you are part of the organizational structure (have memberships),
        # you must have at least one active membership in an active organization to login.
        if not user.is_superuser and all_memberships.exists() and not org_memberships.exists():
            return Response(
                {"detail": MSG_ORG_INACTIVE},
                status=status.HTTP_403_FORBIDDEN,
            )

        orgs_data = [_build_org_data(member) for member in org_memberships]
        refresh["organizations"] = orgs_data

        # Update last login
        from django.contrib.auth.models import update_last_login

        update_last_login(None,user)

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


# ── Reinvite ──────────────────────────────────────────────────────────────────


class ReinviteView(APIView):
    """
    POST /api/users/{identifier}/reinvite/
    Resend the invitation email to a user who has not yet accepted their invite.
    'identifier' can be a User UUID or Email.
    - Invalidates any previous active invite tokens.
    - Generates a fresh token with a new 7-day expiry.
    - Updates reinvite_count and last_invited_at on the user.
    - Rate-limited to max 1 reinvite per 24 hours per user.
    - Accessible by SuperAdmin and OrgAdmin.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Users"],
        summary="Reinvite user",
        description=(
            "Resend an invitation email to a user who hasn't accepted yet. "
            "The {identifier} can be a User UUID or Email address. "
            "Invalidates any previous invite link and generates a fresh one. "
            "Rate-limited: max 1 reinvite per 24 hours per user."
        ),
        responses={
            200: inline_serializer(
                name="ReinviteResponse",
                fields={
                    "detail": drf_serializers.CharField(),
                    "reinvite_count": drf_serializers.IntegerField(),
                    "last_invited_at": drf_serializers.DateTimeField(),
                },
            ),
            400: OpenApiResponse(description="User has already accepted their invite or rate limit exceeded."),
            403: OpenApiResponse(description="You do not have permission to reinvite this user."),
            404: OpenApiResponse(description="User not found."),
        },
    )
    def post(self, request, identifier):
        from organizations.models import Organization, OrganizationMember
        import uuid
        import logging

        logger = logging.getLogger(__name__)

        # 1. Fetch the target user (by UUID or Email)
        target_user = None
        
        # Try UUID lookup
        try:
            val = uuid.UUID(identifier, version=4)
            target_user = User.objects.filter(id=val).first()
        except ValueError:
            # Not a UUID, try email lookup
            target_user = User.objects.filter(email=identifier).first()

        if not target_user:
            return Response(
                {"detail": "User not found with the provided identifier (UUID or Email)."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_user.is_deleted:
            return Response(
                {"detail": "Cannot reinvite a deleted user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Permission check: Requester must be superuser or org_admin/teacher in an org where target is a member
        target_memberships = OrganizationMember.objects.filter(
            user=target_user, is_active=True
        ).values_list('organization_id', flat=True)

        if request.user.is_superuser:
            target_mem = OrganizationMember.objects.filter(
                user=target_user, is_active=True
            ).select_related('organization').first()
            org = target_mem.organization if target_mem else Organization.objects.first()
        else:
            admin_membership = OrganizationMember.objects.filter(
                user=request.user,
                organization_id__in=target_memberships,
                role__name__in=['org_admin', 'teacher'],
                is_active=True,
            ).select_related('organization').first()

            if not admin_membership:
                return Response(
                    {"detail": "You do not have permission to reinvite this user."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            org = admin_membership.organization

        # 6. Send the reinvite (revokes old tokens, creates new one, sends email)
        # Increment reinvite count before sending invite
        target_user.reinvite_count += 1
        target_user.save(update_fields=['reinvite_count'])

        # Send the reinvite (revokes old tokens, creates new one, sends email)
        try:
            _send_invite_link(
                target_user.email,
                organization=org,
                created_by=request.user,
            )
        except Exception:
            logger.exception("Reinvite email delivery failed for %s", target_user.email)
        return Response(
            {
                "detail": f"Reinvite sent successfully to {target_user.email}.",
                "reinvite_count": target_user.reinvite_count,
                "last_invited_at": target_user.last_invited_at,
            },
            status=status.HTTP_200_OK,
        )



