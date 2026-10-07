// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Read Super Admin system settings from localStorage (for login 2FA check, password policy, etc.).
 */

const STORAGE_KEY = 'superAdminSystemSettings:v1'

export function is2FAEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    return !!data?.passwordPolicy?.enable2fa
  } catch {
    return false
  }
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireNumber: boolean
  requireSpecialChar: boolean
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
}

export function getPasswordPolicy(): PasswordPolicy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_POLICY
    const data = JSON.parse(raw)
    const p = data?.passwordPolicy
    if (!p) return DEFAULT_POLICY
    return {
      minLength: Number(p.minLength) || 8,
      requireUppercase: !!p.requireUppercase,
      requireNumber: !!p.requireNumber,
      requireSpecialChar: !!p.requireSpecialChar,
    }
  } catch {
    return DEFAULT_POLICY
  }
}

export function validatePasswordAgainstPolicy(password: string): string[] {
  const policy = getPasswordPolicy()
  const errors: string[] = []
  if (password.length < policy.minLength) {
    errors.push(`At least ${policy.minLength} characters`)
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter')
  }
  if (policy.requireNumber && !/\d/.test(password)) {
    errors.push('One number')
  }
  if (policy.requireSpecialChar && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('One special character')
  }
  return errors
}
