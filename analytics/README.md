# Analytics Module

## 1. Overview
The `analytics` module provides progress dashboards, completion tracking, and high-level performance metrics for organizations and their batches.

## 2. Views & Metrics
- **`OrganizationProgressDashboardView` (`analytics.views.OrganizationProgressDashboardView`)**:
  - Aggregates learner progress across organization courses and batches.
  - Metrics computed:
    - Total students enrolled.
    - Active vs. completed student ratios.
    - Course completion percentages.
    - Average score across quizzes and graded tasks.

## 3. API Endpoints
- `GET /api/organizations/{org_id}/analytics/progress-dashboard/`:
  - Returns summarized progress metrics for the organization.
  - Query parameters:
    - `course_id` (optional): Filter metrics by specific course.
    - `batch_id` (optional): Filter metrics by specific cohort batch.

## 4. Permissions
- Protected by `organizations.permissions.IsOrgAdminOrTeacher`.
- Only instructors and administrators within the specific tenant can access organization analytics.

## 5. Caching & Performance
- Uses selective database aggregations (`Count`, `Avg`) grouped by student and course to deliver high-performance reporting even across large batches.

## 6. Business Logic & Invariants
- Only active student memberships and non-deleted enrollment records are included in analytical totals.
- Cross-tenant metrics leakage is prohibited; all aggregation queries enforce `organization_id=org_id`.

## 7. Dependencies
- Django ORM aggregation framework.
- `organizations` and `curriculum` apps.

## 8. Testing & Verification
Tests are located in `analytics/tests/`:
```bash
poetry run pytest analytics/ -p no:cacheprovider --no-cov -q
```
17 automated tests verify progress dashboard metrics, filtering by course and batch, and role permission guards.
