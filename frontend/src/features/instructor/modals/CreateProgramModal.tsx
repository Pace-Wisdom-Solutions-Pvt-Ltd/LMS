// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { addProgram } from '../store'

interface CreateProgramModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function CreateProgramModal({
  onClose,
  onCreated,
}: CreateProgramModalProps) {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addProgram({ name: name.trim(), summary: summary.trim() })
    onCreated()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pr-8">
          Create Program
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="program-name" className="block text-sm font-medium text-slate-700 mb-1">
              Program name
            </label>
            <input
              id="program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Advanced JavaScript"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="program-summary" className="block text-sm font-medium text-slate-700 mb-1">
              Summary
            </label>
            <textarea
              id="program-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 transition-opacity active:scale-[0.99]"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
