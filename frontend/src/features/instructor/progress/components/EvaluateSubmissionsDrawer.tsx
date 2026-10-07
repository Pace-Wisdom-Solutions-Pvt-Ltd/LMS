// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Loader2, Search } from 'lucide-react'
import Dropdown from '@/components/ui/Dropdown'
import SegmentedControl from '@/components/ui/SegmentedControl'
import SideDrawer from '@/components/ui/SideDrawer'
import type { SubmissionReviewValues } from '@/components/course/SubmissionReviewPanel'
import {
  getPendingEvaluationsApi,
  reviewTaskSubmissionApi,
} from '@/lib/api/organizations'
import { showToast } from '@/lib/toastApi'
import EvaluationCard, { type Evaluation } from './EvaluationCard'

type EvaluationType = 'assessment' | 'quiz'
type EvaluationStatus = 'pending' | 'completed'
type StatusFilter = 'all' | EvaluationStatus
type TaggedEvaluation = Evaluation & { _status: EvaluationStatus }

const TYPE_OPTIONS = [
  { value: 'assessment' as const, label: 'Assessments' },
  { value: 'quiz' as const, label: 'Quizzes' },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'completed' as const, label: 'Completed' },
]

/** Assessment rows carry a task title; quiz rows carry a quiz name. */
function getEvaluationTitle(item: Evaluation): string {
  return 'task_title' in item ? item.task_title : item.quiz_name
}

interface EvaluateSubmissionsDrawerProps {
  open: boolean
  onClose: () => void
  orgId: string
  /** Student UUID from the progress row. */
  studentId: string
  studentName: string
  courseId: number | string
  courseTitle: string
}

/**
 * Slide-over that lists a single student's submissions for one course and lets
 * the trainer grade each pending task submission without leaving the list.
 */
export default function EvaluateSubmissionsDrawer({
  open,
  onClose,
  orgId,
  studentId,
  studentName,
  courseId,
  courseTitle,
}: Readonly<EvaluateSubmissionsDrawerProps>) {
  const [type, setType] = useState<EvaluationType>('assessment')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [allItems, setAllItems] = useState<TaggedEvaluation[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Fetches both statuses up front so switching the status filter or typing a
  // search query afterwards is a pure UI-level filter — no refetch per keystroke/click.
  const fetchEvaluations = useCallback(async () => {
    if (!open || !orgId || !studentId) return
    setLoading(true)
    try {
      const [pending, completed] = await Promise.all([
        getPendingEvaluationsApi(orgId, { type, status: 'pending', student_id: studentId, course_id: courseId }),
        getPendingEvaluationsApi(orgId, { type, status: 'completed', student_id: studentId, course_id: courseId }),
      ])
      setAllItems([
        ...pending.results.map((item) => ({ ...item, _status: 'pending' as const })),
        ...completed.results.map((item) => ({ ...item, _status: 'completed' as const })),
      ])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load submissions.', 'error')
      setAllItems([])
    } finally {
      setLoading(false)
    }
  }, [open, orgId, studentId, courseId, type])

  useEffect(() => {
    fetchEvaluations()
  }, [fetchEvaluations])

  useEffect(() => {
    setExpandedId(null)
    setSearch('')
  }, [type])

  const items = useMemo(() => {
    let list: TaggedEvaluation[] = statusFilter === 'all'
      ? allItems
      : allItems.filter((item) => item._status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((item) => getEvaluationTitle(item).toLowerCase().includes(q))
    }
    return list
  }, [allItems, statusFilter, search])

  const handleReview = async (
    submissionId: number,
    decision: 'Approved' | 'Rejected',
    values: SubmissionReviewValues
  ): Promise<boolean> => {
    try {
      await reviewTaskSubmissionApi(orgId, submissionId, { decision, ...values })
      showToast(`Submission ${decision.toLowerCase()} successfully.`, 'success')
      setExpandedId(null)
      await fetchEvaluations()
      return true
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit review.', 'error')
      return false
    }
  }

  const itemNoun = type === 'quiz' ? 'quiz attempts' : 'submissions'
  let emptyLabel = `No ${itemNoun} for this student.`
  if (search.trim()) {
    emptyLabel = `No ${itemNoun} match "${search.trim()}".`
  } else if (statusFilter === 'pending') {
    emptyLabel = `No pending ${itemNoun} for this student.`
  } else if (statusFilter === 'completed') {
    emptyLabel = `No completed ${itemNoun} yet.`
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={`Evaluate — ${studentName}`}
      subtitle={courseTitle}
      maxWidth="max-w-xl"
      toolbar={
        <div className="flex flex-col gap-2">
          <SegmentedControl
            label="Submission type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={setType}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Dropdown
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={setStatusFilter}
              compact
              className="sm:w-36"
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${itemNoun}…`}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              />
            </div>
          </div>
        </div>
      }
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
          <p className="text-xs font-medium">Loading submissions…</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
          <ClipboardCheck className="h-8 w-8 text-slate-300" />
          <p className="text-sm">{emptyLabel}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <EvaluationCard
              key={`${type}-${item.id}`}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onReview={handleReview}
            />
          ))}
        </div>
      )}
    </SideDrawer>
  )
}
