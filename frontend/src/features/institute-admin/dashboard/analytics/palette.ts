// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/** Chart colours aligned with the app's teal/green brand theme. */
export const CHART_PALETTE = [
  '#14b8a6', // teal
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#0ea5e9', // sky
  '#64748b', // slate
] as const

export const STATUS_COLORS = {
  active: '#22c55e',
  inactive: '#cbd5e1',
} as const

/** Pick a stable colour for the nth series item, wrapping the palette. */
export const paletteColor = (index: number) => CHART_PALETTE[index % CHART_PALETTE.length]
