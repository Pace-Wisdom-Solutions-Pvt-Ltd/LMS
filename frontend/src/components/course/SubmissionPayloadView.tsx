// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { ExternalLink, FileText } from 'lucide-react'
import { toAbsUrl } from '@/lib/format'

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(url)
}

function isPdfUrl(url: string) {
  return /\.pdf(\?.*)?$/i.test(url)
}

function looksLikeUrl(text: string) {
  return /^https?:\/\//i.test(text.trim())
}

/**
 * Normalize a raw task-submission payload into a display string and, when present,
 * an openable URL. Handles bare URLs as well as JSON payloads like
 * `{"link":"https://..."}` (or `url`) emitted by link/task submissions.
 */
function parseSubmissionPayload(raw: string): { text: string | null; url: string | null } {
  const trimmed = raw.trim()
  if (!trimmed) return { text: null, url: null }
  if (looksLikeUrl(trimmed)) return { text: trimmed, url: trimmed }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>
        const candidate = obj.link ?? obj.url
        if (typeof candidate === 'string' && looksLikeUrl(candidate)) {
          return { text: candidate, url: candidate }
        }
      }
    } catch {
      /* fall through to plain text */
    }
  }
  return { text: trimmed, url: null }
}

/** Stringify an arbitrary submission payload so it can be parsed for display. */
function stringifyPayload(payload: unknown): string {
  if (payload == null) return ''
  return typeof payload === 'string' ? payload : JSON.stringify(payload)
}

interface SubmissionPayloadViewProps {
  /** Raw payload as returned by the API — string, JSON object, or null. */
  payload?: unknown
  /** Uploaded file URL; may be relative. */
  fileUrl?: string | null
  /** Height class for the inline image/PDF preview. */
  previewHeight?: string
  className?: string
}

/**
 * Renders whatever a learner submitted for a task: a text answer, a link, and
 * an inline preview of the uploaded file (image, PDF, or a download link).
 */
export default function SubmissionPayloadView({
  payload,
  fileUrl,
  previewHeight = 'max-h-72',
  className = '',
}: Readonly<SubmissionPayloadViewProps>) {
  const resolvedFile = toAbsUrl(fileUrl)
  const { text, url } = parseSubmissionPayload(stringifyPayload(payload))

  if (!text && !resolvedFile) {
    return <p className="text-xs italic text-slate-400">Nothing was submitted for this task.</p>
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 break-all text-xs font-medium text-brand-teal hover:underline"
        >
          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
          {url}
        </a>
      )}

      {!url && text && (
        <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
          {text}
        </p>
      )}

      {resolvedFile && isImageUrl(resolvedFile) && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <img src={resolvedFile} alt="Submitted" className={`w-full ${previewHeight} object-contain`} />
          <div className="flex justify-end border-t border-slate-100 px-3 py-2">
            <a
              href={resolvedFile}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-teal hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open full size
            </a>
          </div>
        </div>
      )}

      {resolvedFile && isPdfUrl(resolvedFile) && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <iframe src={resolvedFile} title="Submitted PDF" className={`w-full ${previewHeight} h-72`} />
          <div className="flex justify-end border-t border-slate-100 px-3 py-2">
            <a
              href={resolvedFile}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-teal hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open PDF
            </a>
          </div>
        </div>
      )}

      {resolvedFile && !isImageUrl(resolvedFile) && !isPdfUrl(resolvedFile) && (
        <a
          href={resolvedFile}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <FileText className="h-3.5 w-3.5 text-indigo-400" />
          Download submitted file
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>
      )}
    </div>
  )
}
