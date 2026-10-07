# Organizations Module (Multi-Tenancy)

## 1. Overview
The `organizations` module implements logical tenant isolation for the LMS. It manages tenants (`Organization`), tenant memberships (`OrganizationMember`), learning cohorts (`Batch`), and student cohort assignments (`BatchStudent`).

## 2. Models
- **`Organization` (`organizations.models.Organization`)**:
  - Tenant boundary with `name`, `slug` (unique), `contact_email`, `logo`, and `is_active`.
- **`OrganizationMember` (`organizations.models.OrganizationMember`)**:
  - Connects a global `accounts.User` to an `Organization`.
  - `role`: ForeignKey to `rbac.Role` (`org_admin`, `teacher`, `student`).
  - `roles`: ManyToManyField to `rbac.Role` allowing multi-role assignments within the tenant.
  - `batches`: ManyToManyField linking student members to their enrolled cohorts.
  - `uuid`: Public unique identifier used for tenant progress scoping.
- **`Batch` (`organizations.models.Batch`)**:
  - Cohort grouping representing a semester, term, or corporate training class.
  - Fields: `name`, `start_date`, `end_date`, `is_active`, `courses` (ManyToMany to `curriculum.Course`).
- **`BatchStudent` (`organizations.models.BatchStudent`)**:
  - Enrollment bridge linking an `OrganizationMember` to a `Batch`.
  - Fields: `student` (FK to `OrganizationMember`), `batch` (FK to `Batch`), `student_id_number` (optional institution roll/ID), `enrolled_at`.

## 3. Tenant Isolation & Permissions
- **`IsOrgAdmin`**: Ensures the requesting user is an active administrator of the target organization.
- **`IsOrgAdminOrTeacher`**: Ensures the user holds either an admin or teacher role in the specified organization.
- All querysets filter against `organization_id=org_id` to strictly prevent cross-tenant data leakage.

## 4. API Endpoints
- **Organization Profile**:
  - `GET /api/organizations/{id}/`: Retrieve organization details.
  - `PATCH /api/organizations/{id}/`: Update organization settings.
- **Staff Management**:
  - `GET /api/organizations/{org_id}/staff/`: List teachers and admins in the organization.
  - `POST /api/organizations/{org_id}/staff/`: Invite a new teacher or admin.
  - `DELETE /api/organizations/{org_id}/staff/{id}/`: Remove staff member.
- **Batch Management**:
  - `GET /api/organizations/{org_id}/batches/`: List all batches.
  - `POST /api/organizations/{org_id}/batches/`: Create a new cohort.
  - `GET /api/organizations/{org_id}/batches/{batch_id}/`: Retrieve batch details.
  - `PATCH /api/organizations/{org_id}/batches/{batch_id}/`: Update batch.
  - `DELETE /api/organizations/{org_id}/batches/{batch_id}/`: Soft delete batch.
- **Student Enrollment**:
  - `GET /api/organizations/{org_id}/batches/{batch_id}/students/`: List enrolled students.
  - `POST /api/organizations/{org_id}/batches/{batch_id}/students/`: Bulk enroll students into batch (creates User, OrganizationMember, and BatchStudent atomically).
  - `POST /api/organizations/{org_id}/batches/{batch_id}/students/bulk-upload-file/`: Bulk upload student roster from Excel/CSV file.
  - `GET /api/organizations/{org_id}/batches/{batch_id}/students/download-template/`: Download roster Excel template.
  - `DELETE /api/organizations/{org_id}/batches/{batch_id}/students/{pk}/`: Remove student from batch.

## 5. Management Commands
- `python manage.py create_initial_organization`:
  - Bootstraps the first tenant organization and its administrative user.
  - Arguments: `--org-name`, `--org-slug`, `--admin-email`, `--password`.

## 6. Business Logic & Invariants
- Enrolling a student into a batch automatically links the student's `OrganizationMember` record and assigns them to the batch courses.
- Duplicate batch enrollments for the same user are rejected with clear validation errors.

## 7. Dependencies
- Django core ORM, PostgreSQL.
- `pandas` and `openpyxl` for roster processing.
- `accounts` and `rbac` apps.

## 8. Testing & Verification
Tests are located in `organizations/tests/`:
```bash
poetry run pytest organizations/ -p no:cacheprovider --no-cov -q
```
143 automated tests cover roster imports, batch creation, member role assignments, permissions, and tenant isolation.
