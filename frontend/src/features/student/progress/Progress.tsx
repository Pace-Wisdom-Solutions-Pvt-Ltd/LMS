// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import { getStoredOrganizations } from '@/lib/auth'
import {
  getMyProgressApi,
  type ApiMyProgress,
} from '@/lib/api/organizations'
import {
  getCertificatesApi,
  getCertificateDownloadUrl,
  type ApiCertificate,
} from '@/lib/api/certificates'
import { TrendingUp, Loader2, Award, Eye, Download } from 'lucide-react'
import CertificateModal from '@/components/certificate/CertificateModal'

function extractProgressRows(data: ApiMyProgress) {
  return data.batches.flatMap((b) =>
    b.courses.map((c) => ({ title: c.title, pct: Math.round(c.completion_percentage) }))
  )
}

function formatDate(isoStr: string) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function StudentProgress() {
  const orgs = getStoredOrganizations()
  const orgId = orgs[0]?.id?.toString() ?? ''

  const [overallPct, setOverallPct] = useState(0)
  const [courseBreakdown, setCourseBreakdown] = useState<{ title: string; pct: number }[]>([])
  const [loadingProgress, setLoadingProgress] = useState(true)

  // Certificates state
  const [certificates, setCertificates] = useState<ApiCertificate[]>([])
  const [loadingCertificates, setLoadingCertificates] = useState(true)
  const [selectedCert, setSelectedCert] = useState<ApiCertificate | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [autoDownload, setAutoDownload] = useState(false)

  useEffect(() => {
    if (!orgId) return
    getMyProgressApi(orgId)
      .then((data) => {
        setOverallPct(Math.round(data.overall_completion_percentage))
        setCourseBreakdown(extractProgressRows(data))
      })
      .catch(() => {})
      .finally(() => setLoadingProgress(false))

    getCertificatesApi(orgId)
      .then((data) => {
        setCertificates(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => setLoadingCertificates(false))
  }, [orgId])

  const handleView = (cert: ApiCertificate) => {
    setSelectedCert(cert)
    setAutoDownload(false)
    setModalOpen(true)
  }

  const handleDownload = (cert: ApiCertificate) => {
    const downloadUrl = cert.download_url || getCertificateDownloadUrl(cert.certificate_id)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `certificate_${cert.certificate_id}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">My Learning Progress</h1>
        <p className="text-slate-600 text-xs mt-1">Overall completion and course-wise breakdown</p>
      </div>

      {/* ── Progress cards ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-teal" />
            Overall Progress
          </h3>
          {loadingProgress ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center shrink-0"
                style={{
                  border: `8px solid`,
                  borderColor: `rgba(20,184,166,${Math.max(0.15, overallPct / 100)})`,
                }}
              >
                <span className="text-xl font-bold text-slate-800">{overallPct}%</span>
              </div>
              <p className="text-sm text-slate-600">Completion across all courses</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Course-wise Breakdown</h3>
          {loadingProgress && (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            </div>
          )}
          {!loadingProgress && courseBreakdown.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No course data available.</p>
          )}
          {!loadingProgress && courseBreakdown.length > 0 && (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {courseBreakdown.map((c) => (
                <div key={c.title}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-800 truncate">{c.title}</span>
                    <span className="text-slate-600 shrink-0 ml-2">{c.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-brand-teal rounded-full transition-all"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── My Certificates Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-brand-teal" />
              <h2 className="text-lg font-bold text-slate-800">My Certificates</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-teal/10 text-brand-teal">
                {certificates.length}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1">Your earned certificates for completed courses</p>
          </div>
        </div>

        {/* Certificates Grid */}
        {loadingCertificates ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No certificates earned yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Complete all lessons, quizzes, and trainer-reviewed tasks to unlock and download your certificate of completion.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl border border-slate-200/90 hover:border-brand-teal/40 bg-white transition-all shadow-sm hover:shadow flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-brand-teal" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm md:text-base leading-snug line-clamp-2">
                      {cert.course?.title || 'Course Completion'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(cert.issued_at)}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{cert.certificate_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleView(cert)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(cert)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-teal text-xs font-semibold text-white hover:bg-brand-teal/90 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Preview & Print Modal */}
      <CertificateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        certificate={selectedCert}
        autoDownload={autoDownload}
      />
    </div>
  )
}
