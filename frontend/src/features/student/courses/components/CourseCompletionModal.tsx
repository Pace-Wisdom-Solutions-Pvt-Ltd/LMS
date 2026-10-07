// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Award } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface CourseCompletionModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly courseTitle: string
}

/** Celebratory modal shown once a student finishes every node in a course. */
export default function CourseCompletionModal({
  open,
  onClose,
  courseTitle,
}: CourseCompletionModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center">
        <div className="p-3 rounded-full mb-4 bg-brand-teal/10">
          <Award className="h-6 w-6 text-brand-teal" />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Congratulations!</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            You've completed <span className="font-semibold text-slate-800">{courseTitle}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 bg-brand-teal hover:opacity-90 text-white shadow-sm"
        >
          Continue
        </button>
      </div>
    </Modal>
  )
}
