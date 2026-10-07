// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'

export interface SearchableMultiSelectOption {
  id: number
  label: string
}

interface SearchableMultiSelectProps {
  readonly options: SearchableMultiSelectOption[]
  readonly selectedIds: number[]
  readonly onChange: (ids: number[]) => void
  readonly placeholder?: string
  readonly searchPlaceholder?: string
  readonly emptyText?: string
}

/**
 * Multi-select with selected-item chips and an in-dropdown search box. The list
 * is portalled to `document.body` so it overflows scrolling containers (e.g. a
 * modal) instead of being clipped. Closes on outside click.
 */
export default function SearchableMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No options found.',
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Close on outside click — ignore both the trigger and the portalled list.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const insideTrigger = triggerRef.current?.contains(target) ?? false
      const insideList = listRef.current?.contains(target) ?? false
      if (!insideTrigger && !insideList) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  const toggleOption = (id: number) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])

  const removeOption = (id: number) => onChange(selectedIds.filter(x => x !== id))

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const labelFor = (id: number) => options.find(o => o.id === id)?.label ?? `#${id}`

  return (
    <div>
      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedIds.map(id => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-semibold"
            >
              {labelFor(id)}
              <button
                type="button"
                onClick={() => removeOption(id)}
                className="ml-0.5 hover:text-red-500 transition-colors"
                aria-label={`Remove ${labelFor(id)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-brand-teal/50 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-colors bg-white"
      >
        <span className={selectedIds.length === 0 ? 'text-slate-400' : ''}>
          {selectedIds.length === 0
            ? placeholder
            : `${selectedIds.length} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Portalled dropdown */}
      {open && rect && createPortal(
        <div
          ref={listRef}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-teal"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">{emptyText}</p>
            ) : (
              filtered.map(opt => {
                const selected = selectedIds.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOption(opt.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      selected ? 'bg-brand-teal/8 text-brand-teal font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      selected ? 'bg-brand-teal border-brand-teal' : 'border-slate-300'
                    }`}>
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    {opt.label}
                  </button>
                )
              })
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
