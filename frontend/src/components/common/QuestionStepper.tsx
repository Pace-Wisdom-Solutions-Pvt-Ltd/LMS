// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

/**
 * State of a single question, used to colour the palette pills and drive the
 * progress summary.
 * - `answer` mode uses `answered` / `unanswered`
 * - `review` mode uses `correct` / `incorrect`
 */
export type QuestionState = 'answered' | 'unanswered' | 'correct' | 'incorrect'

export interface QuestionStepperProps {
  /** Total number of questions. */
  count: number
  /** Currently visible question index (controlled). */
  current: number
  /** Called when the user navigates to another question. */
  onNavigate: (index: number) => void
  /** Renders the body (prompt + options) for the question at `index`. */
  renderQuestion: (index: number) => ReactNode
  /** Per-question state — powers the palette colours and progress counts. */
  getState: (index: number) => QuestionState
  /**
   * `answer` (default): shows "answered / pending", Next advances and the last
   * question swaps Next for `submitAction`.
   * `review`: shows "correct / total", read-only navigation, no submit.
   */
  mode?: 'answer' | 'review'
  /** Final primary action shown on the last question in `answer` mode (e.g. a Submit button). */
  submitAction?: ReactNode
  /** Optional node rendered at the top-right of the header (e.g. a countdown timer). */
  headerRight?: ReactNode
  className?: string
}

const PILL_BASE =
  'h-8 w-8 shrink-0 rounded-lg text-xs font-semibold flex items-center justify-center border transition-colors'

function pillClass(state: QuestionState, isCurrent: boolean): string {
  if (isCurrent) return `${PILL_BASE} border-brand-teal bg-brand-teal text-white ring-2 ring-brand-teal/30`
  switch (state) {
    case 'answered':
      return `${PILL_BASE} border-brand-teal/30 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20`
    case 'correct':
      return `${PILL_BASE} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`
    case 'incorrect':
      return `${PILL_BASE} border-red-200 bg-red-50 text-red-600 hover:bg-red-100`
    default:
      return `${PILL_BASE} border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50`
  }
}

/**
 * Reusable one-question-at-a-time navigator with a progress summary, a jump-to
 * palette and Previous/Next controls. Used by both the assessment answering flow
 * and the read-only answer-review flow.
 */
export default function QuestionStepper({
  count,
  current,
  onNavigate,
  renderQuestion,
  getState,
  mode = 'answer',
  submitAction,
  headerRight,
  className = '',
}: Readonly<QuestionStepperProps>) {
  const safeIdx = Math.min(Math.max(current, 0), Math.max(count - 1, 0))
  const isReview = mode === 'review'

  const states = Array.from({ length: count }, (_, i) => getState(i))
  const answered = states.filter(s => s === 'answered').length
  const correct = states.filter(s => s === 'correct').length
  const pending = count - answered

  const progressValue = isReview ? correct : answered
  const progressPct = count ? (progressValue / count) * 100 : 0

  const goPrev = () => onNavigate(Math.max(safeIdx - 1, 0))
  const goNext = () => onNavigate(Math.min(safeIdx + 1, count - 1))
  const isFirst = safeIdx === 0
  const isLast = safeIdx === count - 1

  return (
    <div className={`space-y-5 ${className}`}>
      {/* ── Progress summary ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Question {safeIdx + 1} of {count}
            </p>
            {isReview ? (
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                <span className="text-emerald-600 font-semibold">{correct}</span> / {count} correct
              </p>
            ) : (
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                <span className="text-brand-teal font-semibold">{answered} answered</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span className={pending > 0 ? 'text-amber-600' : 'text-slate-400'}>{pending} pending</span>
              </p>
            )}
          </div>
          {headerRight}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isReview ? 'bg-emerald-500' : 'bg-brand-teal'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Jump-to palette */}
        {count > 1 && (
          <div className="flex flex-wrap gap-2">
            {states.map((state, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === safeIdx ? 'true' : undefined}
                className={pillClass(state, i === safeIdx)}
              >
                {!isReview && state === 'answered' && i !== safeIdx ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Current question ── */}
      <div className="animate-fade-in">{renderQuestion(safeIdx)}</div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-5">
        <button
          type="button"
          onClick={goPrev}
          disabled={isFirst}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {isLast && !isReview && submitAction ? (
          submitAction
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={isLast}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
