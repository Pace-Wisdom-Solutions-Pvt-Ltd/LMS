// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Extended store tests for instructor/store.ts
 * Pure in-memory store – no React components involved.
 */
import { describe, it, expect } from 'vitest'
import {
  getPrograms,
  addProgram,
  getCourses,
  addCourse,
  getCourse,
  addAssessment,
  addContentSection,
  updateContentSection,
  addContentItem,
  updateContentItem,
  removeContentItem,
  getStudents,
  getStudentName,
  addStudent,
  getSubmissions,
  addComment,
  updateSubmissionStatus,
  getAnnouncements,
  getTrainerSessions,
  getTrainerActivity,
  getTrainerMetrics,
  getLearnerProgress,
} from '../store'

// ─────────────────────────────────────────────
// Helpers – we capture baseline IDs so tests
// can reference seed data without hard-coding
// ─────────────────────────────────────────────

describe('getPrograms', () => {
  it('returns an array of programs', () => {
    const programs = getPrograms()
    expect(Array.isArray(programs)).toBe(true)
  })

  it('each program has an id, name, summary and courses array', () => {
    const programs = getPrograms()
    programs.forEach((p) => {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('summary')
      expect(Array.isArray(p.courses)).toBe(true)
    })
  })

  it('includes the seed program Advanced JS', () => {
    const programs = getPrograms()
    const found = programs.find((p) => p.name === 'Advanced JS')
    expect(found).toBeDefined()
  })
})

