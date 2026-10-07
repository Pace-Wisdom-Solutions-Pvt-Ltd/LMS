// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { GitBranch, UserCog, Users, BookOpen, BarChart3, PieChart, AlertCircle } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/charts/ChartCard'
import BarChart from '@/components/ui/charts/BarChart'
import DonutChart from '@/components/ui/charts/DonutChart'
import StatusDonutCard from './StatusDonutCard'
import OrganizationAnalyticsSkeleton from './OrganizationAnalyticsSkeleton'
import { paletteColor } from './palette'
import { useOrganizationAnalytics } from './useOrganizationAnalytics'

interface OrganizationAnalyticsProps {
  orgId: string
}

/**
 * Analytics panel for the organization KPI dashboard: summary metrics, active/inactive
 * status donuts, and distribution charts (students per batch, staff by role,
 * courses per batch). Composes the generic chart primitives — no chart lib.
 */
export default function OrganizationAnalytics({ orgId }: OrganizationAnalyticsProps) {
  const { loading, error, data } = useOrganizationAnalytics(orgId)

  if (loading) {
    return <OrganizationAnalyticsSkeleton />
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
        <p className="text-slate-500">Couldn't load analytics for this organization.</p>
      </div>
    )
  }

  const { totals, status, studentsPerBatch, staffByRole, coursesPerBatch } = data
  const activeRate = (split: { active: number; inactive: number }) => {
    const total = split.active + split.inactive
    return total > 0 ? `${Math.round((split.active / total) * 100)}% active` : undefined
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Summary metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Batches"
          value={totals.batches}
          icon={GitBranch}
          iconClass="bg-brand-teal/10 text-brand-teal"
          hint={activeRate(status.batches)}
        />
        <StatCard
          label="Staff"
          value={totals.staff}
          icon={UserCog}
          iconClass="bg-violet-500/10 text-violet-600"
          hint={activeRate(status.staff)}
        />
        <StatCard
          label="Students"
          value={totals.students}
          icon={Users}
          iconClass="bg-brand-blue/10 text-brand-blue"
          hint={activeRate(status.students)}
        />
        <StatCard
          label="Courses Assigned"
          value={totals.courses}
          icon={BookOpen}
          iconClass="bg-amber-500/10 text-amber-600"
        />
      </div>

      {/* ── Active / inactive status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusDonutCard title="Batch Status" icon={GitBranch} split={status.batches} />
        <StatusDonutCard title="Staff Status" icon={UserCog} split={status.staff} />
        <StatusDonutCard title="Student Status" icon={Users} split={status.students} />
      </div>

      {/* ── Distributions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Students per Batch"
          subtitle="Enrollment distribution across batches"
          icon={BarChart3}
        >
          <BarChart
            data={studentsPerBatch}
            color="#3b82f6"
            emptyText="No students enrolled yet."
          />
        </ChartCard>

        <ChartCard
          title="Staff by Role"
          subtitle={`${totals.staff.toLocaleString()} staff total`}
          icon={PieChart}
        >
          {staffByRole.length > 0 ? (
            <DonutChart
              size={150}
              data={staffByRole.map((r, i) => ({
                label: r.label,
                value: r.value,
                color: paletteColor(i),
              }))}
            />
          ) : (
            <p className="text-[13px] text-slate-400 py-6 text-center">No staff added yet.</p>
          )}
        </ChartCard>

        <ChartCard
          title="Courses per Batch"
          subtitle="How many courses each batch offers"
          icon={BarChart3}
          className="lg:col-span-2"
        >
          <BarChart
            data={coursesPerBatch}
            color="#14b8a6"
            emptyText="No courses assigned to batches yet."
          />
        </ChartCard>
      </div>
    </div>
  )
}
