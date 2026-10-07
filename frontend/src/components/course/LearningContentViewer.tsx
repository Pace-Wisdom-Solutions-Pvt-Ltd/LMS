// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Eye, ExternalLink, FileText, Image as ImageIcon, Link2, BookOpen } from 'lucide-react'
import Modal from '@/components/ui/Modal'

/** How a piece of learning material should be presented. */
export type LearningContentKind = 'text' | 'image' | 'pdf' | 'link'

export interface LearningContent {
  /** Lowercased content type from the API (e.g. 'link', 'file', 'text', 'pdf'). */
  contentType: string
  /** Absolute URL to the resource. Empty for pure-text material. */
  url: string
  /** Inline text body, used when the material is text content. */
  text?: string
  /** Human-readable title, shown in the trigger card and modal header. */
  title: string
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|#|$)/i
const PDF_EXT = /\.pdf(\?|#|$)/i

/** Decide how a piece of content should render based on its type and URL. */
function resolveKind({ contentType, url, text }: LearningContent): LearningContentKind {
  if (contentType === 'text' || (!url && !!text)) return 'text'
  if (IMAGE_EXT.test(url) || contentType === 'image') return 'image'
  if (PDF_EXT.test(url) || contentType === 'pdf') return 'pdf'
  return 'link'
}

/**
 * Make a URL safe to embed. Browsers block `http://` resources inside an
 * `https://` page (mixed content), so upgrade the scheme when the app is served
 * securely. Top-level "open in new tab" links keep the original URL.
 */
function toEmbeddableUrl(url: string): string {
  if (globalThis.location?.protocol === 'https:' && url.startsWith('http://')) {
    return `https://${url.slice('http://'.length)}`
  }
  return url
}

/** Extract a clean hostname for display, e.g. "realpython.com". */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const KIND_META: Record<LearningContentKind, { label: string; Icon: typeof FileText }> = {
  text: { label: 'Reading', Icon: BookOpen },
  image: { label: 'Image', Icon: ImageIcon },
  pdf: { label: 'PDF Document', Icon: FileText },
  link: { label: 'External Resource', Icon: Link2 },
}

/**
 * Displays attached learning material for a course node: a compact trigger card
 * that opens the content inside a modal, with the option to open it in a new tab.
 */
export default function LearningContentViewer({ content }: { readonly content: LearningContent }) {
  const [open, setOpen] = useState(false)
  const kind = resolveKind(content)
  const { label, Icon } = KIND_META[kind]
  const domain = getDomain(content.url)
  const subtitle = kind === 'text' ? 'Tap to read the attached material' : domain || content.url

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-teal">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-800">{content.title || 'Learning Resource'}</p>
          {subtitle && <p className="truncate text-xs font-medium text-slate-400">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-brand-teal"
        >
          <Eye className="h-3.5 w-3.5" /> View content
        </button>
        {content.url && (
          <a
            href={content.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-600 transition-colors hover:border-brand-teal/40 hover:text-brand-teal"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
        )}
      </div>

      <LearningContentModal open={open} onClose={() => setOpen(false)} content={content} kind={kind} />
    </div>
  )
}

/** The full-screen modal that renders the content body. */
function LearningContentModal({ open, onClose, content, kind }: Readonly<{
  open: boolean
  onClose: () => void
  content: LearningContent
  kind: LearningContentKind
}>) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-4xl">
      <div className="flex items-start justify-between gap-3 pr-10">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-800">{content.title || 'Learning Resource'}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{KIND_META[kind].label}</p>
        </div>
        {content.url && (
          <a
            href={content.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-teal/40 hover:text-brand-teal"
          >
            <ExternalLink className="h-3.5 w-3.5" /> New tab
          </a>
        )}
      </div>

      <div className="mt-4">
        <ContentBody content={content} kind={kind} />
      </div>
    </Modal>
  )
}

/** Switches between the concrete renderers based on the resolved kind. */
function ContentBody({ content, kind }: Readonly<{ content: LearningContent; kind: LearningContentKind }>) {
  switch (kind) {
    case 'text':
      return <TextContent text={content.text ?? ''} />
    case 'image':
      return <ImageContent url={content.url} title={content.title} />
    default:
      return <EmbeddedContent url={content.url} title={content.title} />
  }
}

function TextContent({ text }: { readonly text: string }) {
  if (!text.trim()) {
    return <EmptyContent message="No text content was attached to this item." />
  }
  return (
    <div className="max-h-[70vh] overflow-y-auto rounded-xl bg-slate-50 p-5">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  )
}

function ImageContent({ url, title }: { readonly url: string; readonly title: string }) {
  return (
    <div className="flex max-h-[70vh] items-center justify-center overflow-y-auto rounded-xl bg-slate-50 p-4">
      <img src={toEmbeddableUrl(url)} alt={title} className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
    </div>
  )
}

function EmbeddedContent({ url, title }: {
  readonly url: string
  readonly title: string
}) {
  if (!url) {
    return <EmptyContent message="No resource is attached to this item." />
  }
  return (
    <div className="space-y-2">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
        If the preview stays blank, some sources block being embedded — use{' '}
        <span className="font-semibold">Open in new tab</span>.
      </p>
      <div className="h-[70vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <iframe
          src={toEmbeddableUrl(url)}
          title={title || 'Learning content'}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  )
}

function EmptyContent({ message }: { readonly message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-300">
        <FileText className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  )
}