describe('addProgram', () => {
  it('creates a new program and returns it with an id', () => {
    const result = addProgram({ name: 'Test Program', summary: 'Summary here' })
    expect(result.id).toBeTruthy()
    expect(result.name).toBe('Test Program')
    expect(result.summary).toBe('Summary here')
    expect(Array.isArray(result.courses)).toBe(true)
  })

  it('the new program appears in getPrograms()', () => {
    const result = addProgram({ name: 'Visible Program', summary: 'visible' })
    const programs = getPrograms()
    const found = programs.find((p) => p.id === result.id)
    expect(found).toBeDefined()
  })

  it('generates unique ids for multiple programs', () => {
    const a = addProgram({ name: 'Prog A', summary: '' })
    const b = addProgram({ name: 'Prog B', summary: '' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('getCourses', () => {
  it('returns an array of courses', () => {
    const courses = getCourses()
    expect(Array.isArray(courses)).toBe(true)
  })

  it('each course has required fields', () => {
    const courses = getCourses()
    courses.forEach((c) => {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('code')
      expect(Array.isArray(c.assessments)).toBe(true)
    })
  })

  it('contains the seed course Introduction to Programming', () => {
    const courses = getCourses()
    const found = courses.find((c) => c.code === 'CS101')
    expect(found).toBeDefined()
    expect(found?.name).toBe('Introduction to Programming')
  })
})

describe('addCourse', () => {
  it('creates a new course and returns it', () => {
    const result = addCourse({ name: 'New Course', code: 'NC101', summary: 'A summary' })
    expect(result.id).toBeTruthy()
    expect(result.name).toBe('New Course')
    expect(result.code).toBe('NC101')
    expect(result.assessments).toEqual([])
  })

  it('appears in getCourses() after add', () => {
    const result = addCourse({ name: 'Added Course', code: 'AC200', summary: '' })
    const courses = getCourses()
    expect(courses.find((c) => c.id === result.id)).toBeDefined()
  })

  it('supports optional fields like programId, category, status', () => {
    const result = addCourse({
      name: 'Optional Fields',
      code: 'OF300',
      summary: 'test',
      programId: 'p1',
      category: 'Tech',
      status: 'draft',
    })
    expect(result.programId).toBe('p1')
    expect(result.category).toBe('Tech')
    expect(result.status).toBe('draft')
  })
})

describe('getCourse', () => {
  it('returns the course for a known id', () => {
    const courses = getCourses()
    const first = courses[0]
    const found = getCourse(first.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(first.id)
  })

  it('returns undefined for an unknown id', () => {
    expect(getCourse('nonexistent-id-xyz')).toBeUndefined()
  })

  it('returns the seed course by id 1', () => {
    const course = getCourse('1')
    expect(course).toBeDefined()
    expect(course?.code).toBe('CS101')
  })
})

describe('addAssessment', () => {
  it('returns null for an unknown courseId', () => {
    const result = addAssessment('bad-course-id', {
      title: 'Test',
      description: 'desc',
      format: 'text_area',
    })
    expect(result).toBeNull()
  })

  it('adds an assessment to an existing course', () => {
    const course = addCourse({ name: 'Assessment Course', code: 'ASSC1', summary: '' })
    const result = addAssessment(course.id, {
      title: 'My Assessment',
      description: 'do something',
      format: 'code_block',
    })
    expect(result).not.toBeNull()
    expect(result?.id).toBeTruthy()
    expect(result?.title).toBe('My Assessment')
    expect(result?.format).toBe('code_block')
  })

  it('the assessment appears inside the course after add', () => {
    const course = addCourse({ name: 'Course For Assessment', code: 'CFA1', summary: '' })
    const assessment = addAssessment(course.id, {
      title: 'Quiz 1',
      description: 'desc',
      format: 'mcq',
    })
    const updatedCourse = getCourse(course.id)
    expect(updatedCourse?.assessments.find((a) => a.id === assessment?.id)).toBeDefined()
  })

  it('supports optional passmark and options fields', () => {
    const course = addCourse({ name: 'Optional Assess Course', code: 'OAC1', summary: '' })
    const result = addAssessment(course.id, {
      title: 'MCQ',
      description: 'multiple choice',
      format: 'mcq',
      passmark: 75,
      options: [{ id: 'o1', text: 'Option A', isCorrect: true }],
    })
    expect(result?.passmark).toBe(75)
    expect(result?.options).toHaveLength(1)
  })
})

describe('addContentSection (string payload)', () => {
  it('returns null for an unknown courseId', () => {
    const result = addContentSection('bad-course', 'Section Title')
    expect(result).toBeNull()
  })

  it('adds a section by string title', () => {
    const section = addContentSection('1', 'New Section Title')
    expect(section).not.toBeNull()
    expect(section?.title).toBe('New Section Title')
    expect(section?.id).toBeTruthy()
    expect(section?.items).toEqual([])
    expect(section?.status).toBe('draft')
  })

  it('auto-assigns next order when string payload used', () => {
    const course = addCourse({ name: 'Order Course', code: 'ORC1', summary: '' })
    const s1 = addContentSection(course.id, 'Section One')
    const s2 = addContentSection(course.id, 'Section Two')
    expect(s1?.order).toBe(1)
    expect(s2?.order).toBe(2)
  })
})

describe('addContentSection (object payload)', () => {
  it('adds a section with full object payload', () => {
    const course = addCourse({ name: 'Object Payload Course', code: 'OPC1', summary: '' })
    const section = addContentSection(course.id, {
      title: 'Advanced Module',
      description: 'In-depth content',
      contentType: 'Video',
      duration: 45,
      order: 5,
      status: 'published',
    })
    expect(section?.title).toBe('Advanced Module')
    expect(section?.description).toBe('In-depth content')
    expect(section?.contentType).toBe('Video')
    expect(section?.duration).toBe(45)
    expect(section?.order).toBe(5)
    expect(section?.status).toBe('published')
  })

  it('uses next order when object payload omits order', () => {
    const course = addCourse({ name: 'Auto Order Course', code: 'AOC1', summary: '' })
    addContentSection(course.id, { title: 'Section A' })
    const s2 = addContentSection(course.id, { title: 'Section B' })
    expect(s2?.order).toBe(2)
  })

  it('uses draft status by default if omitted', () => {
    const course = addCourse({ name: 'Default Status Course', code: 'DSC1', summary: '' })
    const section = addContentSection(course.id, { title: 'Section X' })
    expect(section?.status).toBe('draft')
  })
})

describe('updateContentSection', () => {
  it('returns null for unknown courseId', () => {
    const result = updateContentSection('bad-course', 'sec1', { title: 'New' })
    expect(result).toBeNull()
  })

  it('returns null for a course without contentSections', () => {
    const course = addCourse({ name: 'No Sections Course', code: 'NSC1', summary: '' })
    const result = updateContentSection(course.id, 'fake-sec', { title: 'New' })
    expect(result).toBeNull()
  })

  it('updates section title', () => {
    const course = addCourse({ name: 'Update Section Course', code: 'USC1', summary: '' })
    const section = addContentSection(course.id, 'Original Title')
    const updated = updateContentSection(course.id, section!.id, { title: 'Updated Title' })
    expect(updated?.title).toBe('Updated Title')
  })

  it('updates multiple fields at once', () => {
    const course = addCourse({ name: 'Multi Update Course', code: 'MUC1', summary: '' })
    const section = addContentSection(course.id, { title: 'Module 1', duration: 30 })
    const updated = updateContentSection(course.id, section!.id, {
      description: 'desc',
      duration: 60,
      status: 'published',
    })
    expect(updated?.description).toBe('desc')
    expect(updated?.duration).toBe(60)
    expect(updated?.status).toBe('published')
  })

  it('returns null when sectionId does not match any section', () => {
    const course = addCourse({ name: 'Wrong Section Course', code: 'WSC1', summary: '' })
    addContentSection(course.id, 'Section A')
    const result = updateContentSection(course.id, 'nonexistent-section', { title: 'X' })
    expect(result).toBeNull()
  })
})

describe('addContentItem', () => {
  it('returns null for unknown courseId', () => {
    const result = addContentItem('bad-course', 'bad-section', {
      type: 'youtube',
      title: 'Item',
    })
    expect(result).toBeNull()
  })

  it('returns null for a course with no contentSections', () => {
    const course = addCourse({ name: 'No Sections For Item', code: 'NSFI1', summary: '' })
    const result = addContentItem(course.id, 'fake-sec', { type: 'youtube', title: 'Item' })
    expect(result).toBeNull()
  })

  it('adds an item to a section', () => {
    const course = addCourse({ name: 'Item Course', code: 'IC1', summary: '' })
    const section = addContentSection(course.id, 'Section')
    const item = addContentItem(course.id, section!.id, {
      type: 'youtube',
      title: 'Intro Video',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc',
    })
    expect(item).not.toBeNull()
    expect(item?.id).toBeTruthy()
    expect(item?.type).toBe('youtube')
    expect(item?.title).toBe('Intro Video')
  })

  it('adds a quiz item with linkedAssessmentId', () => {
    const course = addCourse({ name: 'Quiz Item Course', code: 'QIC1', summary: '' })
    const section = addContentSection(course.id, 'Quiz Section')
    const item = addContentItem(course.id, section!.id, {
      type: 'quiz',
      title: 'Quiz 1',
      linkedAssessmentId: 'a1',
    })
    expect(item?.linkedAssessmentId).toBe('a1')
  })
})

describe('updateContentItem', () => {
  it('returns null for unknown courseId', () => {
    const result = updateContentItem('bad', 'bad', 'bad', { title: 'X' })
    expect(result).toBeNull()
  })

  it('returns null for a course without contentSections', () => {
    const course = addCourse({ name: 'No Sections Update', code: 'NSU1', summary: '' })
    const result = updateContentItem(course.id, 'sec', 'item', { title: 'X' })
    expect(result).toBeNull()
  })

  it('updates an existing content item', () => {
    const course = addCourse({ name: 'Update Item Course', code: 'UIC1', summary: '' })
    const section = addContentSection(course.id, 'Section')
    const item = addContentItem(course.id, section!.id, { type: 'note', title: 'Original' })
    const updated = updateContentItem(course.id, section!.id, item!.id, {
      title: 'Updated',
      description: 'new desc',
    })
    expect(updated?.title).toBe('Updated')
    expect(updated?.description).toBe('new desc')
  })

  it('returns null when itemId does not match any item', () => {
    const course = addCourse({ name: 'Wrong Item Course', code: 'WIC1', summary: '' })
    const section = addContentSection(course.id, 'Section')
    addContentItem(course.id, section!.id, { type: 'note', title: 'Item A' })
    const result = updateContentItem(course.id, section!.id, 'nonexistent-item', { title: 'X' })
    expect(result).toBeNull()
  })
})

describe('removeContentItem', () => {
  it('returns false for unknown courseId', () => {
    const result = removeContentItem('bad', 'bad', 'bad')
    expect(result).toBe(false)
  })

  it('returns false for a course without contentSections', () => {
    const course = addCourse({ name: 'No Sections Remove', code: 'NSR1', summary: '' })
    const result = removeContentItem(course.id, 'sec', 'item')
    expect(result).toBe(false)
  })

  it('removes an existing item and returns true', () => {
    const course = addCourse({ name: 'Remove Item Course', code: 'RIC1', summary: '' })
    const section = addContentSection(course.id, 'Section')
    const item = addContentItem(course.id, section!.id, { type: 'note', title: 'To Remove' })
    const result = removeContentItem(course.id, section!.id, item!.id)
    expect(result).toBe(true)
    const updatedCourse = getCourse(course.id)
    const updatedSection = updatedCourse?.contentSections?.find((s) => s.id === section!.id)
    expect(updatedSection?.items.find((i) => i.id === item!.id)).toBeUndefined()
  })

  it('returns true even when itemId does not match (section found, filter runs)', () => {
    const course = addCourse({ name: 'Nonexistent Item Remove', code: 'NIR1', summary: '' })
    const section = addContentSection(course.id, 'Section')
    // removeContentItem returns true as long as the course + sections are found
    const result = removeContentItem(course.id, section!.id, 'nonexistent-item')
    expect(result).toBe(true)
  })
})

describe('getStudents', () => {
  it('returns an array of students', () => {
    const students = getStudents()
    expect(Array.isArray(students)).toBe(true)
  })

  it('includes the seed student John Doe', () => {
    const students = getStudents()
    const found = students.find((s) => s.email === 'john@example.com')
    expect(found).toBeDefined()
    expect(found?.firstName).toBe('John')
  })
})

describe('getStudentName', () => {
  it('returns full name for a known student id', () => {
    const name = getStudentName('s1')
    expect(name).toBe('John Doe')
  })

  it('returns the raw id for an unknown id', () => {
    const name = getStudentName('nonexistent-student')
    expect(name).toBe('nonexistent-student')
  })
})

describe('addStudent', () => {
  it('creates a new student with a generated id', () => {
    const result = addStudent({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    })
    expect(result.id).toBeTruthy()
    expect(result.firstName).toBe('Jane')
    expect(result.lastName).toBe('Smith')
    expect(result.email).toBe('jane@example.com')
  })

  it('appears in getStudents() after add', () => {
    const result = addStudent({
      firstName: 'Alice',
      lastName: 'Wonder',
      email: 'alice@example.com',
    })
    const students = getStudents()
    expect(students.find((s) => s.id === result.id)).toBeDefined()
  })

  it('supports optional employeeId', () => {
    const result = addStudent({
      firstName: 'Bob',
      lastName: 'Builder',
      email: 'bob@example.com',
      employeeId: 'EMP999',
    })
    expect(result.employeeId).toBe('EMP999')
  })
})

describe('getSubmissions', () => {
  it('returns an array of submissions', () => {
    const submissions = getSubmissions()
    expect(Array.isArray(submissions)).toBe(true)
  })

  it('each submission has required fields', () => {
    const submissions = getSubmissions()
    submissions.forEach((s) => {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('studentId')
      expect(s).toHaveProperty('assessmentId')
      expect(Array.isArray(s.comments)).toBe(true)
      expect(['pending', 'reviewed']).toContain(s.status)
    })
  })
})

describe('addComment', () => {
  it('adds a comment to an existing submission', () => {
    const submissions = getSubmissions()
    const sub = submissions.find((s) => s.status === 'pending') ?? submissions[0]
    const before = sub.comments.length

    addComment(sub.id, 'Great work!')

    const updated = getSubmissions().find((s) => s.id === sub.id)
    expect(updated?.comments.length).toBe(before + 1)
    expect(updated?.comments[updated.comments.length - 1].text).toBe('Great work!')
  })

  it('the comment has an id and createdAt', () => {
    const submissions = getSubmissions()
    const sub = submissions[0]
    addComment(sub.id, 'Test comment')
    const updated = getSubmissions().find((s) => s.id === sub.id)
    const lastComment = updated?.comments[updated.comments.length - 1]
    expect(lastComment?.id).toBeTruthy()
    expect(lastComment?.createdAt).toBeTruthy()
  })

  it('does nothing (no crash) for unknown submission id', () => {
    expect(() => addComment('nonexistent-sub', 'Hello')).not.toThrow()
  })
})

describe('updateSubmissionStatus', () => {
  it('changes status from pending to reviewed', () => {
    const submissions = getSubmissions()
    const sub = submissions.find((s) => s.status === 'pending') ?? submissions[0]
    updateSubmissionStatus(sub.id, 'reviewed')
    const updated = getSubmissions().find((s) => s.id === sub.id)
    expect(updated?.status).toBe('reviewed')
  })

  it('changes status back to pending', () => {
    const submissions = getSubmissions()
    const sub = submissions[0]
    updateSubmissionStatus(sub.id, 'reviewed')
    updateSubmissionStatus(sub.id, 'pending')
    const updated = getSubmissions().find((s) => s.id === sub.id)
    expect(updated?.status).toBe('pending')
  })

  it('does nothing for unknown submission id', () => {
    expect(() => updateSubmissionStatus('nonexistent', 'reviewed')).not.toThrow()
  })
})

describe('getAnnouncements', () => {
  it('returns only published announcements', () => {
    const announcements = getAnnouncements()
    expect(Array.isArray(announcements)).toBe(true)
    announcements.forEach((a) => {
      expect(a.status).toBe('published')
    })
  })
})

describe('getTrainerSessions', () => {
  it('returns an array', () => {
    const sessions = getTrainerSessions()
    expect(Array.isArray(sessions)).toBe(true)
  })

  it('each session has required fields', () => {
    const sessions = getTrainerSessions()
    sessions.forEach((s) => {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('topic')
      expect(s).toHaveProperty('courseId')
      expect(s).toHaveProperty('deliveryType')
      expect(s).toHaveProperty('status')
    })
  })

  it('contains the seed sessions', () => {
    const sessions = getTrainerSessions()
    expect(sessions.length).toBeGreaterThanOrEqual(3)
  })
})

describe('getTrainerActivity', () => {
  it('returns an array of activity items', () => {
    const activity = getTrainerActivity()
    expect(Array.isArray(activity)).toBe(true)
  })

  it('each activity has id, timestamp and action', () => {
    const activity = getTrainerActivity()
    activity.forEach((a) => {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('timestamp')
      expect(a).toHaveProperty('action')
    })
  })
})

describe('getTrainerMetrics', () => {
  it('returns an object with all expected metric keys', () => {
    const metrics = getTrainerMetrics()
    expect(metrics).toHaveProperty('assignedCourses')
    expect(metrics).toHaveProperty('upcomingSessions7Days')
    expect(metrics).toHaveProperty('learnersEnrolled')
    expect(metrics).toHaveProperty('completionRatePercent')
    expect(metrics).toHaveProperty('assessmentsGradedMonthly')
    expect(metrics).toHaveProperty('feedbackPending')
  })

  it('assignedCourses equals the number of courses in the store', () => {
    const metrics = getTrainerMetrics()
    const courses = getCourses()
    expect(metrics.assignedCourses).toBe(courses.length)
  })

  it('learnersEnrolled equals the number of students', () => {
    const metrics = getTrainerMetrics()
    const students = getStudents()
    expect(metrics.learnersEnrolled).toBe(students.length)
  })

  it('feedbackPending + assessmentsGradedMonthly equals total submissions', () => {
    const metrics = getTrainerMetrics()
    const submissions = getSubmissions()
    expect(metrics.feedbackPending + metrics.assessmentsGradedMonthly).toBe(submissions.length)
  })

  it('completionRatePercent is 72', () => {
    expect(getTrainerMetrics().completionRatePercent).toBe(72)
  })

  it('upcomingSessions7Days is a non-negative number', () => {
    const metrics = getTrainerMetrics()
    expect(metrics.upcomingSessions7Days).toBeGreaterThanOrEqual(0)
  })
})

describe('getLearnerProgress', () => {
  it('returns an array', () => {
    const progress = getLearnerProgress()
    expect(Array.isArray(progress)).toBe(true)
  })

  it('each entry has required fields', () => {
    const progress = getLearnerProgress()
    progress.forEach((lp) => {
      expect(lp).toHaveProperty('learnerId')
      expect(lp).toHaveProperty('learnerName')
      expect(lp).toHaveProperty('courseId')
      expect(lp).toHaveProperty('courseName')
      expect(lp).toHaveProperty('completionPercent')
      expect(lp).toHaveProperty('modulesCompleted')
      expect(lp).toHaveProperty('totalModules')
      expect(lp).toHaveProperty('lastActivity')
    })
  })

  it('completionPercent is between 0 and 100', () => {
    const progress = getLearnerProgress()
    progress.forEach((lp) => {
      expect(lp.completionPercent).toBeGreaterThanOrEqual(0)
      expect(lp.completionPercent).toBeLessThanOrEqual(100)
    })
  })

  it('is sorted descending by lastActivity', () => {
    const progress = getLearnerProgress()
    for (let i = 1; i < progress.length; i++) {
      const prev = new Date(progress[i - 1].lastActivity).getTime()
      const curr = new Date(progress[i].lastActivity).getTime()
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  it('produces one entry per student-course pair', () => {
    const progress = getLearnerProgress()
    const students = getStudents()
    const courses = getCourses()
    expect(progress.length).toBe(students.length * courses.length)
  })

  it('modulesCompleted does not exceed totalModules', () => {
    const progress = getLearnerProgress()
    progress.forEach((lp) => {
      expect(lp.modulesCompleted).toBeLessThanOrEqual(lp.totalModules)
    })
  })
})
