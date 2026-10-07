// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, type SyntheticEvent } from 'react'
import { Download, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FileDropZone from '@/features/institute-admin/people/components/FileDropZone'
import { showToast } from '@/lib/toastApi'
import { saveBlob } from '@/lib/download'
import {
  bulkUploadStudentsFileApi,
  downloadStudentBulkUploadTemplateApi,
} from '@/lib/api/organizations'

/**
 * Bulk-assign existing students to a batch: download the server-provided Excel
 * template, fill it in, then upload it. Used from the batch detail page.
 */
export default function BulkUploadBatchStudentsModal({
  open,
  onClose,
  orgId,
  batchId,
  onUploaded,
}: Readonly<{
  open: boolean
  onClose: () => void
  orgId: string
  batchId: string
  onUploaded: () => void
}>) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleClose = () => {
    if (uploading) return
    setFile(null)
    onClose()
  }

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const blob = await downloadStudentBulkUploadTemplateApi(orgId, batchId)
      saveBlob(blob, 'student_bulk_upload_template.xlsx')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to download template.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    try {
      await bulkUploadStudentsFileApi(orgId, batchId, file)
      showToast('Students assigned to batch successfully.', 'success')
      setFile(null)
      onClose()
      onUploaded()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-1">Bulk Assign Students</h2>
      <p className="text-xs text-slate-500 mb-4">
        Download the template, fill in existing student details, then upload the file to assign
        them to this batch.
      </p>

      <button
        type="button"
        onClick={handleDownloadTemplate}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 text-xs text-brand-teal hover:underline font-medium mb-4 disabled:opacity-60"
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {downloading ? 'Preparing template…' : 'Download Excel template'}
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FileDropZone file={file} onFileChange={setFile} />

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" fullWidth onClick={handleClose} disabled={uploading}>
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
