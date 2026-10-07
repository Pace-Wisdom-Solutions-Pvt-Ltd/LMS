// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Tiny dependency-free CSV helpers. Handles quoted fields, escaped quotes
 * (`""`), and CRLF/LF line endings — enough for admin-authored spreadsheets
 * exported as CSV. For true binary `.xlsx` parsing you'd need a library (e.g.
 * SheetJS); ask users to "Save As CSV" instead.
 */

/** Parse CSV text into a matrix of trimmed rows (blank rows dropped). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell !== ''))
}

/** Quote a value for CSV output when it contains a comma, quote, or newline. */
function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** Build CSV text from a matrix of rows. */
export function buildCsv(rows: Array<Array<string | number>>): string {
  return rows.map((r) => r.map((c) => escapeCell(String(c))).join(',')).join('\r\n')
}

/** Trigger a client-side download of CSV text as a file. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
