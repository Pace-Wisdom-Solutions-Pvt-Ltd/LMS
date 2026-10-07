// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import { getStoredOrganizations } from '@/lib/auth'
import { getMyProgressApi, type ApiMyProgress } from '@/lib/api/organizations'
import { TrendingUp, Loader2 } from 'lucide-react'

function extractProgressRows(data: ApiMyProgress) {
  return data.batches.flatMap((b) =>
    b.courses.map((c) => ({ title: c.title, pct: Math.round(c.completion_percentage) }))
  )
}

export default function StudentProgress() {
  const orgs = getStoredOrganizations()
  const orgId = orgs[0]?.id?.toString() ?? ''

  const [overallPct, setOverallPct] = useState(0)
  const [courseBreakdown, setCourseBreakdown] = useState<{ title: string; pct: number }[]>([])
  const [loadingProgress, setLoadingProgress] = useState(true)

  useEffect(() => {
    if (!orgId) return
    getMyProgressApi(orgId)
      .then((data) => {
        setOverallPct(Math.round(data.overall_completion_percentage))
        setCourseBreakdown(extractProgressRows(data))
      })
      .catch(() => {})
      .finally(() => setLoadingProgress(false))
  }, [orgId])

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">My Learning Progress</h1>
        <p className="text-slate-600 text-xs mt-1">Overall completion and course-wise breakdown</p>
      </div>

      {/* ── Progress cards ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-teal" />
            Overall Progress
          </h3>
          {loadingProgress ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center shrink-0"
                style={{ border: `8px solid`, borderColor: `rgba(20,184,166,${Math.max(0.15, overallPct / 100)})` }}
              >
                <span className="text-xl font-bold text-slate-800">{overallPct}%</span>
              </div>
              <p className="text-sm text-slate-600">Completion across all courses</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Course-wise Breakdown</h3>
          {loadingProgress && (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            </div>
          )}
          {!loadingProgress && courseBreakdown.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No course data available.</p>
          )}
          {!loadingProgress && courseBreakdown.length > 0 && (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {courseBreakdown.map((c) => (
                <div key={c.title}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-800 truncate">{c.title}</span>
                    <span className="text-slate-600 shrink-0 ml-2">{c.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
