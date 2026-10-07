// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useRef } from 'react'
import { FileUp } from 'lucide-react'
import { validateCsvXlsxFile } from '@/lib/validation'
import { showToast } from '@/lib/toastApi'

/**
 * Click-to-upload drop zone for CSV/XLSX files, shared by the trainer and
 * student bulk-upload modals. Validates the file type before surfacing it.
 */
export default function FileDropZone({
  file,
  onFileChange,
  accept = '.csv,.xlsx,.xls',
  idleTitle = 'Click to upload CSV, XLSX or XLS',
  idleHint = 'Supports CSV, Excel files',
}: Readonly<{
  file: File | null
  onFileChange: (file: File | null) => void
  accept?: string
  idleTitle?: string
  idleHint?: string
}>) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (selected: File | null) => {
    if (selected) {
      const err = validateCsvXlsxFile(selected)
      if (err) {
        showToast(err, 'warning')
        if (inputRef.current) inputRef.current.value = ''
        return
      }
    }
    onFileChange(selected)
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
        file ? 'border-brand-teal/50 bg-brand-teal/5' : 'border-slate-200 bg-slate-50 hover:border-brand-teal/40 hover:bg-brand-teal/5'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
      />
      <FileUp className="h-8 w-8 text-brand-teal/60" />
      {file ? (
        <>
          <p className="text-sm font-semibold text-slate-800">{file.name}</p>
          <p className="text-xs text-slate-400">Click to choose another file</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-600">{idleTitle}</p>
          <p className="text-xs text-slate-400">{idleHint}</p>
        </>
      )}
    </button>
  )
}
