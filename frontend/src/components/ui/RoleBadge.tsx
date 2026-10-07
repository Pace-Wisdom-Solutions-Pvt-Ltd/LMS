// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { getRoleLabel } from '@/lib/roleLabels'

const SIZES = {
  sm: 'px-2 py-0.5 rounded-full text-[11px]',
  md: 'inline-flex px-2.5 py-1 rounded-lg text-[12px]',
} as const

interface RoleBadgeProps {
  /** API user-role identifier (e.g. `superadmin`, `org_admin`). */
  readonly role: string
  readonly size?: keyof typeof SIZES
  readonly className?: string
}

/** Pill showing the human-readable label for an API user role. */
export default function RoleBadge({ role, size = 'md', className = '' }: RoleBadgeProps) {
  return (
    <span className={`bg-brand-teal/10 text-brand-teal font-semibold ${SIZES[size]} ${className}`}>
      {getRoleLabel(role)}
    </span>
  )
}
