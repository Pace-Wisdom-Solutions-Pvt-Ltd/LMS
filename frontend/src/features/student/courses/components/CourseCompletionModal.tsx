// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Award, Sparkles, Eye } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface CourseCompletionModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly courseTitle: string
  readonly onViewCertificate?: () => void
}

/** Celebratory modal shown once a student finishes every node in a course. */
export default function CourseCompletionModal({
  open,
  onClose,
  courseTitle,
  onViewCertificate,
}: CourseCompletionModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center relative overflow-hidden py-2 text-center">
        {/* Floating Celebration Sparkles Background */}
        <div className="absolute -top-6 -left-6 w-24 h-24 bg-brand-teal/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/15 rounded-full blur-xl pointer-events-none" />

        {/* Celebratory Icon Badge */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-teal/20 via-teal-50 to-amber-100 flex items-center justify-center border-2 border-brand-teal/30 shadow-inner">
            <Award className="h-8 w-8 text-brand-teal animate-bounce" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-500 animate-pulse" />
        </div>

        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold tracking-wide">
            🎉 Course Completed!
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            Congratulations!
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto">
            You've officially completed{' '}
            <span className="font-semibold text-slate-800">{courseTitle}</span>. Your Certificate of Completion has been generated.
          </p>
        </div>

        <div className="w-full space-y-2.5">
          {onViewCertificate && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onViewCertificate()
              }}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal/90 text-white shadow-md shadow-teal-700/20"
            >
              <Eye className="w-4 h-4" />
              View & Download Certificate
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  )
}
