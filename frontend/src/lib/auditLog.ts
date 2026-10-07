// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Login audit log: append-only log of login attempts (success/fail).
 * Persisted in localStorage (key: lms-audit-login:v1).
 */

const STORAGE_KEY = 'lms-audit-login:v1'
const MAX_ENTRIES = 500

export interface LoginAuditEntry {
  timestamp: string
  email: string
  success: boolean
  ip?: string
}

function load(): LoginAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(entries: LoginAuditEntry[]) {
  try {
    const trimmed = entries.slice(-MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }
}

export function appendLoginAudit(email: string, success: boolean, ip?: string): void {
  const entries = load()
  entries.push({
    timestamp: new Date().toISOString(),
    email: email.trim().toLowerCase(),
    success,
    ip: ip || undefined,
  })
  save(entries)
}

export function getLoginAudit(): LoginAuditEntry[] {
  return load()
}
