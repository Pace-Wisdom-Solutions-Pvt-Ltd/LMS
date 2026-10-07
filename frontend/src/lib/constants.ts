// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { getStoredUser, type UserRole } from './auth'

export const ROLE_PATHS: Record<UserRole, string> = {
  institute_admin: '/org-admin',
  trainer: '/trainer',
  student: '/student',
}

/**
 * URL prefix for the signed-in user's active role, e.g. `/org-admin`.
 *
 * Use it in screens shared by more than one role (interviews, profile) so links
 * stay inside the caller's own route tree instead of hardcoding one prefix.
 */
export function getRoleBasePath(): string {
  const role = getStoredUser()?.role
  return (role && ROLE_PATHS[role]) || '/student'
}
