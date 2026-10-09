# LMS — Open-Source Edition: Comprehensive Project & Setup Guide

Welcome to the **Learning Management System (LMS) — Open-Source Edition**! This document covers the Django backend at the root of this repository — what this platform is, what features and apps are included, how the system works, and step-by-step instructions on how to clone, configure, and run it. For the React frontend under [`frontend/`](frontend/), see [`frontend/README.md`](frontend/README.md).

---

## 1. What is this LMS Project?

This project is an **enterprise-ready, multi-tenant Learning Management System (LMS)** with a backend built on **Python 3.13**, **Django 6**, and **Django REST Framework (DRF)**, and a **React 19 + TypeScript** frontend.

It is designed for universities, schools, coding bootcamps, and enterprise training teams who need a clean, scalable platform to:
- Organize students into cohorts (**Batches**).
- Build structured, hierarchical courses (**Courses → Modules → Lessons/Nodes**).
- Deliver learning materials (**Videos, Documents, External Links**).
- Issue practical assignments (**Tasks**) and grade student submissions with feedback.
- Deliver auto-evaluated multiple-choice quizzes (**Quizzes**) with timers.
- Track learner progress and export multi-sheet styled Excel progress reports.
- Motivate students through experience points and levels (**Gamification**).

---

## 2. What is Inside this LMS? (App by App Breakdown)

The repository is modularized into specialized Django applications:

```
new-lms-open/
├── accounts/        # Identity, JWT authentication, and self-service profile (/me)
├── rbac/            # Global roles, permissions, and superuser auto-assignment
├── organizations/   # Multi-tenancy, staff management, batches, and student rosters
├── curriculum/      # Courses, modules, lesson nodes, tasks, quizzes, and grading
├── analytics/       # Organization-level KPI dashboards and course completion metrics
├── gamification/    # Learner XP, level progression, and gamification profiles
├── lms_core/        # Project settings, root routing, branded email dispatch, storage
└── frontend/        # React 19 + TypeScript + Vite SPA — see frontend/README.md
```

### 2.1 Accounts (`accounts/`)
- **Custom User Model**: Primary key uses UUIDs to prevent sequential ID guessing attacks (`/api/users/1/`).
- **Email-Based Auth**: Users authenticate using their email address (`USERNAME_FIELD = 'email'`) and a secure password.
- **JWT Authentication**: Powered by `rest_framework_simplejwt` with 60-minute access tokens and 7-day refresh tokens with rotation and blacklisting.
- **Self-Service Profile**: Authenticated users can retrieve and update their own name, phone number, and avatar via `GET /api/users/me/` and `PATCH /api/users/me/`.
- **Invitation & Password Reset**: Secure tokenized flows for user onboarding and password recovery.

### 2.2 RBAC (`rbac/`)
- **Global Roles**: Defines standard system roles: `superadmin`, `org_admin`, `teacher`, and `student`.
- **Cached Permission Classes**: Evaluates permissions (`IsSuperAdmin`, `IsAdmin`, `IsTeacher`, `IsStudent`) with request-level caching to prevent N+1 database queries.
- **Superuser Signal**: Whenever a superuser is created (`is_superuser=True`), it automatically assigns the `superadmin` role.

### 2.3 Organizations & Multi-Tenancy (`organizations/`)
- **Logical Tenant Isolation**: Every organization (`Organization`) acts as a separate tenant boundary with its own courses, staff, batches, and learners.
- **Tenant Staff**: Invite instructors (`teacher`) and administrators (`org_admin`) to specific organizations.
- **Batches / Cohorts**: Group students by semester, batch, or intake period (`start_date` to `end_date`).
- **Student Roster Management**:
  - Bulk enroll students directly via JSON API.
  - Upload Excel (`.xlsx`) or CSV roster spreadsheets using `POST /api/organizations/{org_id}/batches/{batch_id}/students/bulk-upload-file/`.
  - Built-in endpoint to download sample Excel roster templates.

### 2.4 Curriculum & Content Delivery (`curriculum/`)
- **Hierarchical Course Builder**:
  - **Course**: Title, description, status (`Draft`, `Published`, `Archived`), and assigned instructors.
  - **Module**: Sequential chapters within a course.
  - **Node**: Individual lesson units within a module.
