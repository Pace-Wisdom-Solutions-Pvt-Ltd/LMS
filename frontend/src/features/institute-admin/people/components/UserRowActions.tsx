// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Eye, Pencil, Trash2 } from 'lucide-react'

/**
 * Row action buttons shared by the trainer and student listing tables.
 * View is always shown; edit/delete can be hidden per-row (e.g. org admins
 * in the trainer list are view-only).
 */
export default function UserRowActions<T>({
  row,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: Readonly<{
  row: T
  onView: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  canEdit?: boolean
  canDelete?: boolean
}>) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onView(row)}
        title="View details"
        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <Eye className="h-4 w-4" />
      </button>
      {canEdit && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(row)}
          title="Edit"
          className="p-2 rounded-lg border border-brand-teal/30 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(row)}
          title="Delete"
          className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
