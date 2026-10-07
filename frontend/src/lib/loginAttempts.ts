// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Login attempt tracking: max 5 attempts, 15 min lock.
 * Persisted in localStorage (key: lms-login-attempts:v1).
 */

const STORAGE_KEY = 'lms-login-attempts:v1'
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export interface AttemptState {
  count: number
  lockedUntil: string // ISO timestamp
}

function load(): Record<string, AttemptState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function save(data: Record<string, AttemptState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/** Returns remaining lock minutes (0 if not locked). */
export function getLockRemainingMinutes(email: string): number {
  const key = email.trim().toLowerCase()
  const state = load()[key]
  if (!state?.lockedUntil) return 0
  const until = new Date(state.lockedUntil).getTime()
  if (Date.now() >= until) return 0
  return Math.ceil((until - Date.now()) / 60000)
}

/** True if this email is currently locked. */
export function isLocked(email: string): boolean {
  return getLockRemainingMinutes(email) > 0
}

/** Record a failed attempt. Call after validating credentials and failing. */
export function recordFailedAttempt(email: string): number {
  const key = email.trim().toLowerCase()
  const data = load()
  const state = data[key] ?? { count: 0, lockedUntil: '' }

  state.count += 1
  if (state.count >= MAX_ATTEMPTS) {
    const until = new Date()
    until.setMinutes(until.getMinutes() + LOCK_MINUTES)
    state.lockedUntil = until.toISOString()
  }
  data[key] = state
  save(data)
  return state.count
}

/** Clear attempts for this email (call on successful login). */
export function clearAttempts(email: string): void {
  const key = email.trim().toLowerCase()
  const data = load()
  delete data[key]
  save(data)
}

export function getAttemptCount(email: string): number {
  const key = email.trim().toLowerCase()
  const state = load()[key]
  if (!state) return 0
  if (state.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now()) return MAX_ATTEMPTS
  return state.count
}
