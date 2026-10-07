# Curriculum Module

## 1. Overview
The `curriculum` module is the core learning content and course delivery engine. It powers hierarchical course building (Course → Module → Node), learning materials, assignments/tasks, quizzes, submission grading, and learner progress tracking.

## 2. Models
- **`Course` (`curriculum.models.Course`)**:
  - Root learning unit scoped to an `Organization`.
  - Fields: `title`, `description`, `status` (`Draft`, `Published`, `Archived`), `thumbnail`, `teachers` (ManyToMany to `OrganizationMember`).
- **`Module` (`curriculum.models.Module`)**:
  - Logical section or chapter of a course.
  - Fields: `course`, `title`, `sequence_order`.
- **`Node` (`curriculum.models.Node`)**:
  - An individual lesson within a module.
  - Fields: `module`, `title`, `sequence_order`.
- **`LearningMaterial` (`curriculum.models.LearningMaterial`)**:
  - Read-only learning resource attached to a Node.
  - Fields: `node`, `content_type` (`Video`, `Document`, `Link`), `content_url`.
- **`Task` & `TaskSubmission`**:
  - Practical assignment/project attached to a Node.
  - `Task`: `node`, `title`, `description`, `instructions`, `max_score`.
  - `TaskSubmission`: `task`, `student` (FK to `OrganizationMember`), `payload`, `status` (`Submitted`, `Graded`, `Rejected`), `awarded_score`, `feedback`.
- **`Quiz`, `QuizQuestion`, `QuizOption`, `QuizSubmission`**:
  - Multiple choice quiz assessment attached to a Node.
  - `Quiz`: `node`, `name`, `timer_minutes`.
  - `QuizQuestion`: `quiz`, `question_text`, `allow_multiple_correct`.
  - `QuizOption`: `question`, `option_text`, `is_correct`.
  - `QuizSubmission`: `quiz`, `student` (FK to `OrganizationMember`), `score`, `total_questions`, `correct_answers`, `passed`, `status`.
- **`StudentNodeProgress`**:
  - Tracks individual student completion status for each lesson node (`Locked`, `Unlocked`, `In_Progress`, `Completed`).

## 3. Course Hierarchy & Progress Flow
1. A Course contains one or more ordered Modules.
2. Each Module contains one or more ordered Nodes.
3. A Node contains either a `LearningMaterial`, a `Task`, or a `Quiz`.
4. As learners complete nodes, `StudentNodeProgress` updates automatically, driving course completion percentages.

## 4. API Endpoints
- **Courses**:
  - `GET /api/organizations/{org_id}/courses/`: List all courses in the tenant.
  - `POST /api/organizations/{org_id}/courses/`: Create a new course.
  - `GET /api/organizations/{org_id}/courses/{id}/`: Retrieve course with module outline.
  - `PATCH /api/organizations/{org_id}/courses/{id}/`: Update course details and assigned teachers.
  - `DELETE /api/organizations/{org_id}/courses/{id}/`: Soft-delete course.
- **Modules & Nodes**:
  - `POST /api/organizations/{org_id}/courses/{course_id}/modules/`: Add a module.
  - `PATCH /api/organizations/{org_id}/courses/{course_id}/modules/{id}/`: Update module.
  - `POST /api/organizations/{org_id}/courses/{course_id}/modules/{module_id}/nodes/`: Add a node.
  - `PUT /api/organizations/{org_id}/nodes/{node_id}/content/`: Update node content (Learning Material, Task, or Quiz).
  - `DELETE /api/organizations/{org_id}/courses/{course_id}/modules/{module_id}/nodes/{id}/`: Delete node.
- **Evaluation & Grading**:
  - `GET /api/organizations/{org_id}/pending-evaluations/`: List unreviewed task submissions.
  - `PATCH /api/organizations/{org_id}/submissions/{submission_id}/grade/`: Grade task submission.
- **Learner Progress & Reporting**:
  - `GET /api/organizations/{org_id}/learner-progress/`: View learner progress, status, and completion metrics.
  - `GET /api/organizations/{org_id}/learner-progress/export/`: Download multi-sheet styled Excel workbook reporting all learners, courses, and quiz scores.

## 5. Progress Exporter (`curriculum/progress_export.py`)
Generates comprehensive Excel workbooks using `openpyxl`:
- **Overall Progress Sheet**: Summary table with learner names, emails, courses, completion percentages, last activity timestamps, and dynamic quiz score columns.
- **Individual Student Sheets**: Breakdown of all course activities, submissions, awarded scores, and attempts for each learner.

## 6. Business Logic & Invariants
- Completable nodes are those containing learning materials, tasks, assessments, or quizzes.
- All course materials and progress records are logically scoped to the student's active organization.

## 7. Dependencies
- Django ORM, PostgreSQL.
- `openpyxl` for styled spreadsheet generation.
- `organizations` and `accounts` apps.

## 8. Testing & Verification
Tests are located in `curriculum/tests/`:
```bash
poetry run pytest curriculum/ -p no:cacheprovider --no-cov -q
```
105 automated tests verify course authoring, module ordering, quiz grading, task submissions, and progress export reporting.
