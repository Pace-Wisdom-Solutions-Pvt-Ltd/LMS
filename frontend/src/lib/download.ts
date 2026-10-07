// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Trigger a browser download of a binary Blob (e.g. an Excel template returned
 * by `apiGetBlob`). Use this for server-provided files; for client-generated CSV
 * text, use `downloadCsv` in `@/lib/csv`.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
