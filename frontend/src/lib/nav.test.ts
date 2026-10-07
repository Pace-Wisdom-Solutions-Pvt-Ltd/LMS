// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { getInstituteAdminTitle } from '@/features/institute-admin/nav'

describe('getInstituteAdminTitle', () => {
  it('returns correct title for known paths', () => {
    expect(getInstituteAdminTitle('/institute-admin/home')).toBe('Dashboard')
    expect(getInstituteAdminTitle('/institute-admin/users')).toBe('Manage Users')
    expect(getInstituteAdminTitle('/institute-admin/teachers')).toBe('Trainer Listing')
    expect(getInstituteAdminTitle('/institute-admin/students')).toBe('Learner Listing')
    expect(getInstituteAdminTitle('/institute-admin/batches')).toBe('Batch Listing')
    expect(getInstituteAdminTitle('/institute-admin/course-progress')).toBe('Course Progress & Review')
    expect(getInstituteAdminTitle('/org-admin/course-progress')).toBe('Course Progress & Review')
    expect(getInstituteAdminTitle('/institute-admin/academic-setup')).toBe('Training Structure')
    expect(getInstituteAdminTitle('/institute-admin/assessment')).toBe('Assessments & Certification')
    expect(getInstituteAdminTitle('/institute-admin/interview')).toBe('Interview')
    expect(getInstituteAdminTitle('/institute-admin/content')).toBe('Courses & Content')
    expect(getInstituteAdminTitle('/institute-admin/sessions')).toBe('Sessions')
    expect(getInstituteAdminTitle('/institute-admin/reporting')).toBe('Reporting')
    expect(getInstituteAdminTitle('/institute-admin/audit-logs')).toBe('Audit Logs')
    expect(getInstituteAdminTitle('/institute-admin/profile')).toBe('Profile')
    expect(getInstituteAdminTitle('/institute-admin/account-settings')).toBe('Account Settings')
    expect(getInstituteAdminTitle('/institute-admin/change-password')).toBe('Change Password')
  })

  it('returns fallback for unknown paths', () => {
    expect(getInstituteAdminTitle('/institute-admin/unknown')).toBe('Organization Admin')
    expect(getInstituteAdminTitle('')).toBe('Organization Admin')
    expect(getInstituteAdminTitle('/other')).toBe('Organization Admin')
  })
})
