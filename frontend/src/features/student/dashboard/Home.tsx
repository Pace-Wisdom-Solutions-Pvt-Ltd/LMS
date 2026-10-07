// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  Award,
  Clock,
  Calendar,
  Sparkles,
  BarChart3,
  PieChart,
  Target,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { getStoredOrganizations } from '@/lib/auth'
import { getRoleBasePath } from '@/lib/constants'
import {
  getStudentDashboardApi,
  getMyProgressApi,
  type ApiStudentDashboard,
  type ApiMyProgress,
} from '@/lib/api/organizations'
import ChartCard from '@/components/ui/charts/ChartCard'
import BarChart from '@/components/ui/charts/BarChart'
import DonutChart from '@/components/ui/charts/DonutChart'
import GaugeChart from '@/components/ui/charts/GaugeChart'

const STATUS_COLORS = {
  completed: '#22c55e',
  inProgress: '#14b8a6',
  notStarted: '#cbd5e1',
} as const

interface CourseProgressRow {
  title: string
  pct: number
}

/** Flatten the batch → course tree into course rows with rounded percentages. */
function extractCourseRows(data: ApiMyProgress): CourseProgressRow[] {
  return data.batches.flatMap((b) =>
    b.courses.map((c) => ({ title: c.title, pct: Math.round(c.completion_percentage) }))
  )
}

interface HighlightItem {
  label: string
  value: number | string
  icon: LucideIcon
  path?: string
}

/** Slim inline metric shown in the "At a glance" strip. */
function Highlight({ item, onNavigate }: Readonly<{ item: HighlightItem; onNavigate: (path: string) => void }>) {
  const { label, value, icon: Icon, path } = item
  const clickable = Boolean(path)
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => path && onNavigate(path)}
      className={`group flex items-center gap-3 p-4 text-left transition-colors ${
        clickable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
      }`}
    >
      <span className="h-10 w-10 shrink-0 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-xl font-bold text-slate-800 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {clickable && (
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-brand-teal" />
          )}
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{label}</span>
      </span>
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-2xl bg-slate-100" />
        <div className="h-64 rounded-2xl bg-slate-100 lg:col-span-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-2xl bg-slate-100" />
        <div className="h-56 rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

export default function StudentHome() {
  const navigate = useNavigate()

  const orgId = useMemo(() => {
    const orgs = getStoredOrganizations()
    return orgs.length > 0 ? String(orgs[0].id) : ''
  }, [])

  const [dashboardData, setDashboardData] = useState<ApiStudentDashboard | null>(null)
  const [progress, setProgress] = useState<ApiMyProgress | null>(null)
  const [loading, setLoading] = useState(() => Boolean(orgId))

  useEffect(() => {
    if (!orgId) return
    let active = true
    Promise.allSettled([getStudentDashboardApi(orgId), getMyProgressApi(orgId)])
      .then(([dash, prog]) => {
        if (!active) return
        if (dash.status === 'fulfilled') setDashboardData(dash.value)
        if (prog.status === 'fulfilled') setProgress(prog.value)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orgId])

  const cards = dashboardData?.cards
  const courseRows = useMemo(() => (progress ? extractCourseRows(progress) : []), [progress])

  // Prefer the authoritative overall figure; fall back to the progress payload.
  const overallPct =
    cards?.overall_completion_percentage ?? progress?.overall_completion_percentage ?? 0

  const statusCounts = useMemo(() => {
    return courseRows.reduce(
      (acc, c) => {
        if (c.pct >= 100) acc.completed += 1
        else if (c.pct > 0) acc.inProgress += 1
        else acc.notStarted += 1
        return acc
      },
      { completed: 0, inProgress: 0, notStarted: 0 }
    )
  }, [courseRows])

  const barData = courseRows.map((c) => ({
    label: c.title,
    value: c.pct,
    color: c.pct >= 100 ? STATUS_COLORS.completed : STATUS_COLORS.inProgress,
  }))

  const learningHours = cards?.learning_hours_this_month ?? 0
  const roleBasePath = getRoleBasePath()
  const highlights: HighlightItem[] = [
    { label: 'Enrolled Courses', value: cards?.enrolled_courses ?? 0, icon: BookOpen, path: `${roleBasePath}/my-courses` },
    { label: 'Pending Assessments', value: cards?.pending_assessments ?? 0, icon: ClipboardCheck, path: `${roleBasePath}/assessments` },
    { label: 'Certificates', value: cards?.certificates_earned ?? 0, icon: Award, path: `${roleBasePath}/progress` },
    { label: 'Learning Hours (Mo.)', value: learningHours, icon: Clock },
    { label: 'Upcoming Due', value: cards?.upcoming_mandatory_due_dates ?? 0, icon: Calendar },
    { label: 'Points', value: dashboardData?.gamification?.points ?? 0, icon: Sparkles },
  ]

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">My Learning Dashboard</h1>
        <p className="text-slate-600 text-xs mt-1">Your progress at a glance</p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* ── Overall progress + course breakdown ── */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard title="Overall Progress" subtitle="Completion across all courses" icon={Target}>
              <div className="flex flex-col items-center justify-center py-2">
                <GaugeChart
                  value={overallPct}
                  label="Complete"
                  sublabel={
                    progress ? `${progress.completed_nodes}/${progress.total_nodes} lessons` : undefined
                  }
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Course Progress"
              subtitle="Completion by course"
              icon={BarChart3}
              className="lg:col-span-2"
            >
              <BarChart
                data={barData}
                maxBars={6}
                valueFormatter={(v) => `${v}%`}
                emptyText="You're not enrolled in any courses yet."
              />
            </ChartCard>
          </div>

          {/* ── Course status + at a glance ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Course Status" subtitle="How your courses are progressing" icon={PieChart}>
              {courseRows.length > 0 ? (
                <DonutChart
                  size={150}
                  centerValue={courseRows.length}
                  centerLabel="Courses"
                  data={[
                    { label: 'Completed', value: statusCounts.completed, color: STATUS_COLORS.completed },
                    { label: 'In Progress', value: statusCounts.inProgress, color: STATUS_COLORS.inProgress },
                    { label: 'Not Started', value: statusCounts.notStarted, color: STATUS_COLORS.notStarted },
                  ]}
                />
              ) : (
                <p className="text-[13px] text-slate-400 py-6 text-center">No course data available.</p>
              )}
            </ChartCard>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
                <span className="h-8 w-8 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">At a Glance</h3>
                  <p className="text-[12px] text-slate-500">Key learning stats</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 mt-2 border-t border-slate-100">
                {highlights.map((item) => (
                  <Highlight key={item.label} item={item} onNavigate={navigate} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
