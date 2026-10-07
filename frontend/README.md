# LMS — Open-Source Edition: Frontend

A React 19 + TypeScript single-page application for the LMS, backed by the Django REST API in the parent repository (see [`../README.md`](../README.md)). This is the open-source edition: it serves three user roles — **Institute Admin**, **Trainer**, and **Student** — each with their own portal, navigation, and feature set.

Several features that exist in the full commercial product (a Super Admin portal, a standalone Assessment & Certification hub, a no-login interview module, coding-question exercises, Google/Microsoft sign-in, notifications, and a few others) have been deliberately removed from this edition. Where that trimming left visible seams — a disabled sidebar link, a route that now just redirects home — it's called out below rather than hidden.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI rendering and component model, fully typed |
| Vite | Dev server, HMR, and production bundler |
| Tailwind CSS 4 | Utility-first styling |
| React Router v7 | Client-side routing and nested layout shells |
| `@dnd-kit` | Drag-and-drop reordering in the course builder |
| `lucide-react` | Icon library |
| Vitest + Testing Library | Unit/component testing |
| ESLint + typescript-eslint | Linting |

`package.json` also still lists `sql.js`, `prismjs`, `react-simple-code-editor`, `html2canvas`, and `jspdf` — these backed the coding-question editor and the certificate designer/renderer that shipped in the full product. The components that used them (`CodeEditor`, `CodeBlock`, `CodeViewer`, `LanguageSelect`, `TestCaseResults`, `DurationField` under `src/components/common/`, plus the certificate canvas/renderer, now removed) are no longer imported anywhere; they and their dependencies are dead weight left over from the trim, not something in active use.

---

## Getting Started

```bash
npm install
cp .env.example .env    # fill in the values below
npm run dev
```

```bash
npm run build           # tsc -b && vite build — must pass with zero errors before any PR
npm run lint             # ESLint
npm run test              # Vitest (single run)
npm run test:coverage     # Vitest with coverage report
npm run preview            # Preview a production build locally
```

> **Important:** The build must pass after every change — `npm run build` runs a full TypeScript check before bundling.

### Environment Variables

All variables must be prefixed with `VITE_` — Vite strips anything else from the browser bundle.

```env
VITE_API_BASE_URL=   # Backend API base, e.g. http://localhost:8000/api
VITE_CSRFTOKEN=       # Optional — static CSRF token override for non-browser/dev setups
```

---

## The Three Roles

A single account can hold more than one role — a role-picker modal appears on login if so, and the user can switch portals mid-session from the account menu without re-authenticating.

| Role | What they do | Base route | Default home |
|---|---|---|---|
| **Institute Admin** | Runs a single training organisation — people, batches, courses | `/org-admin` | `/org-admin/home` |
| **Trainer** | Delivers assigned courses, grades submissions, tracks learner progress | `/trainer` | `/trainer/home` |
| **Student** | Consumes courses and tracks progress | `/student` | `/student/home` |

**Role priority** when a user holds several roles (highest wins as the pre-selected default): `institute_admin` → `trainer` → `student`.

---

## Feature List (Login → Logout)

### 🔐 Authentication & Session
- Email + password login, with client-side validation and toast error handling
- Forgot password → email reset link → set new password
- New-user onboarding via emailed invite link (set password)
- Route protection — every page checks the session and the user's role before rendering
- Multi-role picker on login + in-session role switching from the header menu
- Sign out (clears session, redirects to Login)

### 🏫 Institute Admin
- **Dashboard** — organisation KPI cards and analytics (students per batch, staff by role, courses per batch)
- **Manage Users** — tabbed Trainers / Students screen: onboard, edit, activate/deactivate, delete, bulk-upload (CSV/XLSX), and reinvite
- **Batches** — create, edit, activate/deactivate, delete; assign courses to a batch; drill into a **Batch Detail** view to manage the students inside that specific batch
- **Courses & Content (Course Builder)** — course listing with search, status filter, archive/unarchive, and delete; build a course as Levels → Chapters → content items (Learning Resources — link/PDF/video URL, Tasks, Quizzes), with drag-and-drop reordering and a local-draft-then-publish save flow
- **Course Progress & Review** — drill down from Batches → Courses → Students → full roadmap, including per-task review status
- **Profile** & **Change Password**

### 👩‍🏫 Trainer
- **Dashboard** — teaching-load KPI cards (students, batches, courses, pending evaluations, recent submissions)
- **Assigned Courses** — view courses published and assigned by the Institute Admin, and continue building their curriculum (the same builder used by Institute Admin)
- **Learner Progress** — table of assigned learners with completion %, sortable and exportable to Excel, with a quick **Evaluate Submissions** side-drawer (filterable by Pending/Completed) to grade a learner's outstanding task/quiz submissions without leaving the page
- **Profile** & **Change Password**

