// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

export interface BarDatum {
  label: string
  value: number
  /** Optional per-bar colour; falls back to the brand teal. */
  color?: string
}

interface BarChartProps {
  data: BarDatum[]
  /** Cap the number of bars; the remainder is summarised as "+N more". */
  maxBars?: number
  /** Format the trailing value label (defaults to localized number). */
  valueFormatter?: (value: number) => string
  /** Fallback bar colour when a datum has none. */
  color?: string
  /** Message shown when there is no data to plot. */
  emptyText?: string
}

const DEFAULT_COLOR = '#14b8a6'

/**
 * Dependency-free horizontal bar chart. Reusable for any labelled numeric
 * series (students per batch, staff per role, courses per batch, …).
 */
export default function BarChart({
  data,
  maxBars = 8,
  valueFormatter = (v) => v.toLocaleString(),
  color = DEFAULT_COLOR,
  emptyText = 'No data to display.',
}: BarChartProps) {
  if (data.length === 0) {
    return <p className="text-[13px] text-slate-400 py-6 text-center">{emptyText}</p>
  }

  const visible = data.slice(0, maxBars)
  const hiddenCount = data.length - visible.length
  const max = Math.max(...visible.map(d => d.value), 1)

  return (
    <div className="space-y-3">
      {visible.map(d => {
        const pct = Math.round((d.value / max) * 100)
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[13px] text-slate-600 truncate" title={d.label}>
              {d.label}
            </span>
            <div className="flex-1 h-6 rounded-md bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-md transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`, backgroundColor: d.color ?? color }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-[13px] font-semibold text-slate-800 tabular-nums">
              {valueFormatter(d.value)}
            </span>
          </div>
        )
      })}
      {hiddenCount > 0 && (
        <p className="text-[12px] text-slate-400 pl-32">+{hiddenCount} more not shown</p>
      )}
    </div>
  )
}
