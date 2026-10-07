// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, type SyntheticEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Dropdown from '@/components/ui/Dropdown'
import Button from '@/components/ui/Button'
import { showToast } from '@/lib/toastApi'
import { bulkUploadStaffApi } from '@/lib/api/organizations'
import FileDropZone from '../components/FileDropZone'
import type { BatchOption } from './types'

const SAMPLE_CSV_ROWS = [
  'email,first_name,last_name,phone_number',
  'john@example.com,John,Doe,9876543210',
  'jane@example.com,Jane,Smith,9876543211',
].join('\n')
const SAMPLE_CSV = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV_ROWS)}`

export default function BulkUploadTrainersModal({
  open,
  onClose,
  orgId,
  batches,
  onUploaded,
}: Readonly<{
  open: boolean
  onClose: () => void
  orgId: string
  batches: BatchOption[]
  onUploaded: () => void
}>) {
  const [file, setFile] = useState<File | null>(null)
  const [batchId, setBatchId] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleClose = () => {
    setFile(null)
    setBatchId('')
    onClose()
  }

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!orgId || !file) return
    setUploading(true)
    try {
      await bulkUploadStaffApi(orgId, file, 'teacher', batchId ? Number(batchId) : undefined)
      showToast('Trainers uploaded successfully.', 'success')
      handleClose()
      onUploaded()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-1">Bulk Upload Trainers</h2>
      <p className="text-xs text-slate-500 mb-1">
        Accepted columns: <span className="font-mono">email, first_name, last_name, phone_number</span>
      </p>
      <a href={SAMPLE_CSV} download="trainers_template.csv" className="text-xs text-brand-teal hover:underline font-medium mb-4 inline-block">
        Download sample CSV
      </a>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FileDropZone file={file} onFileChange={setFile} />

        <div className="grid grid-cols-2 gap-3">
          <Dropdown
            label="Default Batch"
            value={batchId}
            options={[{ value: '', label: 'None' }, ...batches.map((b) => ({ value: b.id, label: b.name }))]}
            onChange={setBatchId}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={!file} loading={uploading} loadingText="Uploading…">
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  )
}
