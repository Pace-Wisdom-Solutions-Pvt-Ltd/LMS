// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'

export type CourseStatus = 'draft' | 'published'

export function toCourseStatus(status: unknown): CourseStatus {
  return String(status).toLowerCase() === 'published' ? 'published' : 'draft'
}

export function getYouTubeId(url: string): string | null {
  const raw = url.trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '')
      return id || null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/').filter(Boolean)
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1]
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1]
    }
  } catch {
    // ignore
  }
  const match = raw.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,})/)
  return match?.[1] ?? null
}

export function toAbsoluteContentUrl(url: string): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) return raw
  if (raw.startsWith('/')) return `${config.api.baseUrl}${raw}`
  return raw
}

export function buildQuestionsInputJson(
  draftQuestions: Array<{ text: string; options: string[]; correctIndices: number[]; multiSelect?: boolean }>
): string {
  const OPTION_LETTERS = 'abcdefghijklmnopqrstuvwxyz'
  const items = draftQuestions.map((dq) => {
    const filled = dq.options.map((t) => t.trim()).filter(Boolean)
    const filledIndices = dq.options.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0)
    const letters = dq.correctIndices
      .map((ci) => OPTION_LETTERS[filledIndices.indexOf(ci)])
      .filter(Boolean)
    const correct_option = letters.join(',')
    return {
      question_text: dq.text.trim(),
      option_a: filled[0] ?? '',
      option_b: filled[1] ?? '',
      option_c: filled[2] ?? '',
      option_d: filled[3] ?? '',
      extra_options: filled.slice(4),
      correct_option,
      allow_multiple_correct: dq.multiSelect ?? false,
    }
  })
  return JSON.stringify(items)
}
