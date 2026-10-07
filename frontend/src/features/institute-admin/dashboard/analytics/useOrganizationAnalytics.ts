// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import {
  getBatchesPaginatedApi,
  getStaffPaginatedApi,
  getOrgStudentsPaginatedApi,
  type ApiBatch,
  type ApiStaff,
  type ApiStudent,
} from '@/lib/api/organizations'

/** Shared shape of the paginated list endpoints used here. */
interface Page<T> {
  count: number
  results: T[]
}

/** Guard so a runaway/huge org can't fire hundreds of requests. */
const MAX_PAGES = 25

/**
 * Fetch every record across a paginated endpoint. Pulls page 1, derives the
 * page size + total pages from `count`, then loads the rest in parallel.
 */
async function fetchAll<T>(fetchPage: (page: number) => Promise<Page<T>>): Promise<T[]> {
  const first = await fetchPage(1)
  const pageSize = first.results.length
  if (pageSize === 0) return []

  const totalPages = Math.min(Math.ceil(first.count / pageSize), MAX_PAGES)
  if (totalPages <= 1) return first.results

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
  )
  return rest.reduce<T[]>((acc, page) => acc.concat(page.results), [...first.results])
}

export interface StatusSplit {
  active: number
  inactive: number
}

export interface LabelledCount {
  label: string
  value: number
}

export interface OrgAnalytics {
  totals: { batches: number; staff: number; students: number; courses: number }
  status: { batches: StatusSplit; staff: StatusSplit; students: StatusSplit }
  studentsPerBatch: LabelledCount[]
  staffByRole: LabelledCount[]
  coursesPerBatch: LabelledCount[]
}

const isBatchActive = (b: ApiBatch) => b.is_active !== false
const isStaffActive = (s: ApiStaff) => s.is_active ?? s.user_detail?.is_active ?? false
const isStudentActive = (s: ApiStudent) =>
  s.is_active ?? (s.status ? s.status.toLowerCase() === 'active' : true)

const staffRoleName = (s: ApiStaff) => s.role_detail?.name || s.role_detail?.title || 'Unspecified'
const primaryBatchName = (s: ApiStudent) => s.batch_detail?.[0]?.name || 'Unassigned'

/** Tally a list into label→count pairs sorted by count desc. */
function tally<T>(items: T[], keyOf: (item: T) => string): LabelledCount[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyOf(item)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function splitStatus<T>(items: T[], activeOf: (item: T) => boolean): StatusSplit {
  const active = items.filter(activeOf).length
  return { active, inactive: items.length - active }
}

function aggregate(batches: ApiBatch[], staff: ApiStaff[], students: ApiStudent[]): OrgAnalytics {
  const totalCourses = batches.reduce((sum, b) => sum + (b.courses_detail?.length ?? 0), 0)

  return {
    totals: {
      batches: batches.length,
      staff: staff.length,
      students: students.length,
      courses: totalCourses,
    },
    status: {
      batches: splitStatus(batches, isBatchActive),
      staff: splitStatus(staff, isStaffActive),
      students: splitStatus(students, isStudentActive),
    },
    studentsPerBatch: tally(students, primaryBatchName),
    staffByRole: tally(staff, staffRoleName),
    coursesPerBatch: batches
      .map(b => ({ label: b.name, value: b.courses_detail?.length ?? 0 }))
      .sort((a, b) => b.value - a.value),
  }
}

interface AnalyticsState {
  loading: boolean
  error: boolean
  data: OrgAnalytics | null
}

/**
 * Loads batches, staff and students for an org (all pages) and returns the
 * aggregated analytics used by the Analytics tab.
 */
export function useOrganizationAnalytics(orgId: string | undefined): AnalyticsState {
  // Result of the last settled request, tagged with its org; anything else is loading.
  const [result, setResult] = useState<{ orgId: string; error: boolean; data: OrgAnalytics | null } | null>(null)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false

    Promise.all([
      fetchAll(page => getBatchesPaginatedApi(orgId, page)),
      fetchAll(page => getStaffPaginatedApi(orgId, page)),
      fetchAll(page => getOrgStudentsPaginatedApi(orgId, page)),
    ])
      .then(([batches, staff, students]) => {
        if (cancelled) return
        setResult({ orgId, error: false, data: aggregate(batches, staff, students) })
      })
      .catch(() => {
        if (!cancelled) setResult({ orgId, error: true, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [orgId])

  if (!result || result.orgId !== orgId) return { loading: true, error: false, data: null }
  return { loading: false, error: result.error, data: result.data }
}
