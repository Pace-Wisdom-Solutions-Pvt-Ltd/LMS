// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { SortDir } from '@/hooks/useSortable'

const DEFAULT_TH_CLASS = 'text-left py-3 px-4 font-semibold text-slate-700'

interface SortableHeaderProps {
  label: string
  sortKey: string
  activeSortKey: string | null | undefined
  sortDir: SortDir
  onSort: (key: string) => void
  /** Extra classes appended to the `<th>`. */
  className?: string
  /**
   * Replaces the default `<th>` base classes entirely (padding, weight, color).
   * Use for alternate table variants that need different spacing/typography.
   */
  thClassName?: string
}

export default function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className = '',
  thClassName,
}: SortableHeaderProps) {
  const isActive = activeSortKey === sortKey
  return (
    <th className={`${thClassName ?? DEFAULT_TH_CLASS} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors group whitespace-nowrap"
      >
        {label}
        <span className="text-slate-400 group-hover:text-slate-600">
          {isActive ? (
            sortDir === 'asc'
              ? <ArrowUp className="h-3.5 w-3.5 text-brand-teal" />
              : <ArrowDown className="h-3.5 w-3.5 text-brand-teal" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
    </th>
  )
}
