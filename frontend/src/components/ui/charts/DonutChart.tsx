// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useId } from 'react'

export interface DonutSlice {
  label: string
  value: number
  /** CSS color (hex/rgb) used for the slice + legend swatch. */
  color: string
}

interface DonutChartProps {
  data: DonutSlice[]
  /** Outer diameter in px. */
  size?: number
  /** Ring thickness in px. */
  thickness?: number
  /** Large text shown in the middle (defaults to the summed total). */
  centerValue?: string | number
  /** Small caption under the center value. */
  centerLabel?: string
  /** Hide the swatch legend rendered beside the ring. */
  hideLegend?: boolean
}

/**
 * Dependency-free donut/pie chart drawn with SVG stroke arcs.
 * Reusable across features — pass any set of labelled, coloured slices.
 */
export default function DonutChart({
  data,
  size = 160,
  thickness = 22,
  centerValue,
  centerLabel,
  hideLegend = false,
}: DonutChartProps) {
  const titleId = useId()
  const total = data.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  // Walk the slices, accumulating the offset so each arc starts where the last ended.
  const arcs = data
    .filter(s => s.value > 0)
    .reduce<(DonutSlice & { dash: number; offset: number })[]>((acc, s) => {
      const prev = acc.at(-1)
      const fraction = total > 0 ? s.value / total : 0
      acc.push({ ...s, dash: fraction * circumference, offset: prev ? prev.offset + prev.dash : 0 })
      return acc
    }, [])

  return (
    <div className="flex items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={titleId}
        className="shrink-0 -rotate-90"
      >
        <title id={titleId}>{centerLabel ?? 'Donut chart'}</title>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={thickness}
        />
        {arcs.map(arc => (
          <circle
            key={arc.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>

      {(centerValue !== undefined || centerLabel || !hideLegend) && (
        <div className="min-w-0">
          {(centerValue !== undefined || centerLabel) && (
            <div className="mb-3">
              <p className="text-2xl font-bold text-slate-800 leading-none">
                {centerValue ?? total.toLocaleString()}
              </p>
              {centerLabel && <p className="text-[13px] text-slate-500 mt-1">{centerLabel}</p>}
            </div>
          )}
          {!hideLegend && (
            <ul className="space-y-1.5">
              {data.map(s => (
                <li key={s.label} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 truncate">{s.label}</span>
                  <span className="ml-auto font-semibold text-slate-800 tabular-nums">{s.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
