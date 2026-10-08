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
| Student mobile app | [`student_mobile_app/`](student_mobile_app/) | Flutter (Android & iOS) |

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

Then create an admin user and the first organisation:

```bash
docker compose exec -e DJANGO_SUPERUSER_PASSWORD='SecurePassword123' backend \
  python manage.py createsuperuser --noinput \
  --email admin@acme.edu --first_name Acme --last_name Admin

docker compose exec backend python manage.py create_initial_organization \
  --name "Acme Academy" --slug "acme-academy" \
  --email "admin@acme.edu" --admin-email "admin@acme.edu" --batch-name "Batch 1"
```

> [!NOTE]
> Run the two commands in this order: `create_initial_organization` links an **existing** user as Institute Admin; it does not create one.

| Service | URL |
|---|---|
| 🖥️ Web app | http://localhost:5173 |
| 📘 API docs (Swagger) | http://localhost:8010/api/docs/ |
| 📕 ReDoc | http://localhost:8010/api/redoc/ |
| 🛠️ Django admin | http://localhost:8010/admin/ |

Source code is bind-mounted, so your edits reload inside the containers without a rebuild. Migrations run automatically on every backend start.

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

The full frontend guide lives in [`frontend/README.md`](frontend/README.md), and the mobile app guide in [`student_mobile_app/README.md`](student_mobile_app/README.md).

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

---

## 🧩 Features

**Legend:** 🆓 Community · 💎 Enterprise · 🟡 Partially built · 🚧 Planned

<details>
<summary><b>🔐 Login, authentication &amp; roles</b></summary>

<br/>

| Feature | What it does | Edition |
|---|---|---|
| Email & password login | Sign in with a registered email and password, with clear errors for invalid credentials. | 🆓 |
| Forgot / reset password | Request a reset link by email and set a new password through a time-limited, single-use link. | 🆓 |
| Accept invite | New users get an email invite (valid for 7 days) and set a password to activate their account. | 🆓 |
| Change password | Change the password while signed in. | 🆓 |
| Session & access protection 🟡 | Every page requires sign-in and the right role. JWT access and refresh tokens. | 🆓 |
| Sign out | End the session from anywhere; the refresh token is revoked. | 🆓 |
| Multi-role selection & switching | Users with several roles pick a portal at login and switch without signing out. | 🆓 |
| Sign in with Google / Microsoft | One-click login with a linked Google or Microsoft (Azure) account. | 💎 |

</details>

<details>
<summary><b>🏢 Institute Admin portal</b></summary>

<br/>

| Feature | What it does | Edition |
|---|---|---|
| Organisation dashboard | At-a-glance counts of users, trainers, students, batches and courses. | 🆓 |
| Manage trainers | Add, edit, search, sort and bulk-upload (CSV / XLSX) trainers. New trainers get an invite email. | 🆓 |
| Manage students | Enrol students individually or in bulk, and view them all or by batch. | 🆓 |
| Account status | Activate, deactivate, delete or reinvite trainers and students. | 🆓 |
| Batches | Create, edit, search and archive cohorts with start/end dates and assigned courses. | 🆓 |
| Course progress tracker | Drill down from batches → courses → students → an individual learning roadmap. | 🆓 |
| Organisation-level batch with reporting manager | Organisation-wide cohorts (e.g. all employees) with a nominated manager. | 💎 |
| Assessment calendar | Month view of upcoming assessment deadlines. | 💎 |
| Organisation audit log | Searchable, exportable history of actions in the organisation. | 💎 |
| Reschedule request management 🚧 | Approve or reject session reschedule requests. | 💎 |

</details>

<details>
<summary><b>🧱 Course builder</b></summary>

<br/>

