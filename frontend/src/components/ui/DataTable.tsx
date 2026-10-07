// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import SortableHeader from '@/components/ui/SortableHeader'
import { useSortable, type SortDir } from '@/hooks/useSortable'

/** Cycled widths so skeleton cells look like varied real content, not a grid. */
const SKELETON_WIDTHS = ['w-28', 'w-20', 'w-24', 'w-16', 'w-32']

export type DataTableAlign = 'left' | 'center' | 'right'

export type DataTableColumn<T> = {
  /** Stable key for the column (React key + column identity). */
  key: string
  label: ReactNode
  /**
   * When set, the header becomes sortable and this value is the sort
   * identifier. For internal sorting it must be a field of the row; for a
   * controlled `sort` controller it can be any backend sort field name.
   */
  sortKey?: string
  /** Horizontal alignment for header + body cell. Defaults to `left`. */
  align?: DataTableAlign
  /** Extra classes for the body cell. */
  className?: string
  /** Extra classes for the header cell. */
  headerClassName?: string
  render: (row: T) => ReactNode
}

/**
 * External sort controller. Provide this when rows are sorted/paginated by the
 * caller (so the table must not re-sort); omit it to let the table sort its
 * rows internally. Sort keys are opaque column identifiers (strings).
 */
export type SortController = {
  sortKey: string | null
  sortDir: SortDir
  onSort: (key: string) => void
}

export type DataTableVariant = 'standard' | 'card'

/**
 * Visual style presets. `standard` is the bordered listing table used across
 * most role screens; `card` is the elevated, rounded panel with uppercase
 * headers used on organization detail / listing pages.
 */
const VARIANTS: Record<
  DataTableVariant,
  {
    wrapper: string
    /** Optional inner scroll container (card wraps the scroll separately). */
    scroll: string
    headRow: string
    /** Base `<th>` classes for both plain and sortable headers. */
    th: string
    bodyRow: string
    td: string
  }
> = {
  standard: {
    wrapper: 'overflow-x-auto rounded-xl border border-slate-200/80',
    scroll: '',
    headRow: 'border-b border-slate-200 bg-slate-50/80',
    th: 'py-3 px-4 font-semibold text-slate-700',
    bodyRow: 'border-b border-slate-100 last:border-0 hover:bg-slate-50/50',
    td: 'py-3 px-4',
  },
  card: {
    wrapper: 'bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden',
    scroll: 'overflow-x-auto',
    headRow: 'border-b border-slate-100 bg-slate-50/60',
    th: 'px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider',
    bodyRow: 'border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors',
    td: 'px-5 py-3.5',
  },
}

const ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * Generic, sortable data table shared across the app. Configure it with a
 * `columns` array of render functions; it handles headers (plain + sortable),
 * loading and empty states, an optional trailing actions column, row clicks,
 * and an optional footer slot (e.g. pagination).
 *
 * Sorting is either internal (omit `sort`) or controlled (pass a `sort`
 * controller when the caller pre-sorts/paginates the rows).
 */
