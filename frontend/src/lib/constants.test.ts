// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { ROLE_PATHS } from './constants'

describe('ROLE_PATHS', () => {
  it('has paths for all roles', () => {
    expect(ROLE_PATHS.institute_admin).toBe('/org-admin')
    expect(ROLE_PATHS.trainer).toBe('/trainer')
    expect(ROLE_PATHS.student).toBe('/student')
  })

  it('has no super_admin path in the open-source edition', () => {
    expect(Object.keys(ROLE_PATHS).sort()).toEqual(['institute_admin', 'student', 'trainer'])
  })
})
