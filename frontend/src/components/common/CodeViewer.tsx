// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Check, Copy, FileCode2 } from 'lucide-react'
import { showToast } from '@/lib/toastApi'
import { languageLabel } from '@/lib/language'

interface CodeViewerProps {
  /** The source to display. Rendered verbatim — no execution, no editing. */
  code: string
  /** Language key (e.g. `python`); shown as a label and used for the a11y name. */
  language?: string
  /** Optional caption on the left of the toolbar, replacing the language chip. */
  title?: string
  /** Show a gutter with line numbers. */
  showLineNumbers?: boolean
  /** Max height class for the scroll area, e.g. `max-h-80`. */
  maxHeight?: string
}

/**
 * Read-only source-code panel: language chip, copy-to-clipboard, optional line
 * numbers, dark scrollable body.
 *
 * Use this anywhere code needs to be *read* (submissions, results, examples);
 * reach for `CodeBlock` only when the user must edit and run code.
 */
export default function CodeViewer({
  code,
  language,
  title,
  showLineNumbers = true,
  maxHeight = 'max-h-80',
}: Readonly<CodeViewerProps>) {
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast('Could not copy the code.', 'error')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 bg-slate-800 px-3 py-1.5">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          <FileCode2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{title ?? languageLabel(language)}</span>
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>

      <div className={`overflow-auto ${maxHeight}`}>
        {code.trim() === '' ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">No code submitted.</p>
        ) : (
          <pre className="flex min-w-full p-0 font-mono text-xs leading-relaxed">
            {showLineNumbers && (
              <span
                aria-hidden="true"
                className="shrink-0 select-none border-r border-slate-700/60 bg-slate-800/40 px-2.5 py-3 text-right text-slate-500"
              >
                {lines.map((_, i) => `${i + 1}\n`).join('')}
              </span>
            )}
            <code className="block flex-1 px-3 py-3 text-slate-100">{code}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