export default function DataTable<T extends object>({
  rows,
  columns,
  variant = 'standard',
  loading = false,
  loadingMessage = 'Loading…',
  skeletonRows = 5,
  emptyMessage,
  renderActions,
  actionsLabel = 'Actions',
  actionsAlign,
  sort,
  onRowClick,
  rowClassName,
  getRowId,
  minWidth,
  footer,
}: Readonly<{
  rows: T[]
  columns: DataTableColumn<T>[]
  variant?: DataTableVariant
  loading?: boolean
  /** Screen-reader announcement shown while the skeleton is visible. */
  loadingMessage?: string
  /** Number of placeholder rows rendered while `loading`. Defaults to 5. */
  skeletonRows?: number
  emptyMessage: ReactNode
  renderActions?: (row: T) => ReactNode
  actionsLabel?: string
  /** Alignment of the actions header + cell. Defaults per variant. */
  actionsAlign?: DataTableAlign
  sort?: SortController
  onRowClick?: (row: T) => void
  /** Extra classes appended to each body `<tr>`. */
  rowClassName?: (row: T) => string
  /** Row key resolver. Defaults to `String(row.id)`, falling back to the row index. */
  getRowId?: (row: T, index: number) => string
  /** Tailwind `min-w-[…]` to keep columns from squishing on small screens. */
  minWidth?: string
  /** Optional content rendered below the table (e.g. pagination). */
  footer?: ReactNode
}>) {
  const internal = useSortable(rows)
  // Controlled mode: caller pre-sorts `rows` and owns the sort state.
  const controlled = sort != null
  const displayRows = controlled ? rows : internal.sorted
  const activeSortKey = controlled ? sort.sortKey : (internal.sortKey as string | null)
  const sortDir = controlled ? sort.sortDir : internal.sortDir
  const onSort = (key: string) => {
    if (controlled) sort.onSort(key)
    else internal.handleSort(key as keyof T)
  }

  const styles = VARIANTS[variant]
  const rowId =
    getRowId ??
    ((row: T, index: number) => {
      const maybeId = (row as { id?: string | number }).id
      return maybeId != null ? String(maybeId) : String(index)
    })
  const colCount = columns.length + (renderActions ? 1 : 0)
  const resolvedActionsAlign = actionsAlign ?? (variant === 'card' ? 'center' : 'left')

  const table = (
    <table className={`w-full text-sm ${minWidth ?? ''}`}>
      {loading && <caption className="sr-only">{loadingMessage}</caption>}
      <thead>
        <tr className={styles.headRow}>
          {columns.map((col) => {
            const alignClass = ALIGN_CLASS[col.align ?? 'left']
            const thClass = `${alignClass} ${styles.th} ${col.headerClassName ?? ''}`.trim()
            return col.sortKey ? (
              <SortableHeader
                key={col.key}
                label={String(col.label)}
                sortKey={col.sortKey}
                activeSortKey={activeSortKey}
                sortDir={sortDir}
                onSort={onSort}
                thClassName={thClass}
              />
            ) : (
              <th key={col.key} className={thClass}>
                {col.label}
              </th>
            )
          })}
          {renderActions && (
            <th className={`${ALIGN_CLASS[resolvedActionsAlign]} ${styles.th}`}>{actionsLabel}</th>
          )}
        </tr>
      </thead>
      <tbody aria-busy={loading || undefined}>
        {loading &&
          Array.from({ length: Math.max(1, skeletonRows) }, (_, rowIndex) => (
            <tr key={`skeleton-${rowIndex}`} className={styles.bodyRow}>
              {columns.map((col, colIndex) => (
                <td key={col.key} className={`${ALIGN_CLASS[col.align ?? 'left']} ${styles.td}`}>
                  <Skeleton className={`h-4 rounded ${SKELETON_WIDTHS[colIndex % SKELETON_WIDTHS.length]} max-w-full`} />
                </td>
              ))}
              {renderActions && (
                <td className={`${styles.td}`}>
                  <div className={`flex items-center gap-1.5 ${resolvedActionsAlign === 'center' ? 'justify-center' : ''}`}>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </td>
              )}
            </tr>
          ))}
        {!loading && displayRows.length === 0 && (
          <tr>
            <td className={`${styles.td} text-slate-500`} colSpan={colCount}>
              {emptyMessage}
            </td>
          </tr>
        )}
        {!loading &&
          displayRows.map((row, index) => (
            <tr
              key={rowId(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${styles.bodyRow} ${onRowClick ? 'cursor-pointer' : ''} ${
                rowClassName?.(row) ?? ''
              }`.trim()}
            >
              {columns.map((col) => (
                <td key={col.key} className={`${ALIGN_CLASS[col.align ?? 'left']} ${styles.td} ${col.className ?? ''}`.trim()}>
                  {col.render(row)}
                </td>
              ))}
              {renderActions && (
                <td className={`${ALIGN_CLASS[resolvedActionsAlign]} ${styles.td}`}>
                  {renderActions(row)}
                </td>
              )}
            </tr>
          ))}
      </tbody>
    </table>
  )

  return (
    <div className={styles.wrapper}>
      {styles.scroll ? <div className={styles.scroll}>{table}</div> : table}
      {footer}
    </div>
  )
}
