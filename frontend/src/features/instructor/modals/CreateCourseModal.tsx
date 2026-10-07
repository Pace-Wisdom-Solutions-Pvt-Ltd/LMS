// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { addCourse } from '../store'

interface CreateCourseModalProps {
  onClose: () => void
  onCreated: (courseId: string) => void
}

export default function CreateCourseModal({
  onClose,
  onCreated,
}: CreateCourseModalProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [summary, setSummary] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    const course = addCourse({ name: name.trim(), code: code.trim(), summary: summary.trim() })
    onCreated(course.id)
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
        <h3 className="text-base font-semibold text-slate-800 mb-4 pr-8">Create Project</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="course-name" className="block text-sm font-medium text-slate-700 mb-1">Project name</label>
            <input
              id="course-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. API Integration Sprint"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="course-code" className="block text-sm font-medium text-slate-700 mb-1">Project code</label>
            <input
              id="course-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. API-01"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="course-summary" className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
            <textarea
              id="course-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
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
