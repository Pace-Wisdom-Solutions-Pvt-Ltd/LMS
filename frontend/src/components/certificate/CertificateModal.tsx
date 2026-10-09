// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useRef, useEffect, useCallback } from 'react'
import { Download, Printer, X } from 'lucide-react'
import {
  type ApiCertificate,
  getCertificateDownloadUrl,
  getCertificatePreviewUrl,
} from '@/lib/api/certificates'

interface CertificateModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly certificate: ApiCertificate | null
  readonly autoDownload?: boolean
}

function formatCertificateDate(isoStr?: string) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

export function CertificateModal({
  open,
  onClose,
  certificate,
  autoDownload = false,
}: CertificateModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const studentName =
    certificate?.student?.full_name ||
    [certificate?.student?.first_name, certificate?.student?.last_name]
      .filter(Boolean)
      .join(' ') ||
    certificate?.student?.email ||
    'Student'

  const courseTitle = certificate?.course?.title || 'Training Program'
  const formattedDate =
    formatCertificateDate(certificate?.issued_at) ||
    formatCertificateDate(new Date().toISOString())

  const downloadUrl = certificate?.certificate_id
    ? certificate.download_url || getCertificateDownloadUrl(certificate.certificate_id)
    : ''

  const previewUrl = certificate?.certificate_id
    ? certificate.preview_url || getCertificatePreviewUrl(certificate.certificate_id)
    : ''

  const handleDownloadPdf = useCallback(async () => {
    if (!certificate) return

    // 1. Direct download of the official backend A4 Landscape PDF.
    // Guaranteed standard A4 (297mm x 210mm) vector output, completely independent of screen size.
    if (downloadUrl) {
      try {
        const res = await fetch(downloadUrl)
        if (res.ok) {
          const blob = await res.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = `certificate_${certificate.certificate_id}.pdf`
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.URL.revokeObjectURL(blobUrl)
          return
        }
      } catch (err) {
        console.warn('Backend PDF fetch failed, trying direct link navigation:', err)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `certificate_${certificate.certificate_id}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }
    }

    // 2. Client-side fallback if backend download is unreachable
    const doc = iframeRef.current?.contentDocument
    const certEl = (doc?.querySelector('.cert-outer-box') as HTMLElement) || doc?.body

    if (certEl) {
      try {
        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')

        const canvas = await html2canvas(certEl, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#f6efe6',
          logging: false,
        })

        const imgData = canvas.toDataURL('image/png')
        // Standard A4 landscape dimensions: 297mm x 210mm
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        })

        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210)
        pdf.save(`certificate_${certificate.certificate_id}.pdf`)
      } catch (err) {
        console.error('Client-side fallback PDF export failed:', err)
      }
    }
  }, [certificate, downloadUrl])

  const onDownloadClick = () => {
    void handleDownloadPdf().catch((err) => {
      console.error('Failed to download certificate:', err)
    })
  }

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
        return
      } catch {
        // Fallback to window.print if iframe cross-origin block
      }
    }
    window.print()
  }

  // Auto-download if triggered with autoDownload=true
  useEffect(() => {
    if (open && autoDownload && certificate) {
      void handleDownloadPdf().catch((err) => {
        console.error('Failed to auto-download certificate:', err)
      })
    }
  }, [open, autoDownload, certificate, handleDownloadPdf])

  if (!open || !certificate) return null

  return (
    <div
      id="printable-certificate-container"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 py-6 sm:py-8 print:p-0 print:bg-transparent print:static"
    >
      <div className="relative w-full max-w-3xl sm:max-w-4xl my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:max-w-none print:rounded-none">
        {/* Modal Toolbar (sticky and always visible) */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-6 py-3.5 bg-white border-b border-slate-100 print:hidden shadow-xs">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              Certificate of Achievement
            </h3>
            <p className="text-xs font-mono text-slate-400">
              {certificate.certificate_id}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onDownloadClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 bg-slate-50/50 print:p-0 print:bg-transparent">
          {/* ── Backend-Rendered HTML Template Preview Frame ── */}
          <div
            id="printable-certificate"
            className="w-full bg-[#f6efe6] rounded-xl shadow-md relative overflow-hidden select-none border-0 print:shadow-none print:rounded-none print:border-none"
            style={{
              aspectRatio: '1.414 / 1', // Standard A4 Landscape
              minHeight: '420px',
            }}
          >
            <iframe
              ref={iframeRef}
              title={`Certificate ${certificate.certificate_id}`}
              srcDoc={certificate.html_content || undefined}
              src={!certificate.html_content && previewUrl ? previewUrl : undefined}
              className="w-full h-full border-0 absolute inset-0 bg-[#f6efe6]"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>

          {/* ── 4 Metadata Info Cards (Below Certificate) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 print:hidden">
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                RECIPIENT
              </span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                {studentName}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                COURSE
              </span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                {courseTitle}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                ISSUED
              </span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                {formattedDate}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                CERT ID
              </span>
              <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5 truncate">
                {certificate.certificate_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificateModal
