// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { getCourseById, getStudentMetrics, markModuleComplete } from '../store'

describe('student/store', () => {
  it('getStudentMetrics computes completion and dueSoon branches', () => {
    const m = getStudentMetrics()
    expect(m.enrolledCourses).toBeGreaterThan(0)
    expect(m.overallCompletionPercent).toBeGreaterThanOrEqual(0)
    expect(m.pendingAssessments).toBeGreaterThanOrEqual(0)
  })

  it('markModuleComplete handles missing course and updates progress/status', () => {
    // missing course branch
    markModuleComplete('missing', 'm1')

    const c1 = getCourseById('c1')
    expect(c1).toBeTruthy()
    if (!c1) return

    // complete remaining modules to hit >= 100 branch
    for (const m of c1.modules) {
      markModuleComplete(c1.id, m.id)
    }

    const updated = getCourseById('c1')
    expect(updated?.progress).toBe(100)
    expect(updated?.status).toBe('completed')
  })
})

