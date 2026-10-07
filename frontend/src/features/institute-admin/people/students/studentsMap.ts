// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ApiStudent, ApiStudentDetail } from '@/lib/api/organizations'
import type { StudentRow } from './types'

export function getCourseTitle(courseDetail: unknown): string | null {
  if (typeof courseDetail === 'string') return courseDetail
  if (courseDetail && typeof courseDetail === 'object' && 'title' in courseDetail) {
    const t = (courseDetail as { title?: unknown }).title
    if (typeof t === 'string') return t
  }
  return null
}

type RawStudent = ApiStudent & {
  user_detail?: { status?: string }
  student_detail?: ApiStudentDetail & { uuid?: string }
}

/** Normalize the various student API shapes into the flat {@link StudentRow}. */
export function mapStudentsData(data: unknown, fallbackBatchId?: string): StudentRow[] {
  const arr: RawStudent[] = Array.isArray(data) ? data : []
  return arr.map((s) => {
    const d = s.student_detail
    const courseId = s.course !== undefined && s.course !== null ? String(s.course) : null
    const status = d?.status ?? s.user_detail?.status ?? s.status ?? (s.is_active === false ? 'inactive' : 'active')
    return {
      id: String(s.id),
      studentUuid: String(s.student ?? d?.uuid ?? s.id),
      firstName: String(d?.first_name ?? s.first_name ?? '').trim(),
      lastName: String(d?.last_name ?? s.last_name ?? '').trim(),
      email: String(d?.email ?? s.email ?? '').trim(),
      phone: d?.phone_number ?? s.phone_number ?? null,
      studentId: d?.student_id ?? s.student_id ?? null,
      batchIds: s.batch_ids
        ? s.batch_ids.map(String)
        : s.batch != null
          ? [String(s.batch)]
          : fallbackBatchId
            ? [fallbackBatchId]
            : [],
      courseId,
      courseTitle: getCourseTitle(s.course_detail),
      status,
      userStatus: status,
    }
  })
}
