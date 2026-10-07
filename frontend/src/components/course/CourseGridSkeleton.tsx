// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import Skeleton from '@/components/ui/Skeleton'

/**
 * Loading placeholder for the enrolled-courses grid. Mirrors CourseCard's layout
 * (thumbnail → title → description → footer) so the swap to loaded cards is
 * seamless. `cards` controls how many placeholders are shown.
 */
export default function CourseGridSkeleton({ cards = 6 }: { readonly cards?: number }) {
  const cardKeys = Array.from({ length: cards }, (_, i) => i)

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
      data-testid="course-grid-skeleton"
      aria-busy="true"
    >
      {cardKeys.map((key) => (
        <div
          key={key}
          className="bg-white rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col"
        >
          {/* Thumbnail */}
          <Skeleton className="w-full aspect-[16/10] rounded-2xl mb-6" />
          {/* Title */}
          <Skeleton className="h-4 w-3/4 mb-2" />
          {/* Description (two lines) */}
          <Skeleton className="h-3 w-full mb-1.5" />
          <Skeleton className="h-3 w-2/3 mb-6" />
          {/* Footer: avatar + label, trailing chevron */}
          <div className="flex items-center justify-between pt-5 mt-auto w-full">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
