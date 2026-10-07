// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import UserStatusBadge from '@/components/ui/UserStatusBadge'
import { toTitleCase } from '@/lib/format'
import UsersTable, { type UserColumn } from '../components/UsersTable'
import UserRowActions from '../components/UserRowActions'
import type { StudentRow } from './types'

type BatchName = { id: string; name: string }

function batchLabel(batchIds: string[], batches: BatchName[]): string {
  return batchIds
    .map((id) => batches.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(', ')
}

export default function StudentsTable({
  students,
  batches,
  loading = false,
  onOpenDetails,
  onOpenEdit,
  onDelete,
}: Readonly<{
  students: StudentRow[]
  batches: BatchName[]
  loading?: boolean
  onOpenDetails: (s: StudentRow) => void
  onOpenEdit: (s: StudentRow) => void
  onDelete: (s: StudentRow) => void
}>) {
  const columns: UserColumn<StudentRow>[] = [
    {
      key: 'name',
      label: 'Name',
      sortKey: 'firstName',
      className: 'font-medium text-slate-800 whitespace-nowrap',
      render: (s) => toTitleCase(`${s.firstName} ${s.lastName}`.trim()),
    },
    { key: 'email', label: 'Email', sortKey: 'email', className: 'text-slate-600', render: (s) => s.email },
    {
      key: 'batch',
      label: 'Batch',
      className: 'text-slate-600 max-w-[160px]',
      render: (s) => {
        const label = batchLabel(s.batchIds, batches)
        return <span className="block truncate" title={label}>{label || '—'}</span>
      },
    },
    { key: 'status', label: 'Status', render: (s) => <UserStatusBadge status={s.status} /> },
  ]

  return (
    <UsersTable
      rows={students}
      columns={columns}
      loading={loading}
      loadingMessage="Loading students…"
      emptyMessage="No students found."
      renderActions={(s) => (
        <UserRowActions row={s} onView={onOpenDetails} onEdit={onOpenEdit} onDelete={onDelete} />
      )}
    />
  )
}
