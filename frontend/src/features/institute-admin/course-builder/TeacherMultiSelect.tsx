// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { ApiStaff } from '@/lib/api/organizations'

export default function TeacherMultiSelect({
  staffList,
  selected,
  onChange,
}: {
  staffList: ApiStaff[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc) }
  }, [])

  const toggle = (uuid: string) =>
    onChange(selected.includes(uuid) ? selected.filter((x) => x !== uuid) : [...selected, uuid])

  const label =
    selected.length === 0
      ? 'Select teachers…'
      : selected.length === 1
        ? (() => {
            const s = staffList.find((x) => x.user_detail?.id === selected[0])
            return s
              ? `${s.user_detail?.first_name ?? ''} ${s.user_detail?.last_name ?? ''}`.trim() || '1 teacher'
              : '1 teacher'
          })()
        : `${selected.length} teachers selected`

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">Assign Teachers</label>
      {staffList.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">No teachers found. Add teachers from the Trainers page first.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border bg-white text-sm font-medium transition-all ${
              open
                ? 'border-brand-teal ring-[3px] ring-brand-teal/20'
                : 'border-slate-200 hover:border-slate-300'
            } ${selected.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}
          >
            <span>{label}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {staffList.map((s) => {
                const uuid = s.user_detail?.id ?? ''
                const name = `${s.user_detail?.first_name ?? ''} ${s.user_detail?.last_name ?? ''}`.trim() || s.user_detail?.email
                const isSelected = !!uuid && selected.includes(uuid)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => uuid && toggle(uuid)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-brand-teal border-brand-teal' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className={isSelected ? 'font-medium text-slate-800' : ''}>{name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
