// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { isValidEmail } from '@/lib/validation'

export type CsvStudent = {
  firstName: string
  lastName: string
  email: string
  studentId?: string
}

export type CsvParseResult = {
  valid: CsvStudent[]
  errors: { row: number; message: string }[]
}

function stripOuterDoubleQuotes(value: string): string {
  const s = value.trim()
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1)
  if (s.startsWith('"')) return s.slice(1)
  if (s.endsWith('"')) return s.slice(0, -1)
  return s
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map(stripOuterDoubleQuotes)
}

type ColumnMap = { email: number; first: number; last: number; studentId: number }

/**
 * Resolve column indices from the header row, or fall back to positional order
 * (email, first_name, last_name, student_id) when no header is present.
 */
function resolveColumns(headerParts: string[]): { columns: ColumnMap; hasHeader: boolean } {
  const hasHeader = headerParts.some((h) =>
    ['email', 'first_name', 'last_name', 'firstname', 'lastname'].includes(h),
  )
  if (!hasHeader) {
    return { columns: { email: 0, first: 1, last: 2, studentId: 3 }, hasHeader: false }
  }

  const columns: ColumnMap = { email: -1, first: -1, last: -1, studentId: -1 }
  headerParts.forEach((h, i) => {
    if (h === 'email') columns.email = i
    else if (['first_name', 'firstname', 'first name'].includes(h)) columns.first = i
    else if (['last_name', 'lastname', 'last name'].includes(h)) columns.last = i
    else if (['student_id', 'studentid', 'student id'].includes(h)) columns.studentId = i
  })
  return { columns, hasHeader: true }
}

/**
 * Parse pasted / uploaded CSV text into validated student rows plus per-row
 * errors. Rows missing required fields, with invalid emails, or duplicate
 * emails are reported rather than dropped silently.
 */
export function parseAndValidateCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const errors: CsvParseResult['errors'] = []
  const valid: CsvStudent[] = []
  const seenEmails = new Set<string>()

  if (lines.length === 0) return { valid, errors }

  const headerParts = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const { columns, hasHeader } = resolveColumns(headerParts)

  const cellAt = (parts: string[], index: number) => (index >= 0 ? parts[index]?.trim() ?? '' : '')

  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const rowNum = i + 1
    const parts = parseCsvLine(lines[i])
    const firstName = cellAt(parts, columns.first)
    const lastName = cellAt(parts, columns.last)
    const email = cellAt(parts, columns.email).toLowerCase()
    const studentId = cellAt(parts, columns.studentId) || undefined

    if (!firstName || !lastName || !email) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: Missing required fields (email, first_name, last_name)` })
      continue
    }
    if (!isValidEmail(email)) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: Invalid email "${email}"` })
      continue
    }
    if (seenEmails.has(email)) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: Duplicate email "${email}"` })
      continue
    }
    seenEmails.add(email)
    valid.push({ firstName, lastName, email, studentId })
  }

  return { valid, errors }
}
