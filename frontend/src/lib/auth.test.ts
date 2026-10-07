// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearStoredUser,
  getStoredToken,
  getStoredUser,
  hasRole,
  setStoredRefreshToken,
  setStoredToken,
  setStoredUser,
  type User,
} from '@/lib/auth'

describe('auth helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads auth safely with integrity', () => {
    const user: User = {
      email: 'sample@example.com',
      role: 'trainer',
      roles: ['trainer', 'institute_admin'],
    }

    setStoredUser(user)
    setStoredToken('access-token')
    setStoredRefreshToken('refresh-token')

    expect(getStoredUser()).toEqual(user)
    expect(getStoredToken()).toBe('access-token')
  })

  it('clears tampered auth storage', () => {
    const user: User = {
      email: 'tamper@example.com',
      role: 'student',
      roles: ['student'],
    }

    setStoredUser(user)
    setStoredToken('token-1')
    setStoredRefreshToken('refresh-1')

    // Simulate localStorage tampering after integrity is computed.
    localStorage.setItem('lms-token', 'tampered')

    expect(getStoredUser()).toBeNull()
    expect(getStoredToken()).toBeNull()
  })

  it('checks user role from role and roles list', () => {
    const user: User = {
      email: 'roles@example.com',
      role: 'trainer',
      roles: ['trainer', 'institute_admin'],
    }

    expect(hasRole(user, 'trainer')).toBe(true)
    expect(hasRole(user, 'institute_admin')).toBe(true)
    expect(hasRole(user, 'student')).toBe(false)
  })

  it('clearStoredUser removes all auth keys', () => {
    const user: User = {
      email: 'clear@example.com',
      role: 'student',
      roles: ['student'],
    }

    setStoredUser(user)
    setStoredToken('token')
    setStoredRefreshToken('refresh')
    clearStoredUser()

    expect(localStorage.getItem('lms-user')).toBeNull()
    expect(localStorage.getItem('lms-token')).toBeNull()
    expect(localStorage.getItem('lms-refresh-token')).toBeNull()
    expect(localStorage.getItem('lms-integrity')).toBeNull()
  })
})
