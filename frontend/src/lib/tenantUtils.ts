// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'

export function resolveOrgLogoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed
  }
  const baseUrl = config.api.baseUrl || ''
  try {
    const origin = typeof window !== 'undefined' ? new URL(baseUrl, window.location.origin).origin : 'http://localhost'
    return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
  } catch {
    return trimmed
  }
}
