// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'

import {
  addAnnouncement,
  addProgramAssessment,
  getGradeName,
  getProgramAssessments,
  getRescheduleRequests,
  getTeacherName,
  removeProgramAssessment,
  updateAnnouncement,
  updateProgramAssessment,
  updateRescheduleRequest,
} from '../store'

describe('institute-admin/store branch coverage', () => {
  it('updateRescheduleRequest returns null for missing request, and updates when present', () => {
    expect(updateRescheduleRequest('missing', 'approved')).toBeNull()

    const existing = getRescheduleRequests()[0]
    expect(existing).toBeTruthy()
    if (!existing) return

    const updated = updateRescheduleRequest(existing.id, 'approved')
    expect(updated).toBeTruthy()
    expect(updated?.status).toBe('approved')
  })

  it('name helpers return found name or fall back to id', () => {
    expect(getGradeName('g1')).toMatch(/grade/i)
    expect(getGradeName('unknown-grade')).toBe('unknown-grade')

    expect(getTeacherName('t1')).toMatch(/\S+\s+\S+/)
    expect(getTeacherName('unknown-teacher')).toBe('unknown-teacher')
  })

  it('updateAnnouncement publishes a draft and returns null for unknown id', () => {
    expect(updateAnnouncement('missing', { status: 'published' })).toBeNull()

    const a = addAnnouncement({
      title: 'T',
      body: 'B',
      target: 'all',
      createdBy: 'Admin',
      createdAt: '2026-03-01',
      status: 'draft',
    })

    const published = updateAnnouncement(a.id, { status: 'published' })
    expect(published).toBeTruthy()
    expect(published?.status).toBe('published')
  })

  it('program assessment helpers cover sort and update/remove branches', () => {
    const programId = `p-${Date.now()}`

    // cover updateProgramAssessment not-found branch
    expect(updateProgramAssessment('missing', { name: 'x' })).toBeNull()

    // cover addProgramAssessment reduce branches: order undefined (false), and higher order (true)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'))
    const a1 = addProgramAssessment({ programId, levelId: 'lvl', name: 'A1', durationMinutes: 10, order: 1 })

    vi.setSystemTime(new Date('2026-03-02T00:00:00.000Z'))
    const a2 = addProgramAssessment({ programId, levelId: 'lvl', name: 'A2', durationMinutes: 10, order: 1 })

    vi.setSystemTime(new Date('2026-03-03T00:00:00.000Z'))
    const a3 = addProgramAssessment({ programId, levelId: 'lvl', name: 'A3', durationMinutes: 10, order: 5 })

    vi.useRealTimers()

    // cover getProgramAssessments sort branches: same order uses createdAt tie-break, different order uses order compare
    const ordered = getProgramAssessments(programId)
    expect(ordered.map((x) => x.id)).toContain(a1.id)
    expect(ordered.map((x) => x.id)).toContain(a2.id)
    expect(ordered.map((x) => x.id)).toContain(a3.id)
    // order 1 should come before order 5
    expect(ordered.findIndex((x) => x.id === a1.id)).toBeLessThan(ordered.findIndex((x) => x.id === a3.id))
    // for equal order(1), createdAt ascending should place 2026-03-01 before 2026-03-02
    expect(ordered.findIndex((x) => x.id === a1.id)).toBeLessThan(ordered.findIndex((x) => x.id === a2.id))

    // cover updateProgramAssessment found branch
    const updated = updateProgramAssessment(a1.id, { name: 'A1-updated' })
    expect(updated?.name).toBe('A1-updated')

    // cover removeProgramAssessment branches
    expect(removeProgramAssessment('missing')).toBe(false)
    expect(removeProgramAssessment(a2.id)).toBe(true)
  })
})