### 🎓 Student
- **Dashboard** — live KPI cards (enrolled courses, completion %, etc.)
- **My Courses** — enrolled course grid → interactive module-by-module **Course Roadmap** (video, documents, tasks, quizzes)
- **Progress** — overall completion ring and per-course bars; a course-completion certificate can still be claimed/downloaded from the course roadmap once every step is finished

### 🔁 Common (All Roles)
- **Profile** — view/edit name, email, phone, profile picture
- **Change Password**
- Collapsible, role-specific sidebar navigation with a portal-appropriate search bar
- Organisation branding (logo + name) on the login screen

### ⚠️ Navigation Notes
A handful of sidebar entries are visible but intentionally disabled (`disabled: true` in the relevant `*Sidebar.tsx`), and their routes just redirect to the portal's home page — they're stubs from the full product, not built-but-hidden pages:
- Institute Admin → Training Structure, Reporting, Audit Logs (`/org-admin/academic-setup`, `/org-admin/reporting`, `/org-admin/audit-logs`)
- Trainer → Reports, Engage (`/trainer/reports`, `/trainer/engage`)
- Student → Interaction & Support (`/student/engage`)

Separately, `/trainer/interns` (a "Students" list scoped to the trainer) still exists and is routed, but is no longer linked from the Trainer sidebar — treat it as legacy rather than a current feature. A few other files (`AcademicSetup.tsx`, `AdminPanel.tsx`, `CourseAllocation.tsx` under `institute-admin/`) are similarly present but unrouted.

### 🧭 What's Not Here
Removed for this open-source edition (see the parent repo's `PROJECT_OVERVIEW.md` for backend scope):
- **Super Admin portal** — platform-wide organisation/user management, cross-org monitoring
- **Assessment & Certification hub** — standalone MCQ/Task/Coding assessments, assignment, results, the certificate template designer, and the "My Certificates" list on the Student Progress page (a course-completion certificate can still be claimed/downloaded from the course roadmap — that flow is separate and still works)
- **Interview Module** — no-login candidate coding interviews
- **Coding-question exercises** — both authoring (course builder) and taking them (student roadmap); the backend model behind this was dropped
- **Google / Microsoft sign-in** — email + password only
- **Course Content Import/Export (Excel)**, **Quiz Bulk Upload**, and **Must-Pass Quiz Rules** (passing % + "must pass to continue") in the course builder
- **Direct file upload for learning resources** — resources are URL-only now (link, PDF, video); the "Document" resource type and its file picker are gone
- **"Send Reminder Emails"** on the Trainer's Learner Progress page
- **Notifications** (bell/panel), **in-app Engage/discussion**, **audit logs**, **manager-evaluation questionnaires** (a reporting-manager check-in feature with no backend support in this edition)

---

## Project Structure

```
src/
├── App.tsx                    # Route definitions for all three portals
├── config.ts                  # API endpoint URLs and env var reads
├── main.tsx                   # Entry point
│
├── features/
│   ├── auth/                  # Login, ForgotPassword, ResetPassword, SetPassword, ProtectedRoute
│   ├── student/                # dashboard/ courses/ progress/ layout/
│   ├── instructor/             # dashboard/ courses/ students/ progress/ modals/ layout/
│   ├── institute-admin/        # dashboard/ people/ (trainers, students) batches/ course-builder/ courses/
│   │                           #   content/ settings/ layout/
│   └── shared/                 # Profile, ChangePassword — used across all roles
│
├── layouts/                   # StudentLayout, InstructorLayout, InstituteAdminLayout
│
├── components/
│   ├── ui/                    # Reusable primitives (Modal, Toast, DataTable, BackButton, charts…)
│   ├── layout/                # Header, InstructorHeader, StudentHeader, Sidebar
│   ├── course/                 # Course-related shared components
│   └── common/                 # Now-unused coding-editor leftovers (CodeBlock, CodeEditor, CodeViewer, LanguageSelect, TestCaseResults, DurationField)
│
├── lib/
│   ├── api/                   # HTTP client + API functions (auth, organizations, users, tenant)
│   ├── auth.ts                 # localStorage helpers + integrity hash
│   ├── constants.ts             # ROLE_PATHS and app-wide constants
│   ├── auditLog.ts              # Client-side login-attempt log (localStorage) — unrelated to the removed backend audit-logs feature
│   └── ...                     # format, validation, toast, settings
│
├── hooks/                     # useAuth, useSortable, useRoleSwitcher, useConfirmDialog
├── context/                    # TenantContext — present for future multi-tenant branding, currently a no-op provider
└── types/                     # Shared TypeScript interfaces
```

There is no `docs/` folder in this edition — this README is the single source of truth for the frontend.
