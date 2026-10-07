// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import UserDetailsGrid from '../components/UserDetailsGrid'
import ReinviteButton from '../components/ReinviteButton'

export type StudentDetails = {
  name: string
  email: string
  phone: string
  studentId: string
  batch: string
  course: string
  enrolledAt: string
  userStatus: string
  studentUuid: string
}

export default function StudentDetailsModal({
  open,
  onClose,
  loading,
  details,
  reinviting,
  onReinvite,
}: Readonly<{
  open: boolean
  onClose: () => void
  loading: boolean
  details: StudentDetails | null
  reinviting: boolean
  onReinvite: () => void
}>) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-base font-bold text-slate-800 mb-4 pr-8">Student Details</h2>

      {loading && <div className="py-8 text-sm text-slate-600">Loading…</div>}
      {!loading && !details && <div className="py-8 text-sm text-slate-600">No details.</div>}

      {!loading && details && (
        <div className="space-y-4">
          <UserDetailsGrid
            fields={[
              { label: 'Name', value: details.name },
              { label: 'Student ID', value: details.studentId },
              { label: 'Email', value: details.email, full: true },
              { label: 'Phone', value: details.phone },
              { label: 'Batch', value: details.batch },
              { label: 'Course', value: details.course },
              { label: 'Enrolled', value: details.enrolledAt },
            ]}
          />

          <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {details.userStatus === 'expired' && <ReinviteButton onReinvite={onReinvite} reinviting={reinviting} />}
            </div>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
