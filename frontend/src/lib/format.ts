// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'

/** Resolve a possibly-relative media/content URL returned by the API to an absolute one. */
export function toAbsUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('http') || raw.startsWith('blob:')) return raw
  return raw.startsWith('/') ? `${config.api.baseUrl}${raw}` : raw
}

/** Converts any string to Title Case: "john doe" → "John Doe", "ABY SUNNY" → "Aby Sunny" */
export function toTitleCase(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
