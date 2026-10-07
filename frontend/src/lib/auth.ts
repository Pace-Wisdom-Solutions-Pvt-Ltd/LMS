// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

const AUTH_KEYS = {
  user: 'lms-user',
  token: 'lms-token',
  refresh: 'lms-refresh-token',
  orgs: 'lms-orgs',
  integrity: 'lms-integrity',
} as const

/** Salt for integrity hash - changes invalidate existing storage */
const INTEGRITY_SALT = 'lms-auth-v1-x9k2'

function hash(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return String(h >>> 0)
}

function computeIntegrity(
  userRaw: string | null,
  token: string | null,
  refresh: string | null,
  orgsRaw: string | null
): string {
  return hash([userRaw ?? '', token ?? '', refresh ?? '', orgsRaw ?? '', INTEGRITY_SALT].join('|'))
}

function setAuthIntegrity(): void {
  const userRaw = localStorage.getItem(AUTH_KEYS.user)
  const token = localStorage.getItem(AUTH_KEYS.token)
  const refresh = localStorage.getItem(AUTH_KEYS.refresh)
  const orgsRaw = localStorage.getItem(AUTH_KEYS.orgs)
  const sig = computeIntegrity(userRaw, token, refresh, orgsRaw)
  localStorage.setItem(AUTH_KEYS.integrity, sig)
}

/** Returns true if stored auth is valid; if tampered, clears storage and returns false */
function verifyAuthIntegrity(): boolean {
  const userRaw = localStorage.getItem(AUTH_KEYS.user)
  const token = localStorage.getItem(AUTH_KEYS.token)
  const refresh = localStorage.getItem(AUTH_KEYS.refresh)
  const orgsRaw = localStorage.getItem(AUTH_KEYS.orgs)
  const storedSig = localStorage.getItem(AUTH_KEYS.integrity)
  const expected = computeIntegrity(userRaw, token, refresh, orgsRaw)
  if (storedSig !== expected) {
    localStorage.removeItem(AUTH_KEYS.user)
    localStorage.removeItem(AUTH_KEYS.token)
    localStorage.removeItem(AUTH_KEYS.refresh)
    localStorage.removeItem(AUTH_KEYS.orgs)
    localStorage.removeItem(AUTH_KEYS.integrity)
    return false
  }
  return true
}

export type UserRole = 'institute_admin' | 'trainer' | 'student'

export interface User {
  id?: string
  email: string
  name?: string
  role: UserRole
  roles?: UserRole[]
}

export interface StoredOrganization {
  id: number
  name: string
  role: string
  logo?: string | null
  primary_color?: string | null
  accent_color?: string | null
}


export function getStoredUser(): User | null {
  try {
    if (!verifyAuthIntegrity()) return null
    const raw = localStorage.getItem(AUTH_KEYS.user)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(AUTH_KEYS.user, JSON.stringify(user))
  setAuthIntegrity()
}

export function getStoredOrganizations(): StoredOrganization[] {
  try {
    if (!verifyAuthIntegrity()) return []
    const raw = localStorage.getItem(AUTH_KEYS.orgs)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as StoredOrganization[]) : []
  } catch {
    return []
  }
}

export function setStoredOrganizations(orgs: StoredOrganization[]): void {
  localStorage.setItem(AUTH_KEYS.orgs, JSON.stringify(orgs))
  setAuthIntegrity()
}

/** Extended profile (name, phone, avatar) - persisted per user email */
const PROFILE_KEY = 'lms-profile:v1'

export interface StoredProfile {
  name?: string
  first_name?: string
  last_name?: string
  phone?: string
  avatarUrl?: string
}

export function getStoredProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredProfile
  } catch {
    return null
  }
}

export function setStoredProfile(profile: StoredProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearStoredUser(): void {
  localStorage.removeItem(AUTH_KEYS.user)
  localStorage.removeItem(AUTH_KEYS.token)
  localStorage.removeItem(AUTH_KEYS.refresh)
  localStorage.removeItem(AUTH_KEYS.orgs)
  localStorage.removeItem(AUTH_KEYS.integrity)
}

export function getStoredToken(): string | null {
  if (!verifyAuthIntegrity()) return null
  return localStorage.getItem(AUTH_KEYS.token)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_KEYS.token, token)
  setAuthIntegrity()
}

export function getStoredRefreshToken(): string | null {
  if (!verifyAuthIntegrity()) return null
  return localStorage.getItem(AUTH_KEYS.refresh)
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(AUTH_KEYS.refresh, token)
  setAuthIntegrity()
}

export function hasRole(user: User, role: UserRole): boolean {
  return user.roles?.includes(role) ?? user.role === role
}
