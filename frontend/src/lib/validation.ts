// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/* ── Shared validation helpers ── */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim())
}

/** Exactly 10 numeric digits (strips non-digits first) */
export function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length === 10
}

/* ── File validation ── */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_CSV_XLSX_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const CSV_XLSX_EXT_RE = /\.(csv|xls|xlsx)$/i

const IMAGE_MAX_BYTES    = 2 * 1024 * 1024     // 2 MB
const CSV_MAX_BYTES      = 2 * 1024 * 1024     // 2 MB
const TASK_MAX_BYTES     = 20 * 1024 * 1024    // 20 MB
const RESOURCE_MAX_BYTES = 100 * 1024 * 1024   // 100 MB

const BLOCKED_EXTS_RE = /\.(exe|dll|bat|sh|cmd|msi|apk|dmg|vbs|ps1|jar)$/i

/** Returns an error string or null if valid */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, or WebP images are allowed.'
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return 'Image must be under 2 MB.'
  }
  return null
}

export function validateCsvXlsxFile(file: File): string | null {
  const typeOk = ALLOWED_CSV_XLSX_TYPES.includes(file.type) || CSV_XLSX_EXT_RE.test(file.name)
  if (!typeOk) {
    return 'Only CSV, XLS, or XLSX files are allowed.'
  }
  if (file.size > CSV_MAX_BYTES) {
    return 'File must be under 2 MB.'
  }
  return null
}

export function validateTaskAttachment(file: File): string | null {
  if (BLOCKED_EXTS_RE.test(file.name)) {
    return 'This file type is not allowed as a task attachment.'
  }
  if (file.size > TASK_MAX_BYTES) {
    return 'Attachment must be under 20 MB.'
  }
  return null
}

/** Learning-material content file (PDF/document/video) attached to a course node. */
export function validateResourceContentFile(file: File): string | null {
  if (BLOCKED_EXTS_RE.test(file.name)) {
    return 'This file type is not allowed as content.'
  }
  if (file.size > RESOURCE_MAX_BYTES) {
    return 'Content file must be under 100 MB.'
  }
  return null
}
