// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useId, useState } from 'react'
import { Loader2, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react'

export interface SubmissionReviewValues {
  awarded_score?: number
  feedback?: string
}

interface SubmissionReviewPanelProps {
  /**
   * Sends the review. Resolve `true` to clear the form (the submission was
   * accepted by the server), `false` to keep what the trainer typed.
   */
  onReview: (decision: 'Approved' | 'Rejected', values: SubmissionReviewValues) => Promise<boolean>
  /** Upper bound for the score input, shown next to the label. Defaults to 100. */
  maxScore?: number
  disabled?: boolean
  className?: string
}

/**
 * Score + feedback form with Approve / Reject actions for a task submission.
 * Shared by the learner progress detail page and the evaluate drawer.
 */
export default function SubmissionReviewPanel({
  onReview,
  maxScore = 100,
  disabled = false,
  className = '',
}: Readonly<SubmissionReviewPanelProps>) {
  const fieldId = useId()
  const [feedback, setFeedback] = useState('')
  const [awardedScore, setAwardedScore] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  const handleReview = async (decision: 'Approved' | 'Rejected') => {
    setSaving(true)
    try {
      const ok = await onReview(decision, {
        awarded_score: awardedScore === '' ? undefined : Number(awardedScore),
        feedback: feedback.trim() || undefined,
      })
      if (ok) {
        setFeedback('')
        setAwardedScore('')
      }
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || disabled

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 space-y-3 ${className}`}>
      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-brand-teal" />
        Review Submission
      </h4>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor={`${fieldId}-score`}>
          Score <span className="text-slate-400 font-normal">(optional, out of {maxScore})</span>
        </label>
        <input
          id={`${fieldId}-score`}
          type="number"
          min={0}
          max={maxScore}
          value={awardedScore}
          onChange={e => setAwardedScore(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="e.g. 85"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor={`${fieldId}-feedback`}>
          Feedback <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id={`${fieldId}-feedback`}
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3}
          placeholder="Write feedback for the learner…"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleReview('Approved')}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
          Approve
        </button>
        <button
          type="button"
          onClick={() => handleReview('Rejected')}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
          Reject
        </button>
      </div>
    </div>
  )
}
