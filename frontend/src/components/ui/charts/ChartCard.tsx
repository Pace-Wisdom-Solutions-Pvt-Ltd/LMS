// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { LucideIcon } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Optional element rendered on the right of the header (e.g. a total). */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Light titled panel for charts/metrics. Reusable wrapper — pass a title,
 * optional icon/subtitle, and any chart as children.
 */
export default function ChartCard({ title, subtitle, icon: Icon, action, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="h-8 w-8 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight truncate">{title}</h3>
            {subtitle && <p className="text-[12px] text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
