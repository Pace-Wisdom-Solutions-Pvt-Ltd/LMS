// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'

export type DetailFieldConfig = {
  label: string
  value: ReactNode
  /** Span the full grid width (e.g. email). */
  full?: boolean
}

function DetailField({ label, value, full = false }: Readonly<DetailFieldConfig>) {
  return (
    <div className={`rounded-xl border border-slate-200 p-3 ${full ? 'col-span-2' : ''}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className="text-sm font-semibold text-slate-800 mt-1 break-all">{value}</div>
    </div>
  )
}

/** Two-column grid of labelled detail fields, shared by the user details modals. */
export default function UserDetailsGrid({ fields }: Readonly<{ fields: DetailFieldConfig[] }>) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((f) => (
        <DetailField key={f.label} label={f.label} value={f.value} full={f.full} />
      ))}
    </div>
  )
}
