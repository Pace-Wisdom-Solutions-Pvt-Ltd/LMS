// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface MultiCheckOption {
  id: string
  name: string
}

interface MultiCheckDropdownProps {
  readonly options: MultiCheckOption[]
  readonly selected: string[]
  readonly onChange: (value: string[]) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  /** Show an in-dropdown search box to filter options. Defaults to `true`. */
  readonly searchable?: boolean
  readonly searchPlaceholder?: string
}

/**
 * Multi-select dropdown rendered as a checkbox list with an optional in-dropdown
 * search box. Closes on outside click or Escape. The trigger label collapses to a
 * count once more than one option is selected.
 */
export default function MultiCheckDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Search…',
}: MultiCheckDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Reset the query when opening so the dropdown reopens clean.
  const setOpenState = (next: boolean) => {
    if (next) setSearch('')
    setOpen(next)
  }

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.name.toLowerCase().includes(q))
  }, [options, search, searchable])

  let label = placeholder
  if (selected.length === 1) label = options.find((o) => o.id === selected[0])?.name ?? '1 selected'
  else if (selected.length > 1) label = `${selected.length} selected`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpenState(!open)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-medium transition-all ${
          open ? 'border-brand-teal ring-2 ring-brand-teal/20' : 'border-slate-200 hover:border-slate-300'
        } ${selected.length > 0 ? 'text-slate-800' : 'text-slate-400'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-colors"
                  autoFocus
                />
              </div>
            </div>
          )}
          <ul className="max-h-52 overflow-y-auto">
            {options.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-slate-400">No options available</li>
            )}
            {options.length > 0 && filtered.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-slate-400">No matches found</li>
            )}
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt.id)
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-brand-teal border-brand-teal' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={isSelected ? 'font-medium text-slate-800' : ''}>{opt.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
