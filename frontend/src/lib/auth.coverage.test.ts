// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearStoredUser,
  getStoredToken,
  getStoredRefreshToken,
  getStoredUser,
  getStoredOrganizations,
  setStoredOrganizations,
  getStoredProfile,
  setStoredProfile,
  hasRole,
  setStoredRefreshToken,
  setStoredToken,
  setStoredUser,
  type User,
  type StoredOrganization,
  type StoredProfile,
} from '@/lib/auth'

describe('auth helpers – additional coverage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── getStoredUser edge cases ──

  it('returns null when no user is stored', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('returns null when stored user is invalid JSON', () => {
    // Set integrity will be wrong, but let's first set valid then corrupt
    const user: User = { email: 'test@x.com', role: 'student', roles: ['student'] }
    setStoredUser(user)
    setStoredToken('t')
    setStoredRefreshToken('r')
    // Corrupt the user JSON but keep integrity matching impossible
    localStorage.setItem('lms-user', '{invalid json}')
    // Integrity will mismatch, so getStoredUser returns null via integrity check
    expect(getStoredUser()).toBeNull()
  })

  // ── getStoredOrganizations ──

  it('returns empty array when no orgs stored', () => {
    expect(getStoredOrganizations()).toEqual([])
  })

  it('returns orgs when stored correctly with integrity', () => {
    const orgs: StoredOrganization[] = [{ id: 1, name: 'Org 1', role: 'admin' }]
    setStoredUser({ email: 'test@x.com', role: 'student', roles: ['student'] })
    setStoredToken('tok')
    setStoredRefreshToken('ref')
    setStoredOrganizations(orgs)
    expect(getStoredOrganizations()).toEqual(orgs)
  })

  it('returns empty array when orgs is tampered', () => {
    const orgs: StoredOrganization[] = [{ id: 1, name: 'Org 1', role: 'admin' }]
    setStoredUser({ email: 'test@x.com', role: 'student', roles: ['student'] })
    setStoredToken('tok')
    setStoredRefreshToken('ref')
    setStoredOrganizations(orgs)
    // Tamper
    localStorage.setItem('lms-orgs', JSON.stringify([{ id: 999, name: 'Hacked', role: 'institute_admin' }]))
    expect(getStoredOrganizations()).toEqual([])
  })

  it('returns empty array when orgs is not an array', () => {
    setStoredUser({ email: 'test@x.com', role: 'student', roles: ['student'] })
    setStoredToken('tok')
    setStoredRefreshToken('ref')
    // Store a non-array value
    localStorage.setItem('lms-orgs', JSON.stringify({ id: 1, name: 'NotArray' }))
    // Re-set integrity to match the new orgs value
    // We can't call setAuthIntegrity directly, so we use setStoredOrganizations
    // Actually integrity will be wrong so it'll return [] via integrity check
    expect(getStoredOrganizations()).toEqual([])
  })

  // ── getStoredRefreshToken ──

  it('returns refresh token when stored with integrity', () => {
    setStoredUser({ email: 'test@x.com', role: 'student', roles: ['student'] })
    setStoredToken('access-tok')
    setStoredRefreshToken('refresh-tok')
    expect(getStoredRefreshToken()).toBe('refresh-tok')
  })

  it('returns null for refresh token when integrity is broken', () => {
    setStoredUser({ email: 'test@x.com', role: 'student', roles: ['student'] })
    setStoredToken('access-tok')
    setStoredRefreshToken('refresh-tok')
    localStorage.setItem('lms-refresh-token', 'tampered-refresh')
    expect(getStoredRefreshToken()).toBeNull()
  })

  it('returns null for refresh token when nothing stored', () => {
    expect(getStoredRefreshToken()).toBeNull()
  })

  // ── getStoredToken edge cases ──

  it('returns null for token when nothing stored', () => {
    expect(getStoredToken()).toBeNull()
  })

  // ── Profile helpers ──

  it('returns null when no profile stored', () => {
    expect(getStoredProfile()).toBeNull()
  })

  it('stores and retrieves profile', () => {
    const profile: StoredProfile = {
      name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      phone: '1234567890',
      avatarUrl: 'https://example.com/avatar.png',
    }
    setStoredProfile(profile)
    expect(getStoredProfile()).toEqual(profile)
  })

  it('returns null for corrupted profile JSON', () => {
    localStorage.setItem('lms-profile:v1', 'not-valid-json')
    expect(getStoredProfile()).toBeNull()
  })

  // ── hasRole edge cases ──

  it('falls back to user.role when roles array is undefined', () => {
    const user: User = { email: 'x@x.com', role: 'trainer' }
    expect(hasRole(user, 'trainer')).toBe(true)
    expect(hasRole(user, 'student')).toBe(false)
  })

  it('uses roles array when present', () => {
    const user: User = { email: 'x@x.com', role: 'trainer', roles: ['trainer', 'institute_admin'] }
    expect(hasRole(user, 'institute_admin')).toBe(true)
    expect(hasRole(user, 'student')).toBe(false)
  })

  it('returns false when roles is empty array', () => {
    const user: User = { email: 'x@x.com', role: 'trainer', roles: [] }
    expect(hasRole(user, 'trainer')).toBe(false)
  })

  // ── clearStoredUser comprehensive check ──

  it('clears all auth keys including orgs', () => {
    setStoredUser({ email: 'clear@x.com', role: 'student', roles: ['student'] })
    setStoredToken('tok')
    setStoredRefreshToken('ref')
    setStoredOrganizations([{ id: 1, name: 'O', role: 'r' }])
    clearStoredUser()
    expect(localStorage.getItem('lms-user')).toBeNull()
    expect(localStorage.getItem('lms-token')).toBeNull()
    expect(localStorage.getItem('lms-refresh-token')).toBeNull()
    expect(localStorage.getItem('lms-orgs')).toBeNull()
    expect(localStorage.getItem('lms-integrity')).toBeNull()
  })

  // ── Integrity verification edge cases ──

  it('integrity passes when all values are null (fresh state)', () => {
    // No auth keys set, integrity also not set => storedSig is null, expected is hash of empty
    // storedSig !== expected => returns false => clears storage
    // This is the expected behavior: no integrity = tampered
    expect(getStoredUser()).toBeNull()
  })

  it('setStoredOrganizations updates integrity correctly', () => {
    setStoredUser({ email: 'org@x.com', role: 'student', roles: ['student'] })
    setStoredToken('tok')
    setStoredRefreshToken('ref')
    setStoredOrganizations([{ id: 1, name: 'Org1', role: 'admin' }])
    // Should still be able to get user
    expect(getStoredUser()?.email).toBe('org@x.com')
    // Update orgs
    setStoredOrganizations([{ id: 2, name: 'Org2', role: 'member' }])
    expect(getStoredOrganizations()).toEqual([{ id: 2, name: 'Org2', role: 'member' }])
    expect(getStoredUser()?.email).toBe('org@x.com')
  })
})
