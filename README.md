# LMS: Open-Source Learning Management System

[![Python Version](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/django-6.0-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/django--rest--framework-3.16-red.svg)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/react-19-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**A self-hosted, multi-tenant LMS for training institutes, colleges, and corporate L&D teams.**

The platform runs training programmes for many organisations from one installation. Each organisation onboards its trainers and students, groups learners into batches, builds structured courses with videos, documents, tasks, and quizzes, and tracks every learner's progress from a single dashboard. Students follow a guided learning roadmap and earn points as they go.

It comes in two editions:

- 🆓 **Community (free, open source):** this repository. It covers the core LMS: login, organisation admin, course builder, trainer and student portals, progress tracking, and gamification.
- 💎 **Enterprise (paid):** everything in Community, plus the Super Admin console, assessments and certificates, coding interviews, SSO, notifications, calendars, audit logs, and advanced reporting.

This repository holds both halves of the stack:

- The **backend REST API** (Python 3.13, Django 6, Django REST Framework) at the repository root.
- The **web frontend** (React 19, TypeScript, Vite) under [`frontend/`](frontend/).

> 📘 **Frontend documentation** lives in its own README at **[`frontend/README.md`](frontend/README.md)** (path: `lms-open-source/frontend/README.md`).
> It covers the frontend tech stack, setup and environment variables, the three roles, the full feature list, and the project structure.

---

## Contents

- [Editions at a glance](#editions-at-a-glance)
- [Roles & portals](#roles--portals)
- [Features](#features)
- [Roadmap](#roadmap)
- [Tech stack](#tech-stack)
- [Quickstart with Docker](#quickstart-with-docker-recommended)
- [Manual setup](#manual-setup-without-docker)
- [Running tests](#running-tests)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Editions at a glance

| Capability | 🆓 Community | 💎 Enterprise |
|---|:---:|:---:|
| Email & password login, invites, password reset | ✅ | ✅ |
| Multi-role accounts with role switching | ✅ | ✅ |
| Google & Microsoft sign-in | — | ✅ |
| Institute Admin portal (trainers, students, batches) | ✅ | ✅ |
| Bulk upload of trainers & students (CSV / Excel) | ✅ | ✅ |
| Course builder (chapters, resources, tasks, quizzes) | ✅ | ✅ |
| Prerequisites & sequential unlocking | ✅ | ✅ |
| Coding questions with AI test cases & starter code | — | ✅ |
| Course import/export, quiz bulk upload, drip release | — | ✅ |
| Trainer portal: dashboard, grading, learner progress | ✅ | ✅ |
| Student portal: dashboard, roadmap player, progress | ✅ | ✅ |
| Points & levels | ✅ | ✅ |
| Leaderboard & badges | — | ✅ |
| Assessments (MCQ, task, coding) & certificates | — | ✅ |
| Certificate template designer | — | ✅ |
| No-login coding interviews for candidates | — | ✅ |
| Super Admin console (all organisations & users) | — | ✅ |
| In-app notifications, calendars, reminders | — | ✅ |
| Audit logs, organisation branding & theme colours | — | ✅ |
| Branded email notifications | ✅ | ✅ |

---

## Roles & portals

| Role | Portal | Role in code | Edition |
|---|---|---|---|
| **Super Admin** | Platform-wide console for every organisation and user | Django superuser | 💎 Enterprise |
| **Institute Admin** | Runs one organisation: people, batches, courses, progress | `org_admin` | 🆓 Community |
| **Trainer** | Delivers assigned courses, grades work, tracks learners | `teacher` | 🆓 Community |
| **Student** | Follows course roadmaps, submits work, tracks progress | `student` | 🆓 Community |
| **External Candidate** | Takes a coding interview through a private link, no account needed | — | 💎 Enterprise |

One account can hold several roles, for example a Trainer who is also an Institute Admin, and switch between portals without signing out.

---

## Features

**Legend:** 🆓 Free (Community) · 💎 Paid (Enterprise) · 🟡 Partially built · 🚧 Planned, not yet built

### 1. Login, authentication & role selection

| Feature | What it does | Edition |
|---|---|---|
| Email & password login | Sign in with a registered email and password. Invalid credentials show a clear error. | 🆓 |
| Sign in with Google | One-click login with a linked Google account. | 💎 |
| Sign in with Microsoft | One-click login through the organisation's Microsoft / Azure account. | 💎 |
| Forgot password | Request a password-reset link by email. | 🆓 |
| Reset password | Set a new password through a time-limited, single-use link. | 🆓 |
| Accept invite (onboarding) | New users get an email invite (valid for 7 days) and set a password to activate their account. | 🆓 |
| Session & access protection | Every page requires sign-in and the right role. JWT access and refresh tokens. | 🆓 🟡 |
| Sign out | End the session from anywhere. The refresh token is revoked. | 🆓 |
| Multi-role selection at login | Users with 2+ roles choose which portal to enter. | 🆓 |
| Switch role mid-session | Jump between the Student and Trainer/Admin views without signing out. | 🆓 |

### 2. Super Admin portal 💎

| Feature | What it does |
|---|---|
| Platform KPI dashboard | Live totals for organisations, users, trainers, students, and batches. |
| Organisation listing | Search, sort, and paginate all tenants, with an inline active/inactive toggle. |
| Create / edit / delete organisation | Onboard a tenant (logo, code, industry, HQ, contacts). The nominated admin is invited automatically. |
| Manage organisation (act as admin) | Step into any organisation's Institute Admin console for setup or support. |
| Organisation detail: batches, staff, students | Manage any organisation's cohorts, trainers, admins, and learners. |
| Batch detail: student management | Search, edit, activate, or remove students inside a batch, or add them in bulk. |
| Organisation theme colours | Primary and accent brand colours used across the portal and emails. |
| Platform-wide user directory | Every user across all organisations, filterable by organisation and role. |
| Create user / user detail / delete user | Add, view, edit, or remove any user on the platform. |
| Bulk upload users 🟡 | Add many users from a spreadsheet with per-row error feedback. |
| Reinvite user | Resend an expired onboarding invite. |
| Platform audit trail 🟡 | Searchable history of significant actions, exportable to CSV (180 days). |
| Calendar oversight 🚧 | Trainer and room double-booking detection across organisations. |
| Login activity logs 🚧 | Sign-in attempts with time, IP, and success or failure. |

### 3. Institute Admin portal

| Feature | What it does | Edition |
|---|---|---|
| Organisation KPI dashboard | At-a-glance counts of users, trainers, students, batches, and courses. | 🆓 |
| Manage trainers | Add, edit, search, sort, and bulk-upload (CSV/XLSX) trainers. New trainers get an invite email. | 🆓 |
| Manage students | Enrol students individually or in bulk, and view them all or by batch. | 🆓 |
| Activate / deactivate / delete people | Control trainer and student account status. | 🆓 |
| Reinvite trainer / student | Resend an expired onboarding invite. | 🆓 |
| Batch listing | Search, sort, and paginate every cohort. | 🆓 |
| Create / edit batch | Name, start/end dates, assigned courses, and active toggle. | 🆓 |
| Activate / deactivate / delete batch | Manage a batch across its lifecycle. | 🆓 |
| Course progress tracker | Drill down from batches → courses → students → an individual learning roadmap. | 🆓 |
| Organisation-level batch with reporting manager | Organisation-wide cohorts (e.g. all employees) with a nominated manager. | 💎 |
| Assessment calendar | Month view of upcoming assessment deadlines. | 💎 |
| Reschedule request management 🚧 | Approve or reject session reschedule requests. | 💎 |
| Organisation audit log | Searchable, exportable history of actions in the organisation. | 💎 |

### 4. Course builder

| Feature | What it does | Edition |
|---|---|---|
| Course listing | Search, filter by status, and archive/unarchive or delete courses. | 🆓 |
| Create course | Name, status, description, thumbnail, and assigned trainers. | 🆓 |
| Chapters | Break a course into chapters (modules) with titles and descriptions. | 🆓 |
| Learning resources | Attach videos, documents, PDFs, or links, with focus areas and a quick outline. | 🆓 |
| Tasks | Assignments with allowed submission formats (link, text, PDF, screenshot, code, file). | 🆓 |
| Quizzes | Scored multiple-choice quizzes inside a chapter. | 🆓 |
| Prerequisites & sequential unlocking | Steps unlock in order. A step stays locked until its prerequisite is done. | 🆓 |
| Reorder curriculum 🟡 | Change the order of chapters and steps (one item at a time today). | 🆓 |
| Save / publish curriculum 🟡 | Publish through course status. Items save individually. | 🆓 |
| Edit / delete curriculum items 🟡 | Modify or remove chapters and steps. | 🆓 |
| Course levels 🚧 | Group chapters into levels (Beginner, Intermediate…). | 🆓 |
| Coding question sets | Programming problems in Python, JavaScript, Java, C/C++, C#, and SQL, with AI-generated test cases. | 💎 |
| AI starter code | Per-language starter code generated for each coding problem. | 💎 |
| SQL problems with AI-generated database | Auto-built practice schema and seed data, with answers graded against it. | 💎 |
| Course import / export (Excel) | Build a whole course from a spreadsheet, or export its structure. | 💎 |
| Quiz bulk upload | Import quiz questions from CSV/XLSX with a downloadable error report. | 💎 |
| Rich text & file-upload resources | Write lessons in place or upload files instead of linking. | 💎 |
| Must-pass quiz rules | Pass %, timer, and retake-or-continue behaviour on failure. | 💎 |
| Drip content release 🟡 | Unlock a step N days after the batch starts. | 💎 |

### 5. Assessments & certificates 💎

| Feature | What it does |
|---|---|
| Assessment hub | Create, assign, and review results in one workspace. |
| MCQ, task & coding assessments | Timed MCQs with pass % and retake limits, manually graded tasks, and coding problems. |
| Assign assessments 🟡 | Assign to individuals, a batch, or a role, with a review window and reviewer. |
| Results & resubmission | Per-assessment results, plus one extra attempt after a rejection. |
| Assessment start reminders 🟡 | Reminders 2 hours and 5 minutes before an assessment opens. |
| Course completion certificates | Auto-issued on completion, approved by staff, claimed and downloaded as PDF by learners. |
| Public certificate verification 🟡 | Anyone can verify a certificate by its code. |
| Certificate template studio 🟡 | Drag-and-drop designer with text, images, shapes, and layers. |
| Dynamic data tokens 🟡 | Placeholders such as `{{user_name}}` filled in when a certificate is issued. |
| Certificate branding images | Background, logo, and signature images for each organisation. |

### 6. Interview module (no-login candidate assessment) 💎

| Feature | What it does |
|---|---|
| Interview listing / create / delete | Set up coding-interview rounds linked to a coding assessment. |
| Bulk candidate upload | Add candidates from a spreadsheet template. |
| Secure candidate links | One unique, single-use link per candidate. No account needed. Revoke or resend any time. |
| Candidate landing & rules screen 🟡 | Shows what the candidate is about to take, and the ground rules. |
| Timed coding interview | Split-panel editor, run against sample tests, one graded submission per problem. |
| Integrity monitoring | Tab-switch monitoring. Links die once the interview is submitted. |
| Results & confirmation | Score, pass/fail, and per-question review for the admin, and a confirmation screen for the candidate. |

### 7. Trainer portal

| Feature | What it does | Edition |
|---|---|---|
| Trainer dashboard | Students, batches, courses, pending evaluations, average completion, and recent submissions. | 🆓 |
| Assigned courses | Every course the trainer delivers. | 🆓 |
| Curriculum builder (trainer view) | Build and refine the courses the trainer is assigned to. | 🆓 |
| Evaluate submissions | Queue of work to grade, filtered by status and searchable. | 🆓 |
| Review submission detail | Full view of a student's answers and uploaded work. | 🆓 |
| Approve / reject with score & feedback | Score 0–100 and written feedback. | 🆓 |
| Learner progress overview | Every assigned learner with completion %, search, sort, and Excel export. | 🆓 |
| My assessments (as a learner) 🚧 | Trainers take assigned assessments themselves. Needs the Assessments module. | 🆓 |
| Learner progress drill-down | One student's roadmap node by node, with inline task review. | 💎 |
| Send progress reminders | Email learners who are falling behind. | 💎 |
| Quiz performance report | Attempts, retakes, and best/latest score per learner. | 💎 |
| Session calendar | Upcoming assessment deadlines for the trainer's courses. | 💎 |
| Training performance reports 🟡 | Exportable metrics for the trainer's courses and batches. | 💎 |
| Announcements & discussion board 🚧 | Announcement feed and Q&A threads with learners. | 💎 |

### 8. Student portal

| Feature | What it does | Edition |
|---|---|---|
| Student dashboard | Live cards for enrolled courses, completion %, pending work, and more. | 🆓 |
| My courses | Grid of every enrolled course. | 🆓 |
| Course roadmap player | Step through videos, documents, tasks, and quizzes in order. | 🆓 |
| Batch-window course access | Courses open only while the student's batch is running. | 🆓 |
| Progress tracking | Overall completion ring and per-course progress bars. | 🆓 |
| Points & levels | 10 points per completed step. Novice (100), Intermediate (250), Expert (500). | 🆓 |
| Assessments list & results | Assigned assessments, scores, per-question review, and feedback. | 💎 |
| Take MCQ / task / coding assessments | Timed MCQs, task submissions, and a LeetCode-style coding editor with verdicts (AC/WA/TLE…). | 💎 |
| Assessment integrity monitoring | Tab-switch detection with auto-submit after repeated warnings. | 💎 |
| Certificates | View, claim, and download earned certificates. | 💎 |
| Leaderboard 🟡 | Top 10 learners by points. | 💎 |
| Badges 🟡 | Achievement badges. | 💎 |
| My schedule | Calendar of upcoming assessment deadlines. | 💎 |
| Trainer feedback & ask a question 🟡 | Read trainer feedback and ask questions. | 💎 |

### 9. Common features (all roles)

| Feature | What it does | Edition |
|---|---|---|
| Profile | View and update name, phone, and profile picture. | 🆓 |
| Branded email notifications | Invite, password-reset, batch, course, and review emails styled with the organisation's brand. | 🆓 |
| Search & navigation 🟡 | Role-specific navigation, with search on most lists. | 🆓 |
| Change password 🚧 | Change the password while signed in. | 🆓 |
| In-app notifications | Bell icon with unread count for assignments, grading, and announcements. | 💎 |
| Organisation branding | Organisation logo and name on the login screen and sidebar. | 💎 |
| Course deadline reminders | Email + in-app reminders 15, 7, and 2 days before the batch ends, and on the day. | 💎 |

---

## Roadmap

### Planned (Enterprise)

- **Master data management:** assessment types, skills, course categories, notification templates
- **Training cycle templates:** term dates, working days, holidays
- **System settings:** password policy, upload limits, email/SMS gateway, feature flags
- **Cross-organisation reports & activity feed**, with CSV/PDF export
- **Notification broadcast & maintenance mode**
- **Training structure:** departments, job roles, skills mapping
- **Institute reporting dashboard:** student performance and trainer activity
- **Organisation announcements**

### Proposed (edition not yet decided)

| Area | Ideas |
|---|---|
| AI | AI feedback drafts for trainers · chapter-scoped AI tutor chat · code plagiarism / similarity check |
| Learning content | SCORM / xAPI import · native video hosting with watch progress · discussion threads per chapter |
| Assessment depth | Advanced proctoring · question bank with tags & random pools · rubric grading · skill-wise score breakdown |
| Reporting & compliance | Mandatory training compliance tracking · data export, account deletion & retention (GDPR / DPDP) |
| Platform | Custom subdomains & white-label email · subscription plans & usage limits · public API keys & webhooks · SAML SSO / SCIM · mobile app / PWA with offline reading |
| Learner experience | Course catalogue with self-enrolment · learning paths across courses · notes & bookmarks · multi-language UI |

Want to help build one of these? See [Contributing](#contributing).

---

## Tech stack

| Area | Technology |
|---|---|
| Backend | Python 3.13, Django 6, Django REST Framework 3.16 |
| Auth | JWT via `djangorestframework-simplejwt` (rotating refresh tokens + blacklist) |
| Database | PostgreSQL (via `psycopg2-binary`) |
| Cache & queue | Redis, Celery, `django-celery-results` |
| Storage | Local filesystem or Amazon S3 (`django-storages`) |
| Email | Amazon SES, with a fallback to any Django mail backend |
| Spreadsheets | pandas, openpyxl, xlrd (bulk uploads & Excel exports) |
| API docs | OpenAPI 3 via `drf-spectacular` (Swagger UI + ReDoc) |
| Frontend | React 19, TypeScript, Vite, React Router |
| Tests | pytest, pytest-django, pytest-cov (backend) · Vitest (frontend) |

### Project structure

```
.
├── lms_core/            # Settings, root URLs, Celery app, email & storage utilities, soft-delete base model
├── accounts/            # Users (email login), JWT auth, invites, password reset, profile
├── rbac/                # Roles, role assignments, permission classes
├── organizations/       # Organisations, staff, batches, students, bulk upload, bootstrap command
├── curriculum/          # Courses, chapters, steps, resources, tasks, quizzes, submissions, progress
├── analytics/           # Admin / trainer / student dashboards and daily metrics
├── gamification/        # Points & levels
├── settings/            # Shared Amazon SES client
├── frontend/            # React 19 + TypeScript + Vite single-page app (docs: frontend/README.md)
├── Dockerfile           # Backend API image
├── docker-compose.yml   # Full local stack: Postgres, Redis, API, Celery worker, frontend
├── pyproject.toml       # Poetry dependencies + pytest/coverage config
├── requirements.txt     # pip dependencies (used by the Dockerfile)
├── LICENSE              # Apache License 2.0
└── NOTICE               # Copyright and attribution notices
```

Each backend app has its own `README.md` with deeper notes. The frontend is documented in [`frontend/README.md`](frontend/README.md).

---

## Quickstart with Docker (recommended)

Runs the whole stack — Postgres, Redis, the Django API, a Celery worker and the
Vite dev server — with one command. Nothing to install but Docker.

```bash
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

Create an admin user and the first organisation:

```bash
docker compose exec -e DJANGO_SUPERUSER_PASSWORD='SecurePassword123' backend \
  python manage.py createsuperuser --noinput \
  --email admin@acme.edu --first_name Acme --last_name Admin

docker compose exec backend python manage.py create_initial_organization \
  --name "Acme Academy" --slug "acme-academy" \
  --email "admin@acme.edu" --admin-email "admin@acme.edu" --batch-name "Batch 1"
```

Note the two-step order: `create_initial_organization` links an **existing**
user, it cannot create one.

### Ports

The backend is published on **8010** by default, because 8000 is commonly taken
by another local service. Postgres and Redis are deliberately *not* published,
so they cannot collide with ones you already run locally. Override any host port
via a `.env` file next to `docker-compose.yml`, or inline:

```bash
BACKEND_PORT=9000 FRONTEND_PORT=3000 docker compose up
```

`VITE_API_BASE_URL` follows `BACKEND_PORT` automatically.

### Common commands

```bash
docker compose logs -f backend     # tail a service's logs
docker compose exec backend bash   # shell into the API container
docker compose exec backend python manage.py migrate
docker compose down                # stop; add -v to also wipe the database
```

---

## Manual setup (without Docker)

### Prerequisites

- Python 3.13
- [Poetry](https://python-poetry.org/docs/) 2.x
- PostgreSQL
- Redis
- Node.js and npm (for the frontend)

### 1. Install

```bash
git clone <repository-url>
cd lms-open-source
poetry env use python3.13
poetry install
poetry run pip install Pillow   # required for image fields; not yet declared in pyproject.toml
```

Using pip instead: `python3.13 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`

### 2. Configure

```bash
cp .env.example .env
```

At minimum, set `SECRET_KEY`, the `DB_*` variables (or `DATABASE_URL`), `REDIS_URL`, and `CELERY_BROKER_URL`.

<details>
<summary><b>All environment variables</b></summary>

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
| `FRONTEND_URL` | Web app URL, used in emails, CORS, and CSRF | `http://localhost:5173` |
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

### 3. Set up the database and first organisation

```bash
poetry run python manage.py migrate
poetry run python manage.py createsuperuser          # log in with your email address
poetry run python manage.py create_initial_organization \
  --name "Acme Academy" \
  --admin-email admin@acme.edu                       # an existing user who becomes Institute Admin
```

Other options: `--slug`, `--email` (organisation contact), and `--batch-name` (default `"Batch 1"`).

### 4. Run the backend

```bash
redis-server                                          # or: docker run -d -p 6379:6379 redis
poetry run python manage.py runserver
poetry run celery -A lms_core worker -l info          # background tasks
```

| URL | What |
|---|---|
| http://localhost:8000/api/docs/ | Swagger UI: interactive API reference |
| http://localhost:8000/api/redoc/ | ReDoc |
| http://localhost:8000/api/schema/ | OpenAPI schema |
| http://localhost:8000/admin/ | Django admin |

To sign in to Swagger, call `POST /api/auth/login/`, then click **Authorize** and paste the access token.

<details>
<summary><b>API overview</b></summary>

All endpoints require `Authorization: Bearer <token>` except login, invite, and password-reset. Lists are paginated at 20 items per page.

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

</details>

### 5. Run the frontend

> Full frontend guide: **[`frontend/README.md`](frontend/README.md)**

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL to this backend, e.g. http://localhost:8000/api
npm run dev            # Vite dev server, default http://localhost:5173
```


---

## Running tests

Backend tests need a running PostgreSQL. Redis, S3, and Celery are stubbed automatically.

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

## Deployment

```bash
docker build -t lms-backend .
docker run -d -p 8000:8000 --env-file .env lms-backend
```

- The image starts Django's development server. For production, run `gunicorn lms_core.wsgi:application --bind 0.0.0.0:8000` (gunicorn is already installed) behind a TLS-terminating proxy.
- Set `DEBUG=False`, a strong `SECRET_KEY`, and explicit `ALLOWED_HOSTS`, `FRONTEND_URL`, and `CSRF_TRUSTED_ORIGINS`.
- Use `USE_S3=True` for uploads and SES credentials for email in production.
- Run a Celery worker next to the web process. Daily analytics (`analytics.tasks.calculate_daily_analytics`) needs to be scheduled by you. No beat schedule ships with the project.
- The frontend is a static Vite build (`npm run build` in `frontend/`) that you deploy separately.

For architecture details, multi-tenancy flowcharts and the full endpoint reference, see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).

---

## Contributing

Contributions are welcome, especially for the 🚧 Community items and the [roadmap](#roadmap). Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** and our [Code of Conduct](CODE_OF_CONDUCT.md) first. To report a security issue, see [SECURITY.md](SECURITY.md).

1. Fork the repo and create a feature branch.
2. Keep code in the app that owns the feature, and scope every query to the organisation.
3. Commit migrations together with model changes (`makemigrations --check` runs in the test suite).
4. Add tests under `<app>/tests/` (or next to the component in `frontend/`), and make sure `poetry run pytest` and `npm test` pass.
5. Open a pull request describing the change.

Follow PEP 8 and match the style of the surrounding code. For deeper architecture notes, see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) and each app's own `README.md`.

---

## License

Copyright 2026 Pace Wisdom Solutions Pvt. Ltd.

Licensed under the [Apache License, Version 2.0](LICENSE).
See [NOTICE](NOTICE) for attribution details.
