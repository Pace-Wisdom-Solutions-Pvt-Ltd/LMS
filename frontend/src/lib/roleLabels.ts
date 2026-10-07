// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/** UI labels for the API user-role identifiers returned by the users endpoint. */
export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  teacher: 'Trainer',
  student: 'Student',
  org_admin: 'Organization Admin',
}

/** Human-readable label for an API user role, falling back to the raw key. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}
