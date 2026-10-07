// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { mapBackendRolesToAppRoles, collectRawRoles } from './roleMapping'

describe('mapBackendRolesToAppRoles', () => {
  it('maps backend vocabulary onto app roles', () => {
    expect(mapBackendRolesToAppRoles(['teacher']).roles).toEqual(['trainer'])
    expect(mapBackendRolesToAppRoles(['org_admin']).roles).toEqual(['institute_admin'])
    // 'superadmin' is not part of the open-source role vocabulary — falls back to student.
    expect(mapBackendRolesToAppRoles(['superadmin']).roles).toEqual(['student'])
  })

  it('dedupes and keeps every distinct role', () => {
    const { roles } = mapBackendRolesToAppRoles(['teacher', 'trainer', 'student'])
    expect(roles).toEqual(['trainer', 'student'])
  })

  it('picks the default role by precedence institute_admin > trainer > student', () => {
    expect(mapBackendRolesToAppRoles(['student', 'teacher']).defaultRole).toBe('trainer')
    expect(mapBackendRolesToAppRoles(['student', 'org_admin']).defaultRole).toBe('institute_admin')
    expect(mapBackendRolesToAppRoles(['trainer', 'org_admin']).defaultRole).toBe('institute_admin')
  })

  it('falls back to student when nothing recognizable is present', () => {
    expect(mapBackendRolesToAppRoles([])).toEqual({ roles: ['student'], defaultRole: 'student' })
    expect(mapBackendRolesToAppRoles(['mystery'])).toEqual({ roles: ['student'], defaultRole: 'student' })
  })
})

describe('collectRawRoles', () => {
  it('unions the roles array inside each organization', () => {
    const raw = collectRawRoles({
      organizations: [{ org_id: 1, name: 'Org', role: 'teacher', roles: ['teacher', 'student'] }],
    })
    // The org-level roles must surface so a teacher+student shows up as multi-role.
    expect(mapBackendRolesToAppRoles(raw).roles).toEqual(['trainer', 'student'])
  })

  it('includes the single org role even when no roles array is provided', () => {
    const raw = collectRawRoles({ organizations: [{ org_id: 1, name: 'Org', role: 'teacher' }] })
    expect(raw).toContain('teacher')
  })

  it('combines top-level roles with org-level roles', () => {
    const raw = collectRawRoles({
      roles: ['student'],
      organizations: [{ org_id: 1, name: 'Org', role: 'teacher', roles: ['teacher'] }],
    })
    expect(mapBackendRolesToAppRoles(raw).roles).toEqual(['trainer', 'student'])
  })

  it('handles a missing organizations array', () => {
    expect(collectRawRoles({ roles: ['student'] })).toEqual(['student'])
    expect(collectRawRoles({})).toEqual([])
  })
})