- **Content Types**:
  - **Learning Material**: Video URLs, Document/PDF URLs, or external links.
  - **Task**: Practical assignments with instructions and maximum scores.
  - **Quiz**: Multiple-choice assessments with single/multiple correct options and countdown timers.
- **Grading & Evaluation**: Instructors can review submitted student tasks, assign scores (0–100), and write feedback.
- **Progress Tracking & Styled Excel Export**:
  - Automatically calculates node completion and course percentage for each student.
  - Export comprehensive multi-sheet Excel reports (`GET /api/organizations/{org_id}/learner-progress/export/`) featuring summary progress, quiz scores, and detailed student activity tabs.

### 2.5 Analytics (`analytics/`)
- High-level tenant KPI dashboards via `GET /api/organizations/{org_id}/analytics/progress-dashboard/`.
- Aggregates enrolled student counts, active learners, course completion rates, and average quiz/task scores with course and batch filters.

### 2.6 Gamification (`gamification/`)
- Tracks learner experience points (XP) in `GamificationProfile`.
- Automatically initializes profiles for newly registered users.
- Automatically calculates and updates the learner's level as they complete lessons and quizzes.

---

## 3. How the System Works (Architecture & Data Flow)

### 3.1 Logical Multi-Tenancy Model
```
┌─────────────────────────────────────────────────────────┐
│                      Global User                        │
│                 (accounts.models.User)                  │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│  OrganizationMember   │         │  OrganizationMember   │
│   (Acme Academy)      │         │   (Tech Institute)    │
│   Role: 'teacher'     │         │   Role: 'student'     │
└───────────┬───────────┘         └───────────┬───────────┘
            │                                 │
     ┌──────┴──────┐                   ┌──────┴──────┐
     ▼             ▼                   ▼             ▼
  Batches       Courses             Batches       Courses
```
- **Global Identity**: A user has a single login credential across the whole platform.
- **Tenant Bridge (`OrganizationMember`)**: Links the global User to an Organization and gives them tenant-specific permissions (`org_admin`, `teacher`, `student`).
- **Strict Data Scoping**: All courses, student submissions, and analytics queries strictly filter on `organization_id` to ensure tenants can never view each other's data.

### 3.2 Course Progress Flow
1. Admin/Teacher creates a **Course** and adds **Modules** and **Nodes**.
2. Teacher attaches content to the Node (e.g. a Video URL, Task, or Quiz).
3. The course is assigned to a **Batch**.
4. Enrolled students access the course within their batch date window.
5. As students view materials or complete quizzes/tasks, `StudentNodeProgress` records their progress.
6. The system calculates real-time course completion percentages and displays them on teacher dashboards and Excel exports.

---

## 4. How to Clone and Run the Project

Follow these steps to set up and run the project locally on any machine.

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd new-lms-open
```

### Step 2: Prerequisites
Make sure you have the following installed:
- **Python 3.13+** (`python3 --version`)
- **Poetry** (`poetry --version` — install via `pip install poetry` or [official installer](https://python-poetry.org/docs/#installation))
- **PostgreSQL 15+** running locally or in Docker
- **Redis** (optional, required if using Celery background workers)

> **Tip (macOS / Multiple Python Versions):**
> If your system default Python is 3.12 or 3.14, tell Poetry to use Python 3.13 explicitly:
> ```bash
> poetry env use python3.13
> ```

### Step 3: Install Dependencies
Install all Python dependencies defined in `pyproject.toml`:
```bash
poetry install
```

### Step 4: Configure Environment Variables (`.env`)
Copy the example environment file:
```bash
cp .env.example .env
```
Edit `.env` with your PostgreSQL database credentials:
```env
SECRET_KEY=your-super-secret-django-key-here
DEBUG=True
ALLOWED_HOSTS=*

# Database configuration
DB_NAME=lms_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Client URLs
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:8000
```

*(Make sure the database `lms_db` exists in your PostgreSQL server: `createdb lms_db` or via psql).*

### Step 5: Run Database Migrations
Apply all database migrations to set up the tables:
```bash
poetry run python manage.py migrate
```

### Step 6: Create Initial Organization & Org Admin (Single Command)
Use the unified bootstrap command to initialize your organization, default batch, and the Org Admin account with Django admin panel (`/admin/`) access in one command:
```bash
poetry run python manage.py create_initial_organization \
  --name "Acme Academy" \
  --slug "acme-academy" \
  --email "admin@acme.edu" \
  --admin-email "admin@acme.edu" \
  --password "AdminPassword123" \
  --batch-name "Batch 1"
