// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Dropdown from '@/components/ui/Dropdown'
import type { ContentSection, CreateModulePayload, ModuleContentType } from '../store'

const CONTENT_TYPES: { value: ModuleContentType; label: string }[] = [
  { value: 'Video', label: 'Video' },
  { value: 'PDF', label: 'PDF' },
  { value: 'Interactive', label: 'Interactive' },
  { value: 'SCORM', label: 'SCORM' },
]

interface CreateEditModuleModalProps {
  open: boolean
  onClose: () => void
  editingSection?: ContentSection | null
  nextOrder?: number
  onSubmit: (payload: CreateModulePayload) => void
}

export default function CreateEditModuleModal({
  open,
  onClose,
  editingSection,
  nextOrder = 1,
  onSubmit,
}: CreateEditModuleModalProps) {
  const isEdit = !!editingSection
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ModuleContentType | ''>('')
  const [duration, setDuration] = useState('')
  const [order, setOrder] = useState(String(nextOrder))
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  useEffect(() => {
    if (!open) return
    const section = editingSection
    queueMicrotask(() => {
      if (section) {
        setTitle(section.title)
        setDescription(section.description ?? '')
        setContentType(section.contentType ?? '')
        setDuration(section.duration != null ? String(section.duration) : '')
        setOrder(String(section.order))
        setStatus(section.status ?? 'draft')
      } else {
        setTitle('')
        setDescription('')
        setContentType('')
        setDuration('')
        setOrder(String(nextOrder))
        setStatus('draft')
      }
    })
  }, [open, editingSection, nextOrder])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      contentType: contentType || undefined,
      duration: duration ? parseInt(duration, 10) : undefined,
      order: parseInt(order, 10) || 1,
      status,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-base font-bold text-slate-800 mb-4">
        {isEdit ? 'Edit Module' : 'Create Module'}
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Module Title, Description, Content Type (Video/PDF/Interactive/SCORM), Duration, Order, Status.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="module-title" className="block text-sm font-medium text-slate-700 mb-1">Module Title *</label>
          <input
            id="module-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to JavaScript"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="module-description" className="block text-sm font-medium text-slate-700 mb-1">Description (rich text)</label>
          <textarea
            id="module-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the module content..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm resize-none"
          />
        </div>
        <div>
          <Dropdown
            label="Content Type"
            value={contentType}
            options={[
              { value: '', label: 'Select type' },
              ...CONTENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
            ]}
            onChange={(v) => setContentType(v as ModuleContentType | '')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Order Number</label>
            <input
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="rounded-full border-slate-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm text-slate-700">Draft</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="rounded-full border-slate-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm text-slate-700">Published</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:opacity-90"
          >
            {isEdit ? 'Update Module' : 'Create Module'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
