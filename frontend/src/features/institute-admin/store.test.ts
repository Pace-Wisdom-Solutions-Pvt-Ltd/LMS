// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import {
  getAttendanceData,
  getSessions,
  getAnnouncements,
  addAnnouncement,
  getDepartments,
  addDepartment,
  getJobRoles,
  addJobRole,
  getSkills,
  addSkill,
  getTrainingCycles,
  addTrainingCycle,
  getCourseTracks,
  getGradeName,
  getSectionName,
  getTeacherName,
} from './store'

describe('institute-admin store', () => {
  it('getAttendanceData returns array', () => {
    expect(Array.isArray(getAttendanceData())).toBe(true)
  })

  it('getSessions returns array', () => {
    expect(Array.isArray(getSessions())).toBe(true)
  })

  it('getAnnouncements returns array', () => {
    expect(Array.isArray(getAnnouncements())).toBe(true)
  })

  it('addAnnouncement adds notification', () => {
    const before = getAnnouncements().length
    addAnnouncement({
      title: 'Test',
      body: 'Body',
      target: 'all',
      createdBy: 'admin',
      createdAt: '2026-01-01',
      status: 'published',
    })
    expect(getAnnouncements().length).toBe(before + 1)
  })

  it('getDepartments returns array', () => {
    expect(Array.isArray(getDepartments())).toBe(true)
  })

  it('addDepartment adds department', () => {
    const before = getDepartments().length
    addDepartment({ name: `Dept-${Date.now()}`, parentId: '', managerId: '', status: 'active', maxLearners: 0 })
    expect(getDepartments().length).toBe(before + 1)
  })

  it('getJobRoles returns array', () => {
    expect(Array.isArray(getJobRoles())).toBe(true)
  })

  it('addJobRole adds job role', () => {
    const before = getJobRoles().length
    addJobRole({ name: `Role-${Date.now()}`, level: 'Junior', requiredSkillIds: [], status: 'active' })
    expect(getJobRoles().length).toBe(before + 1)
  })

  it('getSkills returns array', () => {
    expect(Array.isArray(getSkills())).toBe(true)
  })

  it('addSkill adds skill', () => {
    const before = getSkills().length
    addSkill({ name: `Skill-${Date.now()}` })
    expect(getSkills().length).toBe(before + 1)
  })

  it('getTrainingCycles returns array', () => {
    expect(Array.isArray(getTrainingCycles())).toBe(true)
  })

  it('addTrainingCycle adds cycle', () => {
    const before = getTrainingCycles().length
    addTrainingCycle({ startDate: '2026-01-01', endDate: '2026-12-31', compliancePeriodName: 'FY26', status: 'current' })
    expect(getTrainingCycles().length).toBe(before + 1)
  })

  it('getCourseTracks returns array', () => {
    expect(Array.isArray(getCourseTracks())).toBe(true)
  })

  it('name lookup helpers return strings', () => {
    expect(typeof getGradeName('g1')).toBe('string')
    expect(typeof getSectionName('s1')).toBe('string')
    expect(typeof getTeacherName('t1')).toBe('string')
  })
})
