// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useId } from 'react'
import Dropdown from '@/components/ui/Dropdown'

export type DurationUnit = 'seconds' | 'minutes' | 'hours'

const DURATION_UNIT_OPTIONS: ReadonlyArray<{ value: DurationUnit; label: string }> = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
]

const UNIT_LABEL: Record<DurationUnit, string> = {
  seconds: 'Seconds',
  minutes: 'Minutes',
  hours: 'Hours',
}

interface DurationFieldProps {
  label?: string
  value: number | ''
  onChange: (value: number | '') => void
  /** The unit the value is expressed in — always shown next to the field. */
  unit: DurationUnit
  /**
   * Makes the unit selectable. Omit when the API fixes the unit (e.g. coding
   * questions store `duration` in minutes) — it then renders as a static suffix.
   */
  onUnitChange?: (unit: DurationUnit) => void
  id?: string
  min?: number
  max?: number
  placeholder?: string
  hint?: string
  className?: string
}

/**
 * Number input paired with its time unit, so the unit behind a duration is
 * always visible instead of being implied by the label.
 */
export default function DurationField({
  label = 'Duration',
  value,
  onChange,
  unit,
  onUnitChange,
  id,
  min = 1,
  max,
  placeholder,
  hint,
  className = '',
}: Readonly<DurationFieldProps>) {
  const reactId = useId()
  const inputId = id ?? reactId
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={placeholder}
          aria-describedby={hintId}
          className="flex-1 min-w-0 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
        />
        {onUnitChange ? (
          <Dropdown
            value={unit}
            options={DURATION_UNIT_OPTIONS}
            onChange={onUnitChange}
            className="w-32 shrink-0"
            compact
          />
        ) : (
          <span className="w-32 shrink-0 grid place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
            {UNIT_LABEL[unit]}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}
