// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest'
import { is2FAEnabled, getPasswordPolicy, validatePasswordAgainstPolicy } from './settings'

const STORAGE_KEY = 'superAdminSystemSettings:v1'

beforeEach(() => {
  localStorage.clear()
})

describe('is2FAEnabled', () => {
  it('returns false when nothing in localStorage', () => {
    expect(is2FAEnabled()).toBe(false)
  })

  it('returns false when passwordPolicy.enable2fa is false', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ passwordPolicy: { enable2fa: false } }))
    expect(is2FAEnabled()).toBe(false)
  })

  it('returns true when enable2fa is true', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ passwordPolicy: { enable2fa: true } }))
    expect(is2FAEnabled()).toBe(true)
  })

  it('returns false for corrupt localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(is2FAEnabled()).toBe(false)
  })

  it('returns false when passwordPolicy is missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: true }))
    expect(is2FAEnabled()).toBe(false)
  })
})

describe('getPasswordPolicy', () => {
  it('returns defaults when nothing in localStorage', () => {
    const policy = getPasswordPolicy()
    expect(policy.minLength).toBe(8)
    expect(policy.requireUppercase).toBe(true)
    expect(policy.requireNumber).toBe(true)
    expect(policy.requireSpecialChar).toBe(true)
  })

  it('returns defaults when passwordPolicy is missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: true }))
    const policy = getPasswordPolicy()
    expect(policy.minLength).toBe(8)
  })

  it('returns stored policy values', () => {
    const stored = { passwordPolicy: { minLength: '10', requireUppercase: true, requireNumber: false, requireSpecialChar: false } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const policy = getPasswordPolicy()
    expect(policy.minLength).toBe(10)
    expect(policy.requireUppercase).toBe(true)
    expect(policy.requireNumber).toBe(false)
    expect(policy.requireSpecialChar).toBe(false)
  })

  it('returns defaults for corrupt localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    const policy = getPasswordPolicy()
    expect(policy.minLength).toBe(8)
  })

  it('uses 8 when minLength is non-numeric', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ passwordPolicy: { minLength: 'bad', requireUppercase: false, requireNumber: false, requireSpecialChar: false } }))
    const policy = getPasswordPolicy()
    expect(policy.minLength).toBe(8)
  })
})

describe('validatePasswordAgainstPolicy', () => {
  it('returns empty array for valid password (defaults)', () => {
    const errors = validatePasswordAgainstPolicy('Secure@1')
    expect(errors).toHaveLength(0)
  })

  it('returns error for too short password', () => {
    const errors = validatePasswordAgainstPolicy('Sh0rt!')
    expect(errors.some((e) => e.includes('characters'))).toBe(true)
  })

  it('returns error when missing uppercase', () => {
    const errors = validatePasswordAgainstPolicy('secure@123')
    expect(errors.some((e) => e.includes('uppercase'))).toBe(true)
  })

  it('returns error when missing number', () => {
    const errors = validatePasswordAgainstPolicy('Secure@abc')
    expect(errors.some((e) => e.includes('number'))).toBe(true)
  })

  it('returns error when missing special char', () => {
    const errors = validatePasswordAgainstPolicy('SecurePass1')
    expect(errors.some((e) => e.includes('special'))).toBe(true)
  })

  it('returns multiple errors', () => {
    const errors = validatePasswordAgainstPolicy('abc')
    expect(errors.length).toBeGreaterThan(1)
  })

  it('no errors when all requirements disabled', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ passwordPolicy: { minLength: 1, requireUppercase: false, requireNumber: false, requireSpecialChar: false } }))
    const errors = validatePasswordAgainstPolicy('a')
    expect(errors).toHaveLength(0)
  })
})
