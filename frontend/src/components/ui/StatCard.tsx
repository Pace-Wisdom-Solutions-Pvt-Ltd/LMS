// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  /** Tailwind classes for the icon chip, e.g. "bg-brand-teal/10 text-brand-teal". */
  iconClass?: string
  /** Optional secondary line under the label (e.g. "84% active"). */
  hint?: string
}

/**
 * Compact metric card: icon chip, big value, label, optional hint.
 * Reusable across dashboards and detail views.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  iconClass = 'bg-brand-teal/10 text-brand-teal',
  hint,
}: StatCardProps) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${iconClass}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="text-xl font-bold text-slate-800">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[13px] text-slate-500 mt-0.5">{label}</p>
      {hint && <p className="text-[12px] font-semibold text-brand-teal mt-1">{hint}</p>}
    </div>
  )
}
