<div align="center">

<img src=".github/assets/hero-banner.svg" alt="LMS: the open-source, multi-tenant Learning Management System" width="100%" />

<br/>

[![CI](https://github.com/pacewisdomsolutions/LMS/actions/workflows/ci.yml/badge.svg)](https://github.com/pacewisdomsolutions/LMS/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-0A7BBB.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-2EA44F.svg)](CONTRIBUTING.md)

![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-6-092E20?logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.16-A30000?logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-mobile-02569B?logo=flutter&logoColor=white)

[**Quickstart**](#-quickstart) · [**Features**](#-features) · [**Architecture**](#-architecture) · [**API docs**](#-api) · [**Contributing**](#-contributing)

</div>

---

## ✨ Highlights

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>🏢 Multi-tenant by design</h4>
      One installation serves many organisations. Every query is scoped to the organisation, so trainers and learners only ever see their own data.
    </td>
    <td width="33%" valign="top">
      <h4>🧱 Structured course builder</h4>
      Courses are organised into levels, chapters and steps: videos, documents, tasks and quizzes, with prerequisites and sequential unlocking.
    </td>
    <td width="33%" valign="top">
      <h4>👥 Batches &amp; bulk onboarding</h4>
      Group learners into time-boxed batches. Invite trainers and students one by one or in bulk from CSV / Excel.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <h4>✅ Grading &amp; feedback</h4>
      Trainers review submissions in one queue, approve or reject with a score and written feedback, and export progress to Excel.
    </td>
    <td width="33%" valign="top">
      <h4>🗺️ Guided learner roadmap</h4>
      Students follow a step-by-step roadmap on the web or the mobile app, track completion and earn points and levels.
    </td>
    <td width="33%" valign="top">
      <h4>🔌 API-first</h4>
      A documented REST API (OpenAPI 3, Swagger UI and ReDoc) with JWT auth powers the web app, the mobile app and your own integrations.
    </td>
  </tr>
</table>

---

## 🔄 How it works

<p align="center">
  <img src=".github/assets/learner-journey.svg" alt="How a course runs: 1. Build the course, 2. Enrol students in batches, 3. Learn through the roadmap, 4. Grade submissions, 5. Track progress." width="100%" />
</p>

---

## 📦 Editions

This repository is the **Community edition**: free, open source and self-hosted. An **Enterprise edition** adds advanced modules on top.

| Capability | 🆓 Community | 💎 Enterprise |
|---|:---:|:---:|
| Email & password login, invites, password reset | ✅ | ✅ |
| Multi-role accounts with role switching | ✅ | ✅ |
| Institute Admin portal: trainers, students, batches | ✅ | ✅ |
| Bulk upload of trainers & students (CSV / Excel) | ✅ | ✅ |
| Course builder: levels, chapters, resources, tasks, quizzes | ✅ | ✅ |
| Prerequisites & sequential unlocking | ✅ | ✅ |
| Trainer portal: dashboard, grading, learner progress | ✅ | ✅ |
| Student portal & mobile app: dashboard, roadmap, progress | ✅ | ✅ |
| Points & levels | ✅ | ✅ |
| Branded email notifications | ✅ | ✅ |
| Google & Microsoft sign-in | — | ✅ |
| Coding questions with AI test cases & starter code | — | ✅ |
| Course import/export, quiz bulk upload, drip release | — | ✅ |
| Assessments (MCQ, task, coding) & certificates | — | ✅ |
| No-login coding interviews for candidates | — | ✅ |
| Super Admin console, audit logs, organisation branding | — | ✅ |
| Leaderboard, badges, in-app notifications, calendars | — | ✅ |

---

## 📐 Architecture

<p align="center">
  <img src=".github/assets/architecture.svg" alt="Architecture: the web app and Flutter mobile app call the Django REST API over HTTPS with JWT; the API uses PostgreSQL, local disk or S3 for uploads, and Redis as a task queue; a Celery worker sends email through Amazon SES or SMTP." width="100%" />
</p>

| Component | Location | Stack |
|---|---|---|
| Backend REST API | repository root | Python 3.13, Django 6, Django REST Framework, Celery |
| Web frontend | [`frontend/`](frontend/) | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Student mobile app | [`student_mobile_app/`](student_mobile_app/) | Flutter (Android & iOS), learner-only: courses, lessons, tasks, quizzes and progress against the same API |

---

## 👤 Roles & portals

| Role | What they do | Role in code | Edition |
|---|---|---|---|
| **Institute Admin** | Runs one organisation: people, batches, courses, progress | `org_admin` | 🆓 |
| **Trainer** | Delivers assigned courses, grades work, tracks learners | `teacher` | 🆓 |
| **Student** | Follows course roadmaps, submits work, tracks progress | `student` | 🆓 |
| **Super Admin** | Platform-wide console for every organisation and user | Django superuser | 💎 |
| **External Candidate** | Takes a coding interview through a private link, no account needed | — | 💎 |

One account can hold several roles (for example a Trainer who is also an Institute Admin) and switch between portals without signing out.

---

## 🚀 Quickstart

The fastest way to run everything (Postgres, Redis, the Django API, a Celery worker and the web app) is Docker. Nothing else to install.

```bash
git clone https://github.com/pacewisdomsolutions/LMS.git
cd LMS
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API docs (Swagger) | http://localhost:8010/api/docs/ |
| ReDoc | http://localhost:8010/api/redoc/ |
| Django admin | http://localhost:8010/admin/ |

Source is bind-mounted, so edits on your machine reload in the containers — no
rebuild unless dependencies change. Database migrations run automatically on
every backend start.

Create the initial organization, default batch, and Org Admin (with superuser/admin panel access) in a single command:

```bash
docker compose exec backend python manage.py create_initial_organization \
  --name "Acme Academy" --slug "acme-academy" \
  --admin-email "admin@acme.edu" --password "SecurePassword123" \
  --batch-name "Batch 1"
```

*(This automatically creates the user as an Org Admin and grants superuser/staff privileges so they can access both the LMS and `/admin/`).*

<details>
<summary><b>Ports and common Docker commands</b></summary>

<br/>

The backend is published on **8010** because 8000 is often taken by another local service. Postgres and Redis are deliberately not published, so they never clash with ones you already run. Override host ports in a `.env` file next to `docker-compose.yml`, or inline:

```bash
BACKEND_PORT=9000 FRONTEND_PORT=3000 docker compose up
```

`VITE_API_BASE_URL` follows `BACKEND_PORT` automatically.

```bash
docker compose logs -f backend     # tail a service's logs
docker compose exec backend bash   # shell into the API container
docker compose exec backend python manage.py migrate
docker compose down                # stop; add -v to also wipe the database
```

</details>

---

## 💻 Manual setup

<details>
<summary><b>Run the backend and frontend without Docker</b></summary>

<br/>

**Prerequisites:** Python 3.13, [Poetry](https://python-poetry.org/docs/) 2.x, PostgreSQL, Redis, Node.js and npm.

**1. Install**

```bash
git clone https://github.com/pacewisdomsolutions/LMS.git
cd LMS
poetry env use python3.13
poetry install
```

Prefer pip? `python3.13 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`

**2. Configure**

```bash
cp .env.example .env
```

At minimum set `SECRET_KEY`, the `DB_*` variables (or `DATABASE_URL`), `REDIS_URL` and `CELERY_BROKER_URL`. See [environment variables](#-configuration) for the full list.

**3. Create the database and first organisation**

```bash
poetry run python manage.py migrate
poetry run python manage.py createsuperuser          # you log in with your email address
poetry run python manage.py create_initial_organization \
  --name "Acme Academy" \
  --admin-email admin@acme.edu                       # an existing user who becomes Institute Admin
```

Optional flags: `--slug`, `--email` (organisation contact) and `--batch-name` (default `"Batch 1"`).

**4. Run the backend**

```bash
redis-server                                          # or: docker run -d -p 6379:6379 redis
poetry run python manage.py runserver
poetry run celery -A lms_core worker -l info          # background tasks
```

**5. Run the web app**

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL, e.g. http://localhost:8000/api
npm run dev            # http://localhost:5173
```

The full frontend guide lives in [`frontend/README.md`](frontend/README.md). The mobile app guide, covering Flutter setup, its one environment variable, architecture, and building and releasing, lives in [`student_mobile_app/README.md`](student_mobile_app/README.md).

</details>

---

## 🔧 Configuration

All settings are read from environment variables (or a `.env` file). Copy [`.env.example`](.env.example) to get started.

<details>
<summary><b>All environment variables</b></summary>

<br/>

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Django secret key | `change-this-to-a-secure-secret-key` |
| `DEBUG` | Debug mode (default `False`) | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts (default `*`) | `localhost,127.0.0.1` |
| `DATABASE_URL` | Full DB URL; overrides the `DB_*` vars | `postgres://postgres:postgres@localhost:5432/lms_db` |
| `DB_NAME` | Postgres database name | `lms_db` |
| `DB_USER` | Postgres user | `postgres` |
| `DB_PASSWORD` | Postgres password | `postgres` |
| `DB_HOST` | Postgres host (**required** unless `DATABASE_URL` is set) | `localhost` |
| `DB_PORT` | Postgres port | `5432` |
| `REDIS_URL` | Redis URL for the cache (**required**) | `redis://127.0.0.1:6379/1` |
| `CELERY_BROKER_URL` | Celery broker (**required**) | `redis://127.0.0.1:6379/0` |
| `CELERY_RESULT_BACKEND` | Celery result backend | `django-db` |
| `CELERY_TASK_ALWAYS_EAGER` | Run tasks inline, with no worker | `False` |
| `FRONTEND_URL` | Web app URL, used in emails, CORS and CSRF | `http://localhost:5173` |
| `BACKEND_PUBLIC_URL` | Public URL of this API | `http://localhost:8000` |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated trusted origins | `https://app.example.com` |
| `CORS_ALLOWED_ORIGINS` | Extra comma-separated CORS origins | `https://app.example.com` |
| `CORS_ALLOW_ALL_ORIGINS` | Allow any origin | `False` |
| `DEFAULT_FROM_EMAIL` | Sender address | `no-reply@example.com` |
| `AWS_SES_ACCESS_KEY_ID` | SES key. If empty, email goes through `EMAIL_BACKEND` | *(empty)* |
| `AWS_SES_SECRET_ACCESS_KEY` | SES secret | *(empty)* |
| `AWS_SES_REGION` | SES region | `ap-south-1` |
| `EMAIL_BACKEND` | Fallback mail backend (default: console) | `django.core.mail.backends.console.EmailBackend` |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` | SMTP server settings | `smtp.gmail.com` / `587` / `True` |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | SMTP credentials | `user@example.com` / `app-password` |
| `USE_S3` | Store uploads on S3 instead of `./media/` | `False` |
| `AWS_S3_ACCESS_KEY_ID` / `AWS_S3_SECRET_ACCESS_KEY` | S3 credentials | `AKIA...` / `...` |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket | `lms-media` |
| `AWS_S3_REGION_NAME` | S3 region | `ap-south-1` |
| `USE_AWS_SECRETS` | Load settings from AWS Secrets Manager | `False` |
| `AWS_SECRETS_NAME` | Secret name | `lms/prod` |
| `AWS_REGION_NAME` | Secrets Manager region | `ap-south-1` |
| `TEST_IP` | *(tests only)* IP used by the test suite | `127.0.0.1` |

</details>

### 3. Set up the database, organisation, and admin
```bash
poetry run python manage.py migrate
poetry run python manage.py create_initial_organization \
  --name "Acme Academy" \
  --slug "acme-academy" \
  --admin-email "admin@acme.edu" \
  --password "AdminPassword123" \
  --batch-name "Batch 1"
```
*(This creates the organization, initial batch, and creates the Org Admin with Django admin panel (`/admin/`) superuser/staff access automatically).*

### 4. Run the backend

```bash
redis-server                                          # or: docker run -d -p 6379:6379 redis
poetry run python manage.py runserver
poetry run celery -A lms_core worker -l info          # background tasks
```

| URL | What |
|---|---|
| `/api/docs/` | Swagger UI: interactive API reference |
| `/api/redoc/` | ReDoc |
| `/api/schema/` | OpenAPI 3 schema |
| `/admin/` | Django admin |

To try authenticated endpoints in Swagger, call `POST /api/auth/login/`, click **Authorize** and paste the access token.

<details>
<summary><b>Endpoint overview</b></summary>

<br/>

All endpoints require `Authorization: Bearer <token>` except login, invite and password reset. Lists are paginated at 20 items per page.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login/` · `refresh/` · `logout/` · `forgot-password/` · `reset-password/` · `accept-invite/` · `GET verify-invite/` |
| Profile | `GET/PATCH /api/users/me/` · `POST /api/users/<id>/reinvite/` |
| Roles | `/api/roles/` · `/api/user-roles/` · `update-role/` · `delete-role/` |
| Organisation | `/api/organizations/<org>/` · `members/` · `staff/` · `batches/` · `batches/<b>/students/` · `students/` · `…/bulk-upload-file/` · `…/download-template/` |
| Dashboards | `…/<org>/analytics/overview/` · `…/batches/<b>/analytics/` · `…/students/me/dashboard/` · `…/teacher-dashboard/<teacher>/` · `…/batches-overview/` |
| Course builder | `/api/organizations/<org>/courses/` → `modules/` → `nodes/` · `nodes/<n>/content/` |
| Learning | `…/courses/<c>/roadmap/` · `…/my-courses/` · `…/my-progress/` · `POST /api/nodes/<n>/complete/` |
| Submissions | `/api/nodes/<n>/submit/` · `task/submit/` · `task/result/` · `task/all-submissions/` · `/api/quizzes/<q>/submit/` |
| Grading & progress | `…/pending-evaluations/` · `…/submissions/tasks/<s>/review/` · `…/learner-progress/` · `…/learner-progress/export/` · `…/node-submission-details/` |

For architecture details, multi-tenancy flowcharts and the full endpoint reference, see [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md).

</details>

---

## 🧰 Tech stack

| Area | Technology |
|---|---|
| Backend | Python 3.13, Django 6, Django REST Framework 3.16 |
| Auth | JWT via `djangorestframework-simplejwt` (rotating refresh tokens with blacklist) |
| Database | PostgreSQL |
| Cache & jobs | Redis, Celery, `django-celery-results` |
| Storage | Local filesystem or Amazon S3 (`django-storages`) |
| Email | Amazon SES, with a fallback to any Django mail backend |
| Spreadsheets | pandas, openpyxl, xlrd (bulk uploads and Excel exports) |
| API docs | OpenAPI 3 via `drf-spectacular` (Swagger UI and ReDoc) |
| Web frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS 4 |
| Mobile | Flutter (Dart 3.13), MVVM + Provider, go_router, Dio, Hive |
| Tests | pytest, pytest-django, pytest-cov (backend) · Vitest (frontend) · `flutter test` (mobile) |

<details>
<summary><b>Project structure</b></summary>

<br/>

```text
.
├── lms_core/            # Settings, root URLs, Celery app, email & storage utilities, soft-delete base model
├── accounts/            # Users (email login), JWT auth, invites, password reset, profile
├── rbac/                # Roles, role assignments, permission classes
├── organizations/       # Organisations, staff, batches, students, bulk upload, bootstrap command
├── curriculum/          # Courses, levels, chapters, steps, resources, tasks, quizzes, submissions, progress
├── analytics/           # Admin / trainer / student dashboards and daily metrics
├── gamification/        # Points & levels
├── settings/            # Shared Amazon SES client
├── frontend/            # React 19 + TypeScript + Vite web app (docs: frontend/README.md)
├── student_mobile_app/  # Flutter learner app for Android and iOS (docs: student_mobile_app/README.md)
├── Dockerfile           # Backend API image
├── docker-compose.yml   # Full local stack: Postgres, Redis, API, Celery worker, frontend
├── pyproject.toml       # Poetry dependencies + pytest / coverage config
└── requirements.txt     # pip dependencies (used by the Dockerfile)
```

Each backend app has its own `README.md` with deeper notes. The frontend is documented in [`frontend/README.md`](frontend/README.md) and the mobile app in [`student_mobile_app/README.md`](student_mobile_app/README.md).

</details>

---

## 🧪 Testing

Backend tests need a running PostgreSQL; Redis, S3 and Celery are stubbed automatically.

```bash
poetry run pytest -p no:cacheprovider --no-cov -q    # fast run
poetry run pytest                                    # with coverage (terminal + coverage.xml)
poetry run pytest curriculum/ --no-cov -q            # a single app
```

Frontend tests and lint:

```bash
cd frontend
npm test          # Vitest
npm run lint      # ESLint
```

---

## 🚢 Deployment

```bash
docker build -t lms-backend .
docker run -d -p 8000:8000 --env-file .env lms-backend
```

> [!IMPORTANT]
> The image starts Django's development server. In production, run `gunicorn lms_core.wsgi:application --bind 0.0.0.0:8000` (already installed) behind a TLS-terminating proxy.

- Set `DEBUG=False`, a strong `SECRET_KEY`, and explicit `ALLOWED_HOSTS`, `FRONTEND_URL` and `CSRF_TRUSTED_ORIGINS`.
- Use `USE_S3=True` for uploads and SES credentials for email.
- Run a Celery worker next to the web process. Schedule `analytics.tasks.calculate_daily_analytics` yourself; no beat schedule ships with the project.
- The web frontend is a static Vite build (`npm run build` in `frontend/`) that you deploy separately.

---

## 🧭 Roadmap

<details>
<summary><b>Planned and proposed work</b></summary>

<br/>

**Planned (Enterprise)**

- **Master data management:** assessment types, skills, course categories, notification templates
- **Training cycle templates:** term dates, working days, holidays
- **System settings:** password policy, upload limits, email/SMS gateway, feature flags
- **Cross-organisation reports & activity feed**, with CSV/PDF export
- **Notification broadcast & maintenance mode**
- **Training structure:** departments, job roles, skills mapping
- **Institute reporting dashboard:** student performance and trainer activity
- **Organisation announcements**

**Proposed (edition not yet decided)**

| Area | Ideas |
|---|---|
| AI | AI feedback drafts for trainers · chapter-scoped AI tutor chat · code plagiarism / similarity check |
| Learning content | SCORM / xAPI import · native video hosting with watch progress · discussion threads per chapter |
| Assessment depth | Advanced proctoring · question bank with tags & random pools · rubric grading · skill-wise score breakdown |
| Reporting & compliance | Mandatory training compliance tracking · data export, account deletion & retention (GDPR / DPDP) |
| Platform | Custom subdomains & white-label email · subscription plans & usage limits · public API keys & webhooks · SAML SSO / SCIM · PWA with offline reading |
| Learner experience | Course catalogue with self-enrolment · learning paths across courses · notes & bookmarks · multi-language UI |

</details>

---

## 🤝 Contributing

Contributions are welcome, especially for the 🚧 Community items and the [roadmap](#-roadmap). Please read [**CONTRIBUTING.md**](CONTRIBUTING.md) and our [**Code of Conduct**](CODE_OF_CONDUCT.md) first.

1. Fork the repository and create a feature branch.
2. Keep code in the app that owns the feature, and scope every query to the organisation.
3. Commit migrations together with model changes (`makemigrations --check` runs in the test suite).
4. Add tests under `<app>/tests/` (or next to the component in `frontend/`) and make sure `poetry run pytest` and `npm test` pass.
5. Open a pull request describing the change.

Need help? See [**SUPPORT.md**](SUPPORT.md). Found a security issue? Please report it privately as described in [**SECURITY.md**](SECURITY.md).

---

## 📄 License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution details.

<div align="center">

<br/>

<img src="frontend/public/just-logo.png" alt="" width="36" />

**Built and maintained by [Pace Wisdom Solutions](https://www.pacewisdom.com/)**

Copyright © 2026 Pace Wisdom Solutions Pvt. Ltd.

<sub>If this project helps you, consider giving it a ⭐ on GitHub.</sub>

</div>
