// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700' },
  inactive:  { label: 'Inactive',  cls: 'bg-slate-100 text-slate-500' },
  pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-600' },
  reinvited: { label: 'Reinvited', cls: 'bg-blue-50 text-blue-600' },
  expired:   { label: 'Expired',   cls: 'bg-red-50 text-red-600' },
  deleted:   { label: 'Deleted',   cls: 'bg-rose-50 text-rose-700' },
}

export default function UserStatusBadge({ status }: { readonly status: string }) {
  const s = (status ?? '').toLowerCase()
  const { label, cls } = STATUS_CONFIG[s] ?? { label: status || '—', cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
