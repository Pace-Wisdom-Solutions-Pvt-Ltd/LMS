// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

interface ProgressBarProps {
  /** 0–100. Clamped into range. */
  value: number
  className?: string
  /** Show the bold percentage label to the right of the bar. */
  showLabel?: boolean
}

/** Color-coded (red/amber/emerald) horizontal progress bar. Reusable across any 0–100 completion metric. */
export default function ProgressBar({ value, className = '', showLabel = true }: Readonly<ProgressBarProps>) {
  const clamped = Math.min(100, Math.max(0, value))
  const barColor = clamped >= 70 ? 'bg-emerald-500' : clamped >= 40 ? 'bg-amber-400' : 'bg-red-400'
  const textColor = clamped >= 70 ? 'text-emerald-600' : clamped >= 40 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className={`flex items-center gap-2 min-w-28 ${className}`}>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className={`text-xs font-bold shrink-0 ${textColor}`}>{Math.round(clamped)}%</span>}
    </div>
  )
}
