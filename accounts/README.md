# Accounts Module

## 1. Overview
The `accounts` module manages user identity and authentication for the LMS platform. It replaces Django's default User model with a custom, email-centric user model with UUID primary keys.

## 2. Models
- **`User` (`accounts.models.User`)**:
  - `id`: UUID primary key to prevent enumeration attacks.
  - `email`: Unique email address used as the primary login credential (`USERNAME_FIELD = 'email'`).
  - `first_name`, `last_name`, `phone_number`: User profile information.
  - `status`: Lifecycle status (`pending`, `active`, `reinvited`, `expired`, `inactive`, `deleted`).
  - `is_active`, `is_superuser`, `date_joined`, `last_login`: Standard Django auth fields.

## 3. Authentication & Tokens
- Uses `rest_framework_simplejwt` for stateless token authentication.
- Access token lifetime: 60 minutes.
- Refresh token lifetime: 7 days with automatic rotation and blacklisting on use.
- Token payload embeds organization memberships and primary roles for instant client-side UI rendering.

## 4. API Endpoints
- `POST /api/auth/login/`: Authenticate using email and password; returns access token, refresh token, user details, and organization memberships.
- `POST /api/auth/refresh/`: Exchange a valid refresh token for a new access/refresh token pair.
- `POST /api/auth/logout/`: Invalidate/blacklist a refresh token.
- `POST /api/auth/forgot-password/`: Request a password reset link sent to the user's email.
- `POST /api/auth/reset-password/`: Set a new password using a signed token.
- `POST /api/auth/accept-invite/`: Accept an organization invitation token and set initial password.
- `GET /api/auth/verify-invite/`: Validate invitation token signature before presenting password creation form.
- `GET /api/users/me/`: Retrieve profile of currently authenticated user.
- `PATCH /api/users/me/`: Update profile fields (`first_name`, `last_name`, `phone_number`, `profile_picture`) of current user.

## 5. Managers & Utilities
- **`CustomUserManager` (`accounts.managers.CustomUserManager`)**:
  - `create_user(email, password=None, **extra_fields)`: Normalizes email and creates active user.
  - `create_superuser(email, password, **extra_fields)`: Auto-assigns `is_staff=True`, `is_superuser=True`.

## 6. Business Logic & Invariants
- Identity is global across all organizations. A single user account can belong to multiple organizations with different roles.
- Platform-wide user collection endpoints are intentionally omitted in favor of tenant-scoped member management in the `organizations` module.

## 7. Dependencies
- Django core auth framework (`AbstractUser`, `BaseUserManager`).
- `djangorestframework-simplejwt`.
- `lms_core.email_utils` for invitation and password reset emails.

## 8. Testing & Verification
All tests are located in `accounts/tests/`:
```bash
poetry run pytest accounts/ -p no:cacheprovider --no-cov -q
```
Covers user creation, token rotation, invite acceptance, password resets, and `/me` self-service endpoints.
