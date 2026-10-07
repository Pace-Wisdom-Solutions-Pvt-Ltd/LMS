// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import Skeleton from '@/components/ui/Skeleton'

/**
 * Loading placeholder for {@link OrganizationAnalytics}. Mirrors the real layout
 * (summary stat cards → status donuts → distribution charts) so the swap to
 * loaded content is seamless.
 */
export default function OrganizationAnalyticsSkeleton() {
  const statKeys = Array.from({ length: 4 }, (_, i) => i)
  const donutKeys = Array.from({ length: 3 }, (_, i) => i)

  return (
    <div className="space-y-6" aria-busy="true" data-testid="org-analytics-skeleton">
      {/* ── Summary metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statKeys.map((key) => (
          <div key={key} className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <Skeleton className="h-10 w-10 rounded-xl mb-3" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-20 mt-2" />
            <Skeleton className="h-3 w-14 mt-2" />
          </div>
        ))}
      </div>

      {/* ── Active / inactive status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {donutKeys.map((key) => (
          <div key={key} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center justify-center py-2">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Distributions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton className="lg:col-span-2" />
      </div>
    </div>
  )
}

function ChartCardSkeleton({ className = '' }: { readonly className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 ${className}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex items-end gap-3 h-40 pt-2">
        {[60, 90, 45, 75, 55, 85].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}
