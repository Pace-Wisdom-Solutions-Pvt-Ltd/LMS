// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
import SubmissionPayloadView from '@/components/course/SubmissionPayloadView'
import SubmissionReviewPanel, { type SubmissionReviewValues } from '@/components/course/SubmissionReviewPanel'
import type { ApiAssessmentEvaluation, ApiQuizEvaluation } from '@/lib/api/organizations'

export type Evaluation = ApiAssessmentEvaluation | ApiQuizEvaluation

/** Assessment rows carry a task title; quiz rows carry a quiz name. */
function isAssessmentEvaluation(item: Evaluation): item is ApiAssessmentEvaluation {
  return 'task_title' in item
}

const STATUS_CLS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  graded: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-600',
  pending: 'bg-amber-100 text-amber-700',
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const cls = STATUS_CLS[status.toLowerCase()] ?? 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>
}

function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleString() : '—'
}

interface EvaluationCardProps {
  item: Evaluation
  expanded: boolean
  onToggle: () => void
  /** Grades the submission. Resolve `true` when the server accepted the review. */
  onReview: (submissionId: number, decision: 'Approved' | 'Rejected', values: SubmissionReviewValues) => Promise<boolean>
}

/**
 * One row in the evaluate drawer: an expandable task submission with its review
 * form, or a read-only quiz attempt summary.
 */
export default function EvaluationCard({ item, expanded, onToggle, onReview }: Readonly<EvaluationCardProps>) {
  if (!isAssessmentEvaluation(item)) return <QuizEvaluationCard item={item} />

  const status = item.status ?? 'Pending'
  const isFinalized = ['approved', 'rejected'].includes(status.toLowerCase())

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
              Task
            </span>
            <StatusBadge status={status} />
          </div>
          <h4 className="truncate text-sm font-semibold text-slate-800">{item.task_title}</h4>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {item.module_title} › {item.node_title}
          </p>
          <p className="mt-1 text-xs text-slate-400">Submitted {formatDate(item.submitted_at)}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180 text-brand-teal' : 'text-slate-300'}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          <SubmissionPayloadView payload={item.payload} fileUrl={item.file_url} previewHeight="max-h-60" />

          {item.awarded_score != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Score</span>
              <span className="rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-bold text-brand-teal">
                {item.awarded_score} / 100
              </span>
            </div>
          )}

          {item.feedback && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="mb-0.5 block font-semibold text-slate-500">Feedback</span>
              {item.feedback}
            </div>
          )}

          {isFinalized ? (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-3 ${
                status.toLowerCase() === 'approved'
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-red-100 bg-red-50'
              }`}
            >
              {status.toLowerCase() === 'approved' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span
                className={`text-xs font-semibold ${
                  status.toLowerCase() === 'approved' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                Submission {status}
              </span>
            </div>
          ) : (
            <SubmissionReviewPanel
              onReview={(decision, values) => onReview(item.id, decision, values)}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Quiz attempts are auto-scored, so they are shown read-only. */
function QuizEvaluationCard({ item }: Readonly<{ item: ApiQuizEvaluation }>) {
  const passed = item.passed ?? false
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
          Quiz
        </span>
        {item.passed != null && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {passed ? 'Passed' : 'Failed'}
          </span>
        )}
      </div>
      <h4 className="truncate text-sm font-semibold text-slate-800">{item.quiz_name}</h4>
      <p className="mt-0.5 truncate text-xs text-slate-500">
        {item.module_title} › {item.node_title}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-400">Submitted {formatDate(item.submitted_at)}</p>
        {item.score != null && (
          <span className="rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-bold text-brand-teal">
            {item.score}%
          </span>
        )}
      </div>
    </div>
  )
}