```
*(This automatically creates the user as an Org Admin and grants superuser/staff privileges so they can log into both the LMS and the Django Admin panel at `/admin/`).*

### Step 7: Start the Development Server
Launch the Django development server:
```bash
poetry run python manage.py runserver 8000
```

Your API is now live at `http://localhost:8000/`!

### Step 8: Run the Frontend
The frontend is a separate app under [`frontend/`](frontend/):
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL to http://localhost:8000/api
npm run dev
```
See [`frontend/README.md`](frontend/README.md) for architecture, testing, and conventions.

### Step 10: Run the Mobile App
The learner app is a separate Flutter project under [`student_mobile_app/`](student_mobile_app/):
```bash
cd student_mobile_app
cp .env.example .env   # set API_BASE_URL to http://localhost:8000  (no /api, no trailing slash)
flutter pub get
cd ios && pod install && cd ..   # iOS only, and only after `pub get`
flutter run
```
**An emulator or a real device has to be connected before `flutter run`** — an Android
emulator, an iOS simulator, or a phone plugged in with developer mode on. Check what
Flutter can see with `flutter devices`, and pick one with `flutter run -d <id>` when more
than one is attached.

`cp .env.example .env` is not optional: the file is bundled as an asset, so the build fails
without it. `API_BASE_URL` is the server root and the app appends `/api` itself — unlike the
frontend's `VITE_API_BASE_URL`, which includes it.

An emulator cannot reach your machine's `localhost`: use `10.0.2.2` on the Android emulator,
and your machine's LAN IP on a real device.

See [`student_mobile_app/README.md`](student_mobile_app/README.md) for architecture,
testing, and release builds.

---

## 5. Interactive API Documentation

Once the server is running, explore and test all API endpoints directly in your browser:

- **Swagger UI (Interactive API Tester):** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **ReDoc (API Reference Manual):** [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **OpenAPI 3.0 Schema (JSON/YAML):** [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

---

## 6. How to Run Tests

This project includes a comprehensive suite of **377 automated unit and integration tests** covering all modules.

To execute the entire test suite:
```bash
poetry run pytest -p no:cacheprovider --no-cov -q
```

To run tests for a specific module:
```bash
# Test accounts (auth, tokens, user profile)
poetry run pytest accounts/ -p no:cacheprovider --no-cov -q

# Test organizations (multi-tenancy, batches, roster upload)
poetry run pytest organizations/ -p no:cacheprovider --no-cov -q

# Test curriculum (courses, modules, nodes, quizzes, progress export)
poetry run pytest curriculum/ -p no:cacheprovider --no-cov -q

# Test rbac (roles and permissions)
poetry run pytest rbac/ -p no:cacheprovider --no-cov -q

# Test analytics (dashboard KPIs)
poetry run pytest analytics/ -p no:cacheprovider --no-cov -q
```

To generate a full test coverage report:
```bash
poetry run pytest
```

---

## 7. Running with Docker

You can containerize and run the backend using Docker:

### Build Docker Image
```bash
docker build -t lms-open-backend .
```

### Run Docker Container
```bash
docker run -d -p 8000:8000 \
  -e DB_NAME=lms_db \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e SECRET_KEY=production-secret-key \
  lms-open-backend \
  poetry run python manage.py runserver 0.0.0.0:8000
```

---

## 8. Complete API Reference

All endpoints are prefixed with `/api/`. Protected endpoints require: `Authorization: Bearer <access_token>`.

### 8.1 Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/login/` | Authenticate with email & password, return JWT tokens | Public |
| `POST` | `/api/auth/refresh/` | Exchange refresh token for a new access token | Public |
| `POST` | `/api/auth/logout/` | Invalidate and blacklist refresh token | Authenticated |
| `POST` | `/api/auth/forgot-password/` | Send password reset email token | Public |
| `POST` | `/api/auth/reset-password/` | Set new password using reset token | Public |
| `GET` | `/api/auth/verify-invite/` | Validate organization invitation token | Public |
| `POST` | `/api/auth/accept-invite/` | Accept organization invitation and set password | Public |

