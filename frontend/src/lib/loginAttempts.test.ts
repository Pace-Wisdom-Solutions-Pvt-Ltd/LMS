// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getLockRemainingMinutes,
  isLocked,
  recordFailedAttempt,
  clearAttempts,
  getAttemptCount,
} from './loginAttempts'

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('getLockRemainingMinutes', () => {
  it('returns 0 when no state exists', () => {
    expect(getLockRemainingMinutes('test@test.com')).toBe(0)
  })

  it('returns 0 when lockedUntil is in the past', () => {
    const past = new Date(Date.now() - 60000).toISOString()
    localStorage.setItem('lms-login-attempts:v1', JSON.stringify({ 'test@test.com': { count: 5, lockedUntil: past } }))
    expect(getLockRemainingMinutes('test@test.com')).toBe(0)
  })

  it('returns remaining minutes when locked', () => {
    const future = new Date(Date.now() + 10 * 60000).toISOString()
    localStorage.setItem('lms-login-attempts:v1', JSON.stringify({ 'test@test.com': { count: 5, lockedUntil: future } }))
    expect(getLockRemainingMinutes('test@test.com')).toBeGreaterThan(0)
    expect(getLockRemainingMinutes('test@test.com')).toBeLessThanOrEqual(10)
  })

  it('is case-insensitive', () => {
    const future = new Date(Date.now() + 10 * 60000).toISOString()
    localStorage.setItem('lms-login-attempts:v1', JSON.stringify({ 'test@test.com': { count: 5, lockedUntil: future } }))
    expect(getLockRemainingMinutes('TEST@TEST.COM')).toBeGreaterThan(0)
  })

  it('returns 0 when lockedUntil is empty string', () => {
    localStorage.setItem('lms-login-attempts:v1', JSON.stringify({ 'test@test.com': { count: 2, lockedUntil: '' } }))
    expect(getLockRemainingMinutes('test@test.com')).toBe(0)
  })
})

describe('isLocked', () => {
  it('returns false when not locked', () => {
    expect(isLocked('test@test.com')).toBe(false)
  })

  it('returns true when locked', () => {
    const future = new Date(Date.now() + 10 * 60000).toISOString()
    localStorage.setItem('lms-login-attempts:v1', JSON.stringify({ 'test@test.com': { count: 5, lockedUntil: future } }))
    expect(isLocked('test@test.com')).toBe(true)
  })
})

describe('recordFailedAttempt', () => {
  it('increments count on first attempt', () => {
    const count = recordFailedAttempt('new@test.com')
    expect(count).toBe(1)
  })

  it('increments count on subsequent attempts', () => {
    recordFailedAttempt('user@test.com')
    recordFailedAttempt('user@test.com')
    const count = recordFailedAttempt('user@test.com')
    expect(count).toBe(3)
  })

  it('locks after 5 attempts', () => {
    for (let i = 0; i < 4; i++) recordFailedAttempt('lock@test.com')
    expect(isLocked('lock@test.com')).toBe(false)
    recordFailedAttempt('lock@test.com')
    expect(isLocked('lock@test.com')).toBe(true)
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('lms-login-attempts:v1', 'not-valid-json')
    expect(() => recordFailedAttempt('test@test.com')).not.toThrow()
  })
})

describe('clearAttempts', () => {
  it('clears attempts for an email', () => {
    recordFailedAttempt('clear@test.com')
    recordFailedAttempt('clear@test.com')
    clearAttempts('clear@test.com')
    expect(getAttemptCount('clear@test.com')).toBe(0)
  })

  it('does not affect other emails', () => {
    recordFailedAttempt('user1@test.com')
    recordFailedAttempt('user2@test.com')
    clearAttempts('user1@test.com')
    expect(getAttemptCount('user2@test.com')).toBe(1)
  })

  it('handles non-existent email gracefully', () => {
    expect(() => clearAttempts('nonexistent@test.com')).not.toThrow()
  })
})

describe('getAttemptCount', () => {
  it('returns 0 for unknown email', () => {
    expect(getAttemptCount('unknown@test.com')).toBe(0)
  })

  it('returns current count', () => {
    recordFailedAttempt('count@test.com')
    recordFailedAttempt('count@test.com')
    expect(getAttemptCount('count@test.com')).toBe(2)
  })

  it('returns MAX_ATTEMPTS when locked', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('maxed@test.com')
    expect(getAttemptCount('maxed@test.com')).toBe(5)
  })
})
