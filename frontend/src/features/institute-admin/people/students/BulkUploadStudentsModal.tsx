// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, type SyntheticEvent } from 'react'
import { AlertCircle, ClipboardPaste, Upload } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Dropdown from '@/components/ui/Dropdown'
import Button from '@/components/ui/Button'
import { showToast } from '@/lib/toastApi'
import { addStudentApi } from '@/lib/api/organizations'
import FileDropZone from '../components/FileDropZone'
import { parseAndValidateCsv, type CsvParseResult } from './studentsCsv'
import type { BatchOption } from './types'

const SAMPLE_CSV_ROWS = [
  'email,first_name,last_name,phone_number,student_id',
  'john@example.com,John,Doe,9876543210,ST001',
  'jane@example.com,Jane,Smith,9876543211,ST002',
].join('\n')
const SAMPLE_CSV = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV_ROWS)}`

function CsvSummary({ result }: Readonly<{ result: CsvParseResult }>) {
  const { valid, errors } = result
  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
            <AlertCircle className="h-4 w-4" />
            Error Report ({errors.length} issue{errors.length !== 1 ? 's' : ''})
          </div>
          <ul className="text-sm text-amber-800 space-y-1 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((e) => (
              <li key={`row-${e.row}-${e.message}`}>{e.message}</li>
            ))}
            {errors.length > 10 && <li className="text-amber-600">...and {errors.length - 10} more</li>}
          </ul>
        </div>
      )}
      {valid.length > 0 && errors.length === 0 && (
        <p className="text-sm text-emerald-600 font-medium">Validated: {valid.length} student{valid.length !== 1 ? 's' : ''} ready to upload</p>
      )}
      {valid.length > 0 && errors.length > 0 && (
        <p className="text-sm text-slate-600">{valid.length} valid row{valid.length !== 1 ? 's' : ''}. Fix errors above to upload.</p>
      )}
    </div>
  )
}

export default function BulkUploadStudentsModal({
  open,
  onClose,
  orgId,
  batches,
  fallbackBatchId,
  onUploaded,
}: Readonly<{
  open: boolean
  onClose: () => void
  orgId: string
  batches: BatchOption[]
  fallbackBatchId: string
  onUploaded: (batchNum: number) => void
}>) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [batchId, setBatchId] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)

  const resetInputs = () => {
    setCsvFile(null)
    setPasteText('')
    setParseResult(null)
  }

  const handleClose = () => {
    resetInputs()
    onClose()
  }

  const handleFileChange = async (file: File | null) => {
    setParseResult(null)
    setCsvFile(file)
    if (!file) return
    try {
      setParseResult(parseAndValidateCsv(await file.text()))
    } catch {
      showToast('Failed to read CSV file.', 'error')
    }
  }

  const handlePasteChange = (text: string) => {
    setPasteText(text)
    setParseResult(text.trim() ? parseAndValidateCsv(text) : null)
  }

  const canUpload = Boolean(parseResult && parseResult.valid.length > 0 && parseResult.errors.length === 0)

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!parseResult || !canUpload || !orgId) return
    const targetBatchId = batchId || fallbackBatchId || batches[0]?.id
    if (!targetBatchId) {
      showToast('Please select a batch for bulk upload.', 'warning')
      return
    }
    const batchNum = Number(targetBatchId)
    try {
      await addStudentApi(orgId, {
        students: parseResult.valid.map((r) => ({
          email: r.email,
          first_name: r.firstName,
          last_name: r.lastName,
          student_id: r.studentId,
          batch_ids: Number.isNaN(batchNum) ? undefined : [batchNum],
        })),
      })
      showToast(`${parseResult.valid.length} student(s) uploaded.`, 'success')
      resetInputs()
      setBatchId('')
      onUploaded(batchNum)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk upload failed.', 'error')
    }
  }

  const modeButtonClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
      active ? 'border-brand-teal bg-brand-teal/10 text-brand-teal' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
    }`

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-lg">
      <h2 className="text-base font-bold text-slate-800 mb-4">Bulk Upload Students</h2>
      <p className="text-sm text-slate-600 mb-3">Columns: email, first_name, last_name, phone_number, student_id.</p>
      <a href={SAMPLE_CSV} download="students_template.csv" className="text-xs text-brand-teal hover:underline font-medium mb-4 inline-block">
        Download sample CSV
      </a>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => { setMode('upload'); resetInputs() }} className={modeButtonClass(mode === 'upload')}>
          <Upload className="h-4 w-4" />
          CSV Upload
        </button>
        <button type="button" onClick={() => { setMode('paste'); resetInputs() }} className={modeButtonClass(mode === 'paste')}>
          <ClipboardPaste className="h-4 w-4" />
          CSV Paste
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'upload' ? (
          <FileDropZone
            file={csvFile}
            onFileChange={handleFileChange}
            accept=".csv"
            idleTitle="Upload CSV File"
            idleHint="Click to choose a .csv file"
          />
        ) : (
          <div>
            <label htmlFor="bulk-paste-csv" className="block text-sm font-medium text-slate-700 mb-1.5">Paste CSV data</label>
            <textarea
              id="bulk-paste-csv"
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="email, first_name, last_name, phone_number, student_id&#10;john@example.com, John, Doe, 9876543210, ST001"
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none font-mono text-sm"
            />
          </div>
        )}

        {parseResult && <CsvSummary result={parseResult} />}

        <div className="grid grid-cols-2 gap-4">
          <Dropdown
            label="Default Batch"
            value={batchId}
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
            onChange={setBatchId}
            placeholder="Select batch"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={!canUpload}>
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  )
}
