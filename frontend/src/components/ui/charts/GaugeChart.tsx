// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useId } from 'react'

interface GaugeChartProps {
  /** Progress value, 0–100. Clamped into range. */
  value: number
  /** Outer diameter in px. */
  size?: number
  /** Arc thickness in px. */
  thickness?: number
  /** Gradient start colour for the filled arc. */
  gradientFrom?: string
  /** Gradient end colour for the filled arc. */
  gradientTo?: string
  /** Colour of the unfilled track. */
  trackColor?: string
  /** Large caption shown under the big percentage (e.g. "Complete"). */
  label?: string
  /** Small line under the label (e.g. "12/40 lessons"). */
  sublabel?: string
}

const SWEEP = 270 // degrees of arc; leaves a 90° gap at the bottom
const START = -135 // start angle (bottom-left), measured from 12 o'clock

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** SVG arc path from startAngle → endAngle (clockwise), angles from 12 o'clock. */
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * Dependency-free radial progress gauge (270° arc with a gradient fill and
 * rounded caps). Reusable for any single 0–100 metric — overall completion,
 * quiz score, mastery, etc.
 */
export default function GaugeChart({
  value,
  size = 180,
  thickness = 16,
  gradientFrom = '#14b8a6',
  gradientTo = '#22c55e',
  trackColor = '#f1f5f9',
  label,
  sublabel,
}: GaugeChartProps) {
  const gradientId = useId()
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const valueEnd = START + (SWEEP * pct) / 100

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct)}% ${label ?? 'complete'}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <path
          d={arcPath(cx, cy, r, START, START + SWEEP)}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={arcPath(cx, cy, r, START, valueEnd)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-slate-800 leading-none tabular-nums">{Math.round(pct)}%</span>
        {label && <span className="mt-1.5 text-[12px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>}
        {sublabel && <span className="mt-0.5 text-[12px] text-slate-500">{sublabel}</span>}
      </div>
    </div>
  )
}
