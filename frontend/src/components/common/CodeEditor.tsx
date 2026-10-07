// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useMemo, type ClipboardEvent, type DragEvent } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import { showToast } from '@/lib/toastApi'

// Languages — only the five we officially support
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'

export type CodeLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'sql'

const LANG_LABEL: Record<CodeLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
  sql: 'SQL',
}

const PRISM_GRAMMAR: Record<CodeLanguage, Prism.Grammar> = {
  python: Prism.languages.python,
  javascript: Prism.languages.javascript,
  java: Prism.languages.java,
  cpp: Prism.languages.cpp,
  sql: Prism.languages.sql,
}

type CodeEditorProps = Readonly<{
  value: string
  onChange: (value: string) => void
  language: string
  placeholder?: string
  readOnly?: boolean
  ariaLabel?: string
  minHeight?: number
  /** Block copy / cut / paste / drag-drop (e.g. proctored assessments). */
  preventCopyPaste?: boolean
}>

function normalizeLanguage(raw: string): CodeLanguage {
  const v = raw.toLowerCase().trim()
  if (v === 'c++' || v === 'cpp' || v === 'cplusplus') return 'cpp'
  if (v === 'java') return 'java'
  if (v === 'sql' || v === 'mysql' || v === 'postgres' || v === 'postgresql') return 'sql'
  if (v === 'javascript' || v === 'js' || v === 'typescript' || v === 'ts') return 'javascript'
  return 'python'
}

export default function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  ariaLabel = 'Code editor',
  minHeight = 320,
  preventCopyPaste = false,
}: CodeEditorProps) {
  const lang = useMemo(() => normalizeLanguage(language), [language])
  const grammar = PRISM_GRAMMAR[lang]

  const lineCount = useMemo(() => (value.match(/\n/g)?.length ?? 0) + 1, [value])
  const gutterDigits = String(lineCount).length

  const blockClipboard = (e: ClipboardEvent | DragEvent) => {
    if (!preventCopyPaste) return
    e.preventDefault()
    showToast('Copy and paste are disabled during the assessment.', 'error')
  }

  return (
    <div
      className="relative rounded-xl border border-slate-700 bg-[#1e1e1e] overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/30"
      onCopy={preventCopyPaste ? blockClipboard : undefined}
      onCut={preventCopyPaste ? blockClipboard : undefined}
      onPaste={preventCopyPaste ? blockClipboard : undefined}
      onDrop={preventCopyPaste ? blockClipboard : undefined}
    >
      {/* Top bar */}
      <div className="flex items-center justify-end px-3 py-1.5 bg-[#252526] border-b border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {LANG_LABEL[lang]}
        </span>
      </div>

      <div className="flex" style={{ minHeight }}>
        {/* Line numbers gutter */}
        <div
          aria-hidden
          className="select-none bg-[#1e1e1e] text-right font-mono text-xs leading-6 py-3 px-2 border-r border-slate-800 text-slate-600"
          style={{ minWidth: `${gutterDigits + 1.5}ch` }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto code-editor-host">
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={(code) => Prism.highlight(code, grammar, lang)}
            padding={12}
            tabSize={4}
            insertSpaces
            disabled={readOnly}
            placeholder={placeholder}
            textareaClassName="code-editor-textarea"
            preClassName="code-editor-pre"
            textareaId={ariaLabel}
            style={{
              fontFamily: '"Fira Code", "Consolas", "Courier New", monospace',
              fontSize: 14,
              lineHeight: '1.5rem',
              minHeight,
              outline: 'none',
              color: '#d4d4d4',
              caretColor: '#fff',
            }}
          />
        </div>
      </div>
    </div>
  )
}
