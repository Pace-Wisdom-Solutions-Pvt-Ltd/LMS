// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { UserRole } from './auth'
import type { LoginOrganization } from './api/auth'

/**
 * Maps the raw role strings returned by the backend (e.g. "teacher",
 * "org_admin") onto the app's `UserRole` vocabulary, and derives the
 * default active role using the precedence
 * institute_admin > trainer > student.
 */
export function mapBackendRolesToAppRoles(
  rawRoles: string[],
): { roles: UserRole[]; defaultRole: UserRole } {
  const normalized = rawRoles.map((r) => r.toLowerCase())

  const isInstituteAdmin = normalized.includes('institute_admin') || normalized.includes('org_admin')
  const isTrainer =
    normalized.includes('instructor') ||
    normalized.includes('trainer') ||
    normalized.includes('teacher')
  const isStudent = normalized.includes('student')

  const roles = new Set<UserRole>()
  if (isInstituteAdmin) roles.add('institute_admin')
  if (isTrainer) roles.add('trainer')
  if (isStudent) roles.add('student')

  let defaultRole: UserRole = 'student'
  if (isInstituteAdmin) defaultRole = 'institute_admin'
  else if (isTrainer) defaultRole = 'trainer'

  const list = Array.from(roles)
  return { roles: list.length ? list : ['student'], defaultRole }
}

/**
 * Collects every role string the backend advertises for a user, unioning the
 * top-level `user.roles` with the per-organization `roles`/`role` fields.
 *
 * The backend attaches the full role set inside each organization membership
 * (e.g. `{ role: "teacher", roles: ["teacher", "student"] }`), so a user who is
 * both a trainer and a student only shows up as multi-role once the org-level
 * `roles` are folded in. Deduplication happens downstream in
 * {@link mapBackendRolesToAppRoles}.
 */
export function collectRawRoles(user: {
  roles?: string[]
  organizations?: LoginOrganization[]
}): string[] {
  const orgRoles = (user.organizations ?? []).flatMap((org) =>
    [...(org.roles ?? []), org.role].filter((r): r is string => Boolean(r)),
  )
  return [...(user.roles ?? []), ...orgRoles]
}
