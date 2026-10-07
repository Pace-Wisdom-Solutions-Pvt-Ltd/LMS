// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Optional content rendered to the right of the switch (e.g. a state label). */
  label?: ReactNode
  /** Classes applied to the wrapping button. */
  className?: string
  'aria-label'?: string
}

/** Accessible on/off switch. Renders an optional label beside the track. */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  className = '',
  ...rest
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        // Keep the switch self-contained: a click toggles it without bubbling to
        // an ancestor handler (e.g. a clickable table row that navigates).
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      {label}
    </button>
  )
}
