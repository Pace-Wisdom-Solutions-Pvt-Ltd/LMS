// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Loader2, Code2 } from 'lucide-react'
import Dropdown, { type DropdownOption } from '@/components/ui/Dropdown'

export interface LanguageOption {
  key: string
  label: string
}

type LanguageSelectProps = Readonly<{
  /** Currently selected language key (e.g. "python"). */
  value: string
  /** Languages the learner may pick from. */
  options: LanguageOption[]
  /** Fired with the newly selected language key. */
  onChange: (key: string) => void
  /** Show a spinner (e.g. while the new signature is loading). */
  loading?: boolean
  disabled?: boolean
  className?: string
}>

/**
 * Language picker for coding editors. Renders the shared {@link Dropdown} when
 * there is a real choice, and collapses to a read-only pill when a problem is
 * locked to a single language (e.g. SQL exercises).
 */
export default function LanguageSelect({
  value,
  options,
  onChange,
  loading = false,
  disabled = false,
  className = '',
}: LanguageSelectProps) {
  const current = options.find((o) => o.key === value) ?? options[0]

  // Single (or no) language — nothing to choose, just show what it is.
  if (options.length <= 1) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 ${className}`}
      >
        <Code2 className="h-3.5 w-3.5 text-slate-400" />
        {current?.label ?? value}
      </span>
    )
  }

  const dropdownOptions: DropdownOption[] = options.map((o) => ({
    value: o.key,
    label: o.label,
  }))

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      <Dropdown
        compact
        value={value}
        options={dropdownOptions}
        onChange={onChange}
        disabled={disabled || loading}
        className="min-w-[140px]"
      />
    </div>
  )
}
