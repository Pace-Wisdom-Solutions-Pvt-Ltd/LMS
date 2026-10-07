// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'

const mockUser = { email: 'test@test.com', role: 'instructor' as const, roles: ['instructor' as const] }

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue(null),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
}))

import { getStoredUser, setStoredUser, clearStoredUser } from '@/lib/auth'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null user when not authenticated', () => {
    vi.mocked(getStoredUser).mockReturnValue(null)
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('returns user when authenticated', () => {
    vi.mocked(getStoredUser).mockReturnValue(mockUser)
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('login calls setStoredUser', () => {
    const { result } = renderHook(() => useAuth())
    act(() => {
      result.current.login(mockUser)
    })
    expect(setStoredUser).toHaveBeenCalledWith(mockUser)
  })

  it('logout calls clearStoredUser', () => {
    const { result } = renderHook(() => useAuth())
    act(() => {
      result.current.logout()
    })
    expect(clearStoredUser).toHaveBeenCalled()
  })
})
