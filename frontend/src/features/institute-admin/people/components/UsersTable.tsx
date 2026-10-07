// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import DataTable, { type DataTableColumn, type SortController } from '@/components/ui/DataTable'

/** @deprecated Use `DataTableColumn` from `@/components/ui/DataTable`. */
export type UserColumn<T> = DataTableColumn<T>
export type { SortController }

/**
 * Generic sortable listing table shared by the trainer and student tabs.
 * Thin wrapper over the shared {@link DataTable}; an "Actions" column is
 * appended automatically when `renderActions` is set.
 */
export default function UsersTable<T extends { id: string }>({
  rows,
  columns,
  loading = false,
  loadingMessage = 'Loading…',
  emptyMessage,
  renderActions,
  sort,
}: Readonly<{
  rows: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  loadingMessage?: string
  emptyMessage: string
  renderActions?: (row: T) => ReactNode
  sort?: SortController
}>) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      renderActions={renderActions}
      sort={sort}
    />
  )
}
