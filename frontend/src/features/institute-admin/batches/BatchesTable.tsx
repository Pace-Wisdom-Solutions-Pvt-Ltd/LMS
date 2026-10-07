// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Pencil, Trash2 } from 'lucide-react'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import type { SortDir } from '@/hooks/useSortable'
import type { ApiBatch } from '@/lib/api/organizations'

interface BatchesTableProps {
  readonly batches: ApiBatch[]
  readonly loading: boolean
  readonly togglingIds: Set<string>
  readonly sortKey: string | null
  readonly sortDir: SortDir
  readonly onSort: (key: string) => void
  readonly onToggleActive: (batch: ApiBatch) => void
  readonly onEdit: (batch: ApiBatch) => void
  readonly onDelete: (batch: ApiBatch) => void
  readonly onRowClick?: (batch: ApiBatch) => void
}

export default function BatchesTable({
  batches,
  loading,
  togglingIds,
  sortKey,
  sortDir,
  onSort,
  onToggleActive,
  onEdit,
  onDelete,
  onRowClick,
}: BatchesTableProps) {
  const columns: DataTableColumn<ApiBatch>[] = [
    {
      key: 'name',
      label: 'Name',
      sortKey: 'name',
      className: 'font-medium text-slate-800',
      render: (b) => b.name,
    },
    { key: 'start_date', label: 'Start Date', className: 'text-slate-600', render: (b) => b.start_date ?? '—' },
    { key: 'end_date', label: 'End Date', className: 'text-slate-600', render: (b) => b.end_date ?? '—' },
    {
      key: 'is_active',
      label: 'Status',
      sortKey: 'is_active',
      render: (batch) => {
        const active = batch.is_active !== false
        const toggling = togglingIds.has(String(batch.id))
        return (
          <ToggleSwitch
            checked={active}
            disabled={toggling}
            onChange={() => onToggleActive(batch)}
            aria-label={active ? 'Deactivate batch' : 'Activate batch'}
            label={
              <span className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
                {toggling ? '…' : active ? 'Active' : 'Inactive'}
              </span>
            }
          />
        )
      },
    },
  ]

  return (
    <DataTable
      rows={batches}
      columns={columns}
      loading={loading}
      loadingMessage="Loading batches…"
      emptyMessage="No batches found. Click Create Batch to add one."
      getRowId={(b) => String(b.id)}
      onRowClick={onRowClick}
      sort={{
        sortKey: sortKey as keyof ApiBatch | null,
        sortDir,
        onSort: (k) => onSort(String(k)),
      }}
      renderActions={(batch) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(batch)
            }}
            title="Edit"
            className="p-2 rounded-lg border border-brand-teal/30 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(batch)
            }}
            title="Delete"
            className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    />
  )
}
