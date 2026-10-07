// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Small count shown after the label, e.g. the number of items in a list. */
  badge?: number | string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  /** Names the group for screen readers, e.g. "Panel". */
  readonly label: string
  className?: string
}

/**
 * Pill-style tab switcher for choosing between sibling panels.
 *
 * Use it when two panels compete for the same space — showing both at once
 * would give each its own scrollbar and halve the room available to whichever
 * one the user is actually working in.
 */
export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: Readonly<SegmentedControlProps<T>>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-1 rounded-lg bg-slate-100 p-1 ${className}`}
    >
      {options.map(option => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              selected
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {option.label}
            {option.badge !== undefined && (
              <span
                className={`rounded px-1 text-[10px] tabular-nums ${
                  selected ? 'bg-slate-100 text-slate-500' : 'text-slate-400'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