| Feature | What it does | Edition |
|---|---|---|
| Course listing | Search, filter by status, and archive/unarchive or delete courses. | 🆓 |
| Create course | Name, status, description, thumbnail and assigned trainers. | 🆓 |
| Levels & chapters | Organise a course into levels, and each level into chapters that group related steps. | 🆓 |
| Learning resources | Attach videos, documents, PDFs or links, with focus areas and a quick outline. | 🆓 |
| Tasks | Assignments with allowed submission formats (link, text, PDF, screenshot, code, file). | 🆓 |
| Quizzes | Scored multiple-choice quizzes, with an optional timer. | 🆓 |
| Prerequisites & sequential unlocking | Steps unlock in order; a step stays locked until its prerequisite is done. | 🆓 |
| Reorder, edit & delete curriculum 🟡 | Change the order of chapters and steps, and modify or remove them. | 🆓 |
| Coding question sets | Problems in Python, JavaScript, Java, C/C++, C# and SQL, with AI-generated test cases and starter code. | 💎 |
| Course import / export (Excel) | Build a whole course from a spreadsheet, or export its structure. | 💎 |
| Quiz bulk upload | Import quiz questions from CSV / XLSX with a downloadable error report. | 💎 |
| Must-pass quiz rules | Pass %, timer and retake-or-continue behaviour on failure. | 💎 |
| Drip content release 🟡 | Unlock a step N days after the batch starts. | 💎 |

</details>

<details>
<summary><b>🧑‍🏫 Trainer portal</b></summary>

<br/>

| Feature | What it does | Edition |
|---|---|---|
| Trainer dashboard | Students, batches, courses, pending evaluations, average completion and recent submissions. | 🆓 |
| Assigned courses & curriculum | Every course the trainer delivers, with the course builder for those courses. | 🆓 |
| Evaluate submissions | A searchable queue of work to grade, filtered by status. | 🆓 |
| Approve / reject with score & feedback | Score from 0 to 100 plus written feedback on each submission. | 🆓 |
| Learner progress overview | Every assigned learner with completion %, search, sort and Excel export. | 🆓 |
| Learner progress drill-down | One student's roadmap node by node, with inline task review. | 💎 |
| Progress reminders & quiz reports | Email learners who fall behind; attempts and best/latest score per learner. | 💎 |
| Session calendar & performance reports 🟡 | Upcoming deadlines and exportable metrics for the trainer's courses. | 💎 |
| Announcements & discussion board 🚧 | Announcement feed and Q&A threads with learners. | 💎 |

</details>

<details>
<summary><b>🎓 Student portal &amp; mobile app</b></summary>

<br/>

| Feature | What it does | Edition |
|---|---|---|
| Student dashboard | Live cards for enrolled courses, completion %, pending work and more. | 🆓 |
| Course roadmap player | Step through videos, documents, tasks and quizzes in order. | 🆓 |
| Batch-window access | Courses open only while the student's batch is running. | 🆓 |
| Progress tracking | Overall completion ring and per-course progress bars. | 🆓 |
| Points & levels | 10 points per completed step: Novice (100), Intermediate (250), Expert (500). | 🆓 |
| Mobile app | Learner app for Android and iOS with per-organisation theming. | 🆓 |
| Assessments & certificates | Timed MCQs, task submissions, a coding editor, and downloadable certificates. | 💎 |
| Leaderboard & badges 🟡 | Top learners by points and achievement badges. | 💎 |
| My schedule | Calendar of upcoming assessment deadlines. | 💎 |

</details>

<details>
<summary><b>💎 Enterprise-only modules</b></summary>

<br/>

| Module | What it includes |
|---|---|
| Super Admin console | Platform KPIs, every organisation and user, act-as-admin support, platform audit trail. |
| Assessments & certificates | MCQ, task and coding assessments, results and resubmission, auto-issued certificates with public verification and a template designer. |
| Interview module | No-login coding interviews with single-use candidate links, timed editor, tab-switch monitoring and results. |
| Engagement | In-app notifications, course deadline reminders, organisation branding and theme colours. |

</details>

---

## 📘 API

The backend exposes a documented REST API. With the server running:

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
| Mobile | Flutter (Android & iOS) |
| Tests | pytest, pytest-django, pytest-cov · Vitest · Flutter test |

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
├── frontend/            # React 19 + TypeScript + Vite web app
├── student_mobile_app/  # Flutter learner app for Android & iOS
├── Dockerfile           # Backend API image
├── docker-compose.yml   # Full local stack: Postgres, Redis, API, Celery worker, frontend
├── pyproject.toml       # Poetry dependencies + pytest / coverage config
└── requirements.txt     # pip dependencies (used by the Dockerfile)
```

Each backend app has its own `README.md` with deeper notes.

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
| Platform | Custom subdomains & white-label email · subscription plans & usage limits · public API keys & webhooks · SAML SSO / SCIM |
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
