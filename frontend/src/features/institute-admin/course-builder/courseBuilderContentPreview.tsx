// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Play } from 'lucide-react'
import { getYouTubeId } from './courseBuilderHelpers'
import type { ApiNodeInfo } from './courseBuilderProgramHelpers'
import type { ProgramResource } from '../store'

const PREVIEW_BOX =
  'w-[132px] sm:w-[152px] h-[82px] sm:h-[92px] rounded-xl overflow-hidden border border-slate-200 shrink-0'

// These are render helpers (returning JSX), not standalone components — both
// public previews compose them so the video/pdf/doc markup lives in one place.

function videoThumb(url: string, title: string, thumb: string | null, badge?: string): ReactNode {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`relative ${PREVIEW_BOX} bg-white group`} title="Open content">
      {thumb ? (
        <img src={thumb} alt={`${title} thumbnail`} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-[12px] font-semibold">
          Video
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/10 to-transparent opacity-90" />
      {badge ? (
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-700">
            {badge}
          </span>
        </div>
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow-sm ring-1 ring-black/5 group-hover:scale-105 transition-transform">
          <Play className="h-5 w-5 text-slate-800 translate-x-px" fill="currentColor" />
        </span>
      </div>
    </a>
  )
}

function pdfThumb(url: string, title: string): ReactNode {
  return (
    <div className={`${PREVIEW_BOX} bg-white`}>
      {/* Some servers block embedding; still show a preview attempt. */}
      <iframe src={url} title={`${title} preview`} className="w-full h-full" />
    </div>
  )
}

function docThumb(url: string): ReactNode {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`${PREVIEW_BOX} bg-slate-50 flex items-center justify-center text-slate-600 text-[12px] font-semibold`}
      title="Open document"
    >
      DOC
    </a>
  )
}

/** Thumbnail/preview for a locally-queued resource (link, video, pdf, doc). */
export function renderLocalResourcePreview(r: ProgramResource): ReactNode {
  const yid = getYouTubeId(r.url)
  const isYouTube = r.type === 'youtube' || (r.type === 'link' && !!yid)
  const thumb = isYouTube && yid ? `https://img.youtube.com/vi/${yid}/mqdefault.jpg` : null

  if (r.type === 'video' || isYouTube) return videoThumb(r.url, r.title, thumb, isYouTube ? 'YouTube Video' : 'Video')
  if (r.type === 'pdf') return pdfThumb(r.url, r.title)
  return null
}

/** Thumbnail/preview for a saved API node, driven by its resolved {@link ApiNodeInfo}. */
export function renderApiNodePreview(info: ApiNodeInfo, title: string): ReactNode {
  if (info.showVideo && info.effectiveUrl) return videoThumb(info.effectiveUrl, title, info.thumb)
  if (info.inferred === 'pdf' && info.effectiveUrl) return pdfThumb(info.effectiveUrl, title)
  if ((info.inferred === 'doc' || info.inferred === 'document') && info.effectiveUrl) return docThumb(info.effectiveUrl)
  return null
}
