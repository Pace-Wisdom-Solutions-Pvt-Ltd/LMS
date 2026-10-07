// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import Skeleton from '@/components/ui/Skeleton'

/**
 * Loading placeholder for the student course roadmap. Mirrors the real layout
 * (status header + collapsible section cards) so the swap to loaded content is
 * seamless. `sections` controls how many placeholder cards are shown.
 */
export default function RoadmapSkeleton({ sections = 4 }: { readonly sections?: number }) {
  const sectionKeys = Array.from({ length: sections }, (_, i) => i)

  return (
    <div className="max-w-5xl mx-auto space-y-4" data-testid="roadmap-skeleton" aria-busy="true">
      {/* Back link */}
      <Skeleton className="h-5 w-32" />

      {/* Status header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-10" />
        </div>
        <div className="space-y-2 p-4 bg-slate-50/50 rounded-xl">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>

      {/* Section cards */}
      <div className="space-y-6">
        {sectionKeys.map((key) => (
          <div key={key} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <Skeleton className="h-1 w-full rounded-none" />
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex flex-1 items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
