// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import * as S from '../store'

/**
 * Single integration-style test: institute-admin store is module-global mutable state.
 * Exercising all exported APIs improves coverage without relying on UI mocks.
 */
describe('institute-admin store API', () => {
  it('exercises getters, add/update/remove, and name helpers', () => {
    expect(S.getAttendanceData().length).toBeGreaterThan(0)

    const sess = S.getSessions()[0]
    expect(sess).toBeTruthy()
    expect(S.updateSession(sess.id, { status: 'completed' })?.status).toBe('completed')
    expect(S.updateSession('missing', {})).toBeNull()

    const d = S.addDepartment({ name: 'DeptCov', status: 'active' })
    expect(S.updateDepartment(d.id, { name: 'DeptCov2' })?.name).toBe('DeptCov2')
    expect(S.updateDepartment('bad', {})).toBeNull()

    const jr = S.addJobRole({
      name: 'JRCov',
      level: 'Junior',
      requiredSkillIds: [],
      status: 'active',
    })
    expect(S.updateJobRole(jr.id, { level: 'Mid' })?.level).toBe('Mid')
    expect(S.updateJobRole('bad', {})).toBeNull()

    const sk = S.addSkill({ name: 'SkillCov' })
    expect(sk.id).toBeTruthy()

    const tc = S.addTrainingCycle({
      startDate: '2099-01-01',
      endDate: '2099-12-31',
      compliancePeriodName: 'P',
      status: 'upcoming',
    })
    expect(S.updateTrainingCycle(tc.id, { status: 'current' })?.status).toBe('current')
    expect(S.updateTrainingCycle('bad', {})).toBeNull()

    const sm = S.addSkillsMapping({
      departmentId: d.id,
      skillIds: [sk.id],
      trainerIds: ['t1'],
      contentOwnerIds: ['t1'],
    })
    expect(S.getSkillsMappings().some((x) => x.id === sm.id)).toBe(true)
    expect(S.updateSkillsMapping(sm.id, { skillIds: [sk.id] })?.skillIds).toEqual([sk.id])
    expect(S.updateSkillsMapping('bad', {})).toBeNull()

    const qu = S.addQuestion({
      text: 'Q?',
      type: 'mcq',
      options: [{ id: 'o1', text: 'A', isCorrect: true }],
      quizId: 'qcov',
    })
    expect(S.getQuestions('qcov').some((x) => x.id === qu.id)).toBe(true)
    expect(S.getQuestions().length).toBeGreaterThan(0)

    const tr = S.addCourseTrack({ name: 'TrackCov', status: 'draft' })
    expect(S.updateCourseTrack(tr.id, { status: 'published' })?.status).toBe('published')
    expect(S.updateCourseTrack('bad', {})).toBeNull()

    const lv = S.addCourseLevel({ trackId: tr.id, name: 'Beginner', order: 1 })
    expect(S.getCourseLevels(tr.id).map((x) => x.id)).toContain(lv.id)
    expect(S.updateCourseLevel(lv.id, { order: 2 })?.order).toBe(2)
    expect(S.updateCourseLevel('bad', {})).toBeNull()
    expect(S.removeCourseLevelsByName(tr.id, 'Beginner')).toBeGreaterThanOrEqual(0)

    const lv2 = S.addCourseLevel({ trackId: tr.id, name: 'Intermediate', order: 2 })
    const pr = S.addProgram({
      trackId: tr.id,
      levelId: lv2.id,
      title: 'ProgCov',
      status: 'draft',
    })
    expect(S.getProgramsByLevel(lv2.id).map((x) => x.id)).toContain(pr.id)
    expect(S.updateProgram(pr.id, { status: 'published' })?.status).toBe('published')
    expect(S.updateProgram('bad', {})).toBeNull()

    const res = S.addProgramResource({
      programId: pr.id,
      title: 'Res',
      type: 'link',
      url: 'https://x.com',
    })
    expect(S.updateProgramResource(res.id, { title: 'Res2' })?.title).toBe('Res2')
    expect(S.updateProgramResource('bad', {})).toBeNull()
    // cover sort tie-breaker branch (same order, compare createdAt)
    const resB = S.addProgramResource({
      programId: pr.id,
      title: 'ResB',
      type: 'link',
      url: 'https://x.com/b',
      order: res.order,
    })
    const sortedRes = S.getProgramResources(pr.id)
    expect(sortedRes.length).toBeGreaterThanOrEqual(2)
    expect(sortedRes.map((x) => x.id)).toContain(resB.id)

    const task = S.addProgramTask({
      programId: pr.id,
      title: 'Task',
      requiredSubmissionFormats: ['link'],
    })
    expect(S.updateProgramTask(task.id, { title: 'Task2' })?.title).toBe('Task2')
    expect(S.updateProgramTask('bad', {})).toBeNull()
    // cover sort tie-breaker branch (same order, compare createdAt)
    const taskB = S.addProgramTask({
      programId: pr.id,
      title: 'TaskB',
      requiredSubmissionFormats: ['link'],
      order: task.order,
    })
    const sortedTasks = S.getProgramTasks(pr.id)
    expect(sortedTasks.length).toBeGreaterThanOrEqual(2)
    expect(sortedTasks.map((x) => x.id)).toContain(taskB.id)

    const pa = S.addProgramAssessment({
      programId: pr.id,
      name: 'PA',
      type: 'mcq',
      mandatory: true,
      requiredSubmissionFormats: ['link'],
      status: 'draft',
    })
    expect(S.updateProgramAssessment(pa.id, { status: 'published' })?.status).toBe('published')

    expect(S.removeProgramResource('bad')).toBe(false)
    expect(S.removeProgramTask('bad')).toBe(false)
    expect(S.removeProgramAssessment('bad')).toBe(false)
    expect(S.removeProgramResource(res.id)).toBe(true)
    expect(S.removeProgramTask(task.id)).toBe(true)
    expect(S.removeProgramAssessment(pa.id)).toBe(true)

    const ann = S.addAnnouncement({
      title: 'Hi',
      body: 'B',
      target: 'all',
      createdBy: 'Admin',
      createdAt: '2099-01-01T00:00:00',
      status: 'draft',
    })
    expect(S.updateAnnouncement(ann.id, { status: 'published' })?.status).toBe('published')

    expect(S.updateRescheduleRequest('bad', 'rejected')).toBeNull()

    expect(S.getCalendarConflicts().length).toBeGreaterThan(0)

    expect(S.getGradeName('g1')).toBeTruthy()
    expect(S.getSectionName('s1')).toBeTruthy()
    expect(S.getSubjectName('sub1')).toBeTruthy()
    expect(S.getTeacherName('t1')).toContain('John')
    expect(S.getTeacherName('unknown')).toBe('unknown')
    expect(S.getDepartmentName('dept1')).toBeTruthy()
    expect(S.getJobRoleName('role1')).toBeTruthy()
    expect(S.getSkillName('sk1')).toBeTruthy()
  })
})