### 8.2 Current User Profile
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/users/me/` | Retrieve current authenticated user's profile and memberships | Authenticated |
| `PATCH` | `/api/users/me/` | Update current user's profile (name, phone, avatar) | Authenticated |

### 8.3 Organizations & Staff Management
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/organizations/{id}/` | Retrieve organization details | Org Member |
| `PATCH` | `/api/organizations/{id}/` | Update organization settings | Org Admin |
| `GET` | `/api/organizations/{org_id}/staff/` | List all teachers and admins in organization | Org Admin |
| `POST` | `/api/organizations/{org_id}/staff/` | Invite a teacher or admin to organization | Org Admin |
| `DELETE` | `/api/organizations/{org_id}/staff/{id}/` | Remove a staff member from organization | Org Admin |

### 8.4 Batches & Student Rosters
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/organizations/{org_id}/batches/` | List all batches/cohorts in organization | Org Staff |
| `POST` | `/api/organizations/{org_id}/batches/` | Create a new batch | Org Staff |
| `GET` | `/api/organizations/{org_id}/batches/{batch_id}/` | Retrieve batch details | Org Staff |
| `PATCH` | `/api/organizations/{org_id}/batches/{batch_id}/` | Update batch details | Org Staff |
| `DELETE` | `/api/organizations/{org_id}/batches/{batch_id}/` | Delete batch | Org Staff |
| `GET` | `/api/organizations/{org_id}/batches/{batch_id}/students/` | List enrolled students in batch | Org Staff |
| `POST` | `/api/organizations/{org_id}/batches/{batch_id}/students/` | Bulk enroll students into batch via JSON | Org Staff |
| `POST` | `/api/organizations/{org_id}/batches/{batch_id}/students/bulk-upload-file/` | Upload student roster via Excel/CSV file | Org Staff |
| `GET` | `/api/organizations/{org_id}/batches/{batch_id}/students/download-template/` | Download sample Excel roster template | Org Staff |
| `DELETE` | `/api/organizations/{org_id}/batches/{batch_id}/students/{pk}/` | Remove student from batch | Org Staff |

### 8.5 Curriculum & Courses
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/organizations/{org_id}/courses/` | List all courses in organization | Org Member |
| `POST` | `/api/organizations/{org_id}/courses/` | Create a new course | Org Staff |
| `GET` | `/api/organizations/{org_id}/courses/{id}/` | Retrieve course details with module outline | Org Member |
| `PATCH` | `/api/organizations/{org_id}/courses/{id}/` | Update course details | Org Staff |
| `DELETE` | `/api/organizations/{org_id}/courses/{id}/` | Soft delete course | Org Staff |
| `POST` | `/api/organizations/{org_id}/courses/{course_id}/modules/` | Create course module | Org Staff |
| `POST` | `/api/organizations/{org_id}/courses/{course_id}/modules/{module_id}/nodes/` | Create lesson node | Org Staff |
| `PUT` | `/api/organizations/{org_id}/nodes/{node_id}/content/` | Update lesson content (Video, Task, Quiz) | Org Staff |

### 8.6 Task Evaluation & Grading
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/organizations/{org_id}/pending-evaluations/` | List unreviewed student task submissions | Org Teacher |
| `PATCH` | `/api/organizations/{org_id}/submissions/{submission_id}/grade/` | Grade student submission with score (0-100) & feedback | Org Teacher |

### 8.7 Learner Progress & Excel Export
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/organizations/{org_id}/learner-progress/` | View learner course completion & progress | Org Staff |
| `GET` | `/api/organizations/{org_id}/learner-progress/export/` | Download styled multi-tab Excel progress report | Org Staff |

### 8.8 Analytics Dashboards
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/organizations/{org_id}/analytics/progress-dashboard/` | High-level course completion and enrollment KPIs | Org Staff |

---

## 9. License

Copyright 2026 Pace Wisdom Solutions Pvt. Ltd.

This project is licensed under the **[Apache License, Version 2.0](LICENSE)**. See [NOTICE](NOTICE) for attribution details.
