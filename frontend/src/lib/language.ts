// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/** Display names for the language keys the coding/judge APIs use (`python`, `cpp`, …). */
const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  sql: 'SQL',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
  kotlin: 'Kotlin',
  swift: 'Swift',
}

/**
 * Human-readable name for a backend language key. Unknown keys fall back to
 * their uppercased form so a new backend language still reads sensibly.
 */
export function languageLabel(language: string | null | undefined): string {
  const key = (language ?? '').trim().toLowerCase()
  if (!key) return 'Code'
  return LANGUAGE_LABELS[key] ?? key.toUpperCase()
}
