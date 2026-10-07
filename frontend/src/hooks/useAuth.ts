// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'
import {
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  type User,
} from '@/lib/auth'

export function useAuth() {
  const user = getStoredUser()

  const login = useCallback((u: User) => {
    setStoredUser(u)
  }, [])

  const logout = useCallback(() => {
    clearStoredUser()
  }, [])

  return { user, login, logout, isAuthenticated: !!user }
}
