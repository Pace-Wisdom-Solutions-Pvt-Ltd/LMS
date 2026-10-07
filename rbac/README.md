# RBAC Module (Role-Based Access Control)

## 1. Overview
The `rbac` module provides global authorization, role definitions, and permission classes for the LMS platform. It defines the foundational roles (`superadmin`, `org_admin`, `teacher`, `student`) and enforces permission boundaries on API endpoints.

## 2. Models
- **`Role` (`rbac.models.Role`)**:
  - `id`: Auto-increment integer primary key.
  - `name`: Unique name/slug of the role (`superadmin`, `org_admin`, `teacher`, `student`).
  - `description`: Optional human-readable description.
- **`UserRole` (`rbac.models.UserRole`)**:
  - Global user-to-role assignment bridge table.
  - `user`: ForeignKey to `accounts.User`.
  - `role`: ForeignKey to `rbac.Role`.
  - `assigned_at`: Timestamp of role assignment.
  - `unique_together = ('user', 'role')`.

## 3. Permission Classes (`rbac.permissions`)
- **`IsSuperAdmin`**: Restricts access strictly to users with `is_superuser=True`.
- **`IsAdmin`**: Grants access to superusers or users assigned the administrative role.
- **`IsTeacher`**: Grants access to users with the teacher role or superusers.
- **`IsStudent`**: Grants access to users with the student role or superusers.
- **N+1 Query Protection**: Role names are cached on `request._cached_role_names` for the request lifecycle, ensuring only a single query is made even with multiple permission evaluations.

## 4. API Endpoints
- `GET /api/roles/`: List all platform roles (SuperAdmin only).
- `POST /api/roles/`: Create a new role (SuperAdmin only).
- `GET /api/roles/{id}/`: Retrieve a role.
- `PATCH /api/roles/{id}/`: Update role description.
- `DELETE /api/roles/{id}/`: Delete a custom role.
- `GET /api/user-roles/`: List user role assignments (Admin only).
- `POST /api/user-roles/`: Assign a role to a user.
- `DELETE /api/user-roles/{id}/`: Revoke a user role assignment.

## 5. Signals (`rbac.signals`)
- **Superuser Sync**: Whenever an `accounts.User` is saved with `is_superuser=True`, a post-save signal automatically creates a corresponding `UserRole` record linking the user to the `superadmin` role, keeping Django permissions and RBAC models in sync.

## 6. Business Logic & Invariants
- Default platform roles are seeded during database migrations (`0003_seed_initial_roles.py`).
- Tenant-scoped role checks are handled in conjunction with `organizations.permissions.IsOrgAdmin` and `organizations.permissions.IsOrgAdminOrTeacher`.

## 7. Dependencies
- Django core ORM.
- Django REST Framework `permissions.BasePermission`.
- `accounts` app.

## 8. Testing & Verification
Tests are located in `rbac/tests/`:
```bash
poetry run pytest rbac/ -p no:cacheprovider --no-cov -q
```
Covers role creation, permission verification, superuser auto-assignment signals, and assignment idempotency.
