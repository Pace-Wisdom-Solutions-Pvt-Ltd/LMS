// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import UserStatusBadge from '@/components/ui/UserStatusBadge'
import UserDetailsGrid from '../components/UserDetailsGrid'
import ReinviteButton from '../components/ReinviteButton'
import type { TrainerDetails } from './types'

export default function TrainerDetailsModal({
  open,
  onClose,
  loading,
  details,
  togglingActive,
  onToggleActive,
  reinviting,
  onReinvite,
}: Readonly<{
  open: boolean
  onClose: () => void
  loading: boolean
  details: TrainerDetails | null
  togglingActive: boolean
  onToggleActive: () => void
  reinviting: boolean
  onReinvite: () => void
}>) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-base font-bold text-slate-800 mb-4 pr-8">Trainer Details</h2>

      {loading && <div className="py-8 text-sm text-slate-600">Loading…</div>}
      {!loading && !details && <div className="py-8 text-sm text-slate-600">No details.</div>}

      {!loading && details && (
        <div className="space-y-4">
          <UserDetailsGrid
            fields={[
              { label: 'Name', value: details.name },
              { label: 'Role', value: details.role },
              { label: 'Email', value: details.email, full: true },
              { label: 'Phone', value: details.phone },
              { label: 'Status', value: <UserStatusBadge status={details.userStatus} /> },
              { label: 'Batch', value: details.batch },
              {
                label: 'Assigned Courses',
                value: details.assignedCourses.length > 0 ? details.assignedCourses.join(', ') : '—',
              },
              { label: 'Joined', value: details.joinedAt, full: true },
            ]}
          />

          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={details.isActive}
                onChange={onToggleActive}
                disabled={togglingActive}
                aria-label={details.isActive ? 'Deactivate trainer' : 'Activate trainer'}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                label={
                  togglingActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${details.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {details.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )
                }
              />
              {details.userStatus === 'expired' && <ReinviteButton onReinvite={onReinvite} reinviting={reinviting} />}
            </div>

            <Button variant="secondary" className="ml-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
