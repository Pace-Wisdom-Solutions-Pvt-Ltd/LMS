// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { getCourseTitle, mapStudentsData } from './studentsMap'

describe('mapStudentsData', () => {
  it('maps API rows into StudentRow shape', () => {
    const rows = [
      {
        id: 1,
        student: 'stu-1',
        batch: 55,
        course: 9,
        is_active: true,
        student_detail: { first_name: 'A', last_name: 'B', email: 'a@b.com', phone_number: '123', student_id: 'S1' },
        course_detail: { title: 'Course X' },
      },
      {
        id: 2,
        student_detail: null,
        first_name: 'C',
        last_name: 'D',
        email: 'c@d.com',
        is_active: false,
        course: null,
        course_detail: null,
      },
    ]

    const mapped = mapStudentsData(rows, 'fallback-batch')
    expect(mapped).toHaveLength(2)

    expect(mapped[0]).toMatchObject({
      id: '1',
      studentUuid: 'stu-1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      phone: '123',
      studentId: 'S1',
      batchIds: ['55'],
      courseId: '9',
      courseTitle: 'Course X',
      status: 'active',
    })

    expect(mapped[1]).toMatchObject({
      id: '2',
      firstName: 'C',
      lastName: 'D',
      email: 'c@d.com',
      batchIds: ['fallback-batch'],
      courseId: null,
      status: 'inactive',
    })
  })

  it('uses the API status field over is_active', () => {
    const mapped = mapStudentsData([{ id: 4, status: 'expired', is_active: true }])
    expect(mapped[0].status).toBe('expired')
    expect(mapped[0].userStatus).toBe('expired')
  })

  it('prefers batch_ids over a single batch', () => {
    const mapped = mapStudentsData([{ id: 3, batch: 1, batch_ids: [7, 8] }])
    expect(mapped[0].batchIds).toEqual(['7', '8'])
  })

  it('returns [] for non-array input', () => {
    expect(mapStudentsData(null)).toEqual([])
    expect(mapStudentsData(undefined)).toEqual([])
  })
})

describe('getCourseTitle', () => {
  it('reads a plain string or an object title, else null', () => {
    expect(getCourseTitle('Math')).toBe('Math')
    expect(getCourseTitle({ title: 'Science' })).toBe('Science')
    expect(getCourseTitle({ foo: 'bar' })).toBeNull()
    expect(getCourseTitle(null)).toBeNull()
  })
})
