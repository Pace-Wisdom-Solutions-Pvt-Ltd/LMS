// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Users, Search, Download, Loader2, ClipboardCheck } from 'lucide-react'
import Dropdown from '@/components/ui/Dropdown'
import SortableHeader from '@/components/ui/SortableHeader'
import EvaluateSubmissionsDrawer from './components/EvaluateSubmissionsDrawer'
import {
  getLearnerProgressPaginatedApi,
  getPublishedCoursesApi,
  exportAllLearnerProgressApi,
  type ApiLearnerProgress,
  type ApiCourse
} from '@/lib/api/organizations'
import { getStoredOrganizations, getStoredUser } from '@/lib/auth'
import { saveBlob } from '@/lib/download'
import { showToast } from '@/lib/toastApi'

const LP_SORT_FIELDS = new Set(['learner_name', 'completion_percentage', 'last_activity'])

export default function LearnerProgress() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ApiLearnerProgress[]>([])
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [filterCourse, setFilterCourse] = useState('')
  const [filterLearner, setFilterLearner] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [exporting, setExporting] = useState(false)
  const [evaluating, setEvaluating] = useState<ApiLearnerProgress | null>(null)

  const orgId = getStoredOrganizations()?.[0]?.id
  const teacherId = getStoredUser()?.id

  const getOrdering = () => {
    if (sortKey && LP_SORT_FIELDS.has(sortKey)) {
      return `${sortDir === 'desc' ? '-' : ''}${sortKey}`
    }
    return '-last_activity'
  }

  const handleSort = (key: string) => {
    if (!LP_SORT_FIELDS.has(key)) return
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const fetchData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [progressData, coursesData] = await Promise.all([
        getLearnerProgressPaginatedApi(String(orgId), teacherId ?? undefined, getOrdering()),
        getPublishedCoursesApi(String(orgId))
      ])
      setProgress(progressData.results)
      setCourses(coursesData)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch student progress.', 'error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, teacherId, sortKey, sortDir])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    let list = progress
    if (filterCourse) {
      list = list.filter((p) => p.course_id === Number(filterCourse))
    }
    if (filterLearner) {
      const q = filterLearner.toLowerCase()
      list = list.filter((p) =>
        p.learner_name.toLowerCase().includes(q) ||
        p.student_id.toLowerCase().includes(q)
      )
    }
    return list
  }, [progress, filterCourse, filterLearner])

  const handleExport = async () => {
    if (!orgId) return
    if (!teacherId) {
      showToast('Unable to export: missing teacher information.', 'error')
      return
    }
    setExporting(true)
    try {
      const blob = await exportAllLearnerProgressApi(String(orgId), {
        teacherId: String(teacherId),
        courseId: filterCourse || undefined,
        ordering: getOrdering(),
        search: filterLearner.trim() || undefined,
      })
      saveBlob(blob, `learner-progress-${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Export started.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export learner progress.', 'error')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        <p className="font-medium">Loading learner progress...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-teal" />
            Student Progress Tracking
          </h2>
          <p className="text-sm text-slate-500 mt-1">Monitor individual student progress by course. Filter by course or student.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filterLearner}
            onChange={(e) => setFilterLearner(e.target.value)}
            placeholder="Search by student name or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
          />
        </div>
        <Dropdown
          value={filterCourse}
          options={[{ value: '', label: 'All courses' }, ...courses.map((c) => ({ value: String(c.id), label: c.title }))]}
          onChange={setFilterCourse}
          className="sm:w-48"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No student progress data for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <SortableHeader label="Student" sortKey="learner_name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Course</th>
                  <SortableHeader label="Completion %" sortKey="completion_percentage" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap text-center" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap text-center">Modules</th>
                  <SortableHeader label="Last Activity" sortKey="last_activity" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={`${p.student_id}-${p.course_id}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{p.learner_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.course_title}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-brand-teal rounded-full"
                            style={{ width: `${p.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{p.completion_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-center">{p.modules_progress}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm whitespace-nowrap">
                      {p.last_activity ? new Date(p.last_activity).toLocaleString() : 'No activity'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEvaluating(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-teal/30 bg-brand-teal/5 px-2.5 py-1.5 text-sm font-medium text-brand-teal hover:bg-brand-teal/10"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Evaluate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {evaluating !== null && orgId !== undefined && (
        <EvaluateSubmissionsDrawer
          key={`${evaluating.student_id}-${evaluating.course_id}`}
          open
          onClose={() => setEvaluating(null)}
          orgId={String(orgId)}
          studentId={evaluating.student_id}
          studentName={evaluating.learner_name}
          courseId={evaluating.course_id}
          courseTitle={evaluating.course_title}
        />
      )}
    </div>
  )
}
