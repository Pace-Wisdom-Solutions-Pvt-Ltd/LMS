// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appendLoginAudit, getLoginAudit } from './auditLog'

describe('auditLog', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'))
  })

  it('appendLoginAudit normalizes email and persists entry', () => {
    appendLoginAudit('  TEST@Example.com ', true, '1.2.3.4')
    const rows = getLoginAudit()
    expect(rows.length).toBe(1)
    expect(rows[0]).toEqual({
      timestamp: '2026-03-30T12:00:00.000Z',
      email: 'test@example.com',
      success: true,
      ip: '1.2.3.4',
    })
  })

  it('getLoginAudit returns [] for invalid JSON', () => {
    localStorage.setItem('lms-audit-login:v1', '{ not json')
    expect(getLoginAudit()).toEqual([])
  })
})

