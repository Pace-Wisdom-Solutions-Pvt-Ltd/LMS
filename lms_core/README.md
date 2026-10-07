# LMS Core Module

## 1. Overview
`lms_core` is the root Django configuration and shared utility module for the LMS platform. It houses the global settings, URL routing, Celery worker initialization, branded email utilities, and cloud storage handlers.

## 2. Configuration (`lms_core/settings.py`)
- **Environment Support**: Loads configuration from environment variables or `.env` using `django-environ`.
- **Database Configuration**: Configured for PostgreSQL with connection pooling.
- **REST Framework & OpenAPI**:
  - Default authentication: `JWTAuthentication`.
  - Default permissions: `IsAuthenticated`.
  - Schema generator: `drf-spectacular`.
- **Celery & Redis**:
  - Redis broker URL and result backend.
  - Task results stored using `django-celery-results`.
- **AWS SES Email Client**:
  - SES SMTP / API client configured via `settings/ses_client.py`.

## 3. Shared Utilities
- **`lms_core/email_utils.py`**:
  - `render_branded_email(title, intro, cta_label, cta_url, recipient_email, recipient_name, organization, footer_note)`: Renders clean, modern, responsive HTML email templates with tenant branding (logo and organization name).
  - `send_html_email_via_ses(subject, text_body, html_body, recipient_list, organization)`: Handles reliable email dispatch via AWS SES.
  - `build_frontend_url(path)`: Formats absolute links to the frontend client application.
- **`lms_core/utils_storage.py`**:
  - Manages secure S3 / MinIO uploads and generates presigned URLs for media files.
- **`lms_core/models.py`**:
  - `SoftDeleteMixin`: Abstract base model providing soft delete functionality (`is_deleted` flag and custom manager filtering).

## 4. Root URL Routing (`lms_core/urls.py`)
Mounts the central API router:
- `/api/auth/` → `accounts.urls`
- `/api/users/` → `accounts.urls` (`/me/`)
- `/api/roles/` & `/api/user-roles/` → `rbac.urls`
- `/api/organizations/` → `organizations.urls`
- `/api/organizations/{org_id}/courses/` → `curriculum.urls`
- `/api/organizations/{org_id}/analytics/` → `analytics.urls`
- `/api/schema/` → Raw OpenAPI JSON/YAML schema
- `/api/docs/` → Interactive Swagger UI
- `/api/redoc/` → ReDoc UI

## 5. Celery Initialization (`lms_core/celery.py`)
- Standard Celery application loading task modules across all installed apps using `autodiscover_tasks()`.

## 6. Business Logic & Invariants
- Neutral, clean email templates that do not contain hardcoded commercial branding or commercial styling.
- All primary routing is strictly versioned under `/api/`.

## 7. Dependencies
- Django, djangorestframework, drf-spectacular.
- celery, redis, django-redis.
- boto3, django-storages.

## 8. Testing & Verification
Verified as part of the project-wide test suite:
```bash
poetry run pytest -p no:cacheprovider --no-cov -q
```
