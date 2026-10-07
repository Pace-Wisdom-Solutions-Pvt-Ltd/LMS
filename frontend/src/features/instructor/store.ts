// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Simple in-memory store for instructor data (UI only).
 * Resets on page refresh.
 */
import { randomInt } from '@/lib/ids'

export type SubmissionFormat =
  | 'link'
  | 'paragraph'
  | 'pdf'
  | 'screenshot'
  | 'codeblock'
  | 'file'
  | 'text_area'
  | 'git_link'
  | 'code_block'
  | 'mcq'

export interface McqOption {
  id: string
  text: string
  isCorrect?: boolean
}

export type ContentItemType = 'youtube' | 'quiz' | 'project' | 'note'

export type ModuleContentType = 'Video' | 'PDF' | 'Interactive' | 'SCORM'

export interface ContentSection {
  id: string
  title: string
  description?: string
  contentType?: ModuleContentType
  duration?: number // minutes
  order: number
  status?: 'draft' | 'published'
  items: ContentItem[]
}

export interface ContentItem {
  id: string
  type: ContentItemType
  title: string
  description?: string
  youtubeUrl?: string
  durationMinutes?: number
  linkedAssessmentId?: string
}

export interface Assessment {
  id: string
  title: string
  description: string
  format: SubmissionFormat
  passmark?: number
  options?: McqOption[]
  dueDate?: string
  assignedTo?: string[]
}

export interface Course {
  id: string
  name: string
  code: string
  summary: string
  programId?: string
  category?: string
  status?: 'draft' | 'published'
  enrolledLearnersCount?: number
  completionRate?: number
  lastUpdated?: string
  assessments: Assessment[]
  contentSections?: ContentSection[]
}

// === Curriculum Builder Types (Mirroring Org Admin) ===

export interface ProgramResource {
  id: string
  programId: string
  title: string
  type: 'youtube' | 'video' | 'pdf' | 'link'
  url: string
  focusNotes?: string
  outline?: string
  order?: number
  createdAt: string
}

export interface ProgramTask {
  id: string
  programId: string
  title: string
  description?: string
  attachment?: File | null
  requiredSubmissionFormats: SubmissionFormat[]
  dueDate?: string
  order?: number
  createdAt: string
}

export interface ProgramAssessment {
  id: string
  programId: string
  name: string
  type: 'mcq' | 'scenario' | 'survey' | 'practical'
  durationMinutes?: number
  mandatory: boolean
  requiredSubmissionFormats: SubmissionFormat[]
  order?: number
  createdAt: string
  status: 'draft' | 'published'
}

export interface Question {
  id: string
  quizId?: string
  text: string
  type: 'mcq' | 'short_answer'
  options?: { id: string; text: string; isCorrect: boolean }[]
  allowMultipleCorrect?: boolean
}

export interface Program {
  id: string
  name: string
  summary: string
  courses: Course[]
}

export interface InstructorStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeId?: string
}

export interface Submission {
  id: string
  studentId: string
  studentName: string
  assessmentId: string
  assessmentTitle: string
  courseName: string
  format: SubmissionFormat
  content: string
  submittedAt: string
  comments: { id: string; text: string; createdAt: string }[]
  status: 'pending' | 'reviewed'
}

export interface Announcement {
  id: string
  title: string
  body: string
  target: string
  createdBy: string
  createdAt: string
  status: 'draft' | 'published'
}

let programs: Program[] = [
  {
    id: 'p1',
    name: 'Advanced JS',
    summary: 'Advanced JavaScript training',
    courses: [],
  },
]

let courses: Course[] = [
  {
    id: '1',
    name: 'Introduction to Programming',
    code: 'CS101',
    summary: 'Learn basics of programming',
    programId: 'p1',
    category: 'Programming',
    status: 'published',
    enrolledLearnersCount: 12,
    completionRate: 72,
    lastUpdated: '2026-02-25',
    assessments: [
      {
        id: 'a1',
        title: 'Assignment 1',
        description: 'Write a hello world program',
        format: 'codeblock',
      },
    ],
    contentSections: [
      {
        id: 'sec1',
        title: 'Getting Started with JavaScript',
        order: 1,
        items: [
          {
            id: 'item1',
            type: 'youtube',
            title: 'What is JavaScript?',
            youtubeUrl: 'https://www.youtube.com/watch?v=upDLs1sn7g4',
            description: 'High-level intro video you can replace with your own link.',
          },
          {
            id: 'item2',
            type: 'youtube',
            title: 'JavaScript Variables & Basics',
            youtubeUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
          },
          {
            id: 'item3',
            type: 'quiz',
            title: 'Quiz 1 – JS fundamentals',
            linkedAssessmentId: 'a1',
          },
        ],
      },
    ],
  },
]

let students: InstructorStudent[] = [
  {
    id: 's1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    employeeId: 'EMP001',
  },
]

const announcements: Announcement[] = [
  { id: 'ann1', title: 'Welcome to the Internship Program', body: 'We are excited to have you onboard. Please complete the onboarding tasks in your first project.', target: 'all', createdBy: 'Org Admin', createdAt: '2026-02-01T09:00:00', status: 'published' },
  { id: 'ann2', title: 'Task Submission Reminder', body: 'Please ensure all pending task submissions are completed before the end of the week.', target: 'all', createdBy: 'Org Admin', createdAt: '2026-02-20T14:00:00', status: 'published' },
  { id: 'ann3', title: 'New Projects Available', body: 'New projects have been added. Check your Projects page for updates.', target: 'instructors', createdBy: 'Org Admin', createdAt: '2026-02-25T10:00:00', status: 'published' },
]

// Curriculum Builder State
let programResources: ProgramResource[] = []
let programTasks: ProgramTask[] = []
let programAssessments: ProgramAssessment[] = []
let questions: Question[] = []

let submissions: Submission[] = [
  {
    id: 'sub1',
    studentId: 's1',
    studentName: 'John Doe',
    assessmentId: 'a1',
    assessmentTitle: 'Assignment 1',
    courseName: 'Introduction to Programming',
    format: 'codeblock',
    content: 'console.log("Hello, World!");',
    submittedAt: '2024-02-20T10:00:00',
    comments: [],
    status: 'pending',
  },
]

export function getPrograms(): Program[] {
  return programs.map((p) => ({
    ...p,
    courses: courses.filter((c) => c.programId === p.id),
  }))
}

export function addProgram(program: Omit<Program, 'id' | 'courses'>): Program {
  const newProgram: Program = {
    ...program,
    id: crypto.randomUUID(),
    courses: [],
  }
  programs = [...programs, newProgram]
  return newProgram
}

export function getCourses(): Course[] {
  return [...courses]
}

export function addCourse(
  course: Omit<Course, 'id' | 'assessments'> & { programId?: string }
): Course {
  const newCourse: Course = {
    ...course,
    id: crypto.randomUUID(),
    assessments: [],
  }
  courses = [...courses, newCourse]
  return newCourse
}

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id)
}

export function addAssessment(
  courseId: string,
  assessment: Omit<Assessment, 'id'>
): Assessment | null {
  const course = courses.find((c) => c.id === courseId)
  if (!course) return null
  const newAssessment: Assessment = {
    ...assessment,
    id: crypto.randomUUID(),
  }
  courses = courses.map((c) =>
    c.id === courseId
      ? { ...c, assessments: [...c.assessments, newAssessment] }
      : c
  )
  return newAssessment
}

export type CreateModulePayload = {
  title: string
  description?: string
  contentType?: ModuleContentType
  duration?: number
  order?: number
  status?: 'draft' | 'published'
}

export function addContentSection(
  courseId: string,
  payload: string | CreateModulePayload
): ContentSection | null {
  const course = courses.find((c) => c.id === courseId)
  if (!course) return null

  const existingSections = course.contentSections ?? []
  const nextOrder =
    existingSections.length > 0 ? Math.max(...existingSections.map((s) => s.order)) + 1 : 1

  const full = typeof payload === 'string'
    ? { title: payload, order: nextOrder, status: 'draft' as const }
    : {
        title: payload.title,
        description: payload.description,
        contentType: payload.contentType,
        duration: payload.duration,
        order: payload.order ?? nextOrder,
        status: payload.status ?? 'draft',
      }

  const newSection: ContentSection = {
    id: crypto.randomUUID(),
    title: full.title,
    description: full.description,
    contentType: full.contentType,
    duration: full.duration,
    order: full.order,
    status: full.status,
    items: [],
  }

  courses = courses.map((c) =>
    c.id === courseId
      ? {
          ...c,
          contentSections: [...existingSections, newSection],
        }
      : c
  )

  return newSection
}

export function updateContentSection(
  courseId: string,
  sectionId: string,
  payload: Partial<CreateModulePayload>
): ContentSection | null {
  const course = courses.find((c) => c.id === courseId)
  if (!course || !course.contentSections) return null

  let updated: ContentSection | null = null
  courses = courses.map((c) => {
    if (c.id !== courseId) return c
    return {
      ...c,
      contentSections: c.contentSections!.map((s) => {
        if (s.id !== sectionId) return s
        updated = {
          ...s,
          ...(payload.title != null && { title: payload.title }),
          ...(payload.description !== undefined && { description: payload.description }),
          ...(payload.contentType !== undefined && { contentType: payload.contentType }),
          ...(payload.duration !== undefined && { duration: payload.duration }),
          ...(payload.order !== undefined && { order: payload.order }),
          ...(payload.status !== undefined && { status: payload.status }),
        }
        return updated
      }),
    }
  })
  return updated
}

export function addContentItem(
  courseId: string,
  sectionId: string,
  item: Omit<ContentItem, 'id'>
): ContentItem | null {
  const course = courses.find((c) => c.id === courseId)
  if (!course || !course.contentSections) return null

  const newItem: ContentItem = {
    ...item,
    id: crypto.randomUUID(),
  }

  courses = courses.map((c) =>
    c.id === courseId
      ? {
          ...c,
          contentSections: c.contentSections?.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  items: [...section.items, newItem],
                }
              : section
          ),
        }
      : c
  )

  return newItem
}

export function updateContentItem(
  courseId: string,
  sectionId: string,
  itemId: string,
  payload: Partial<Omit<ContentItem, 'id'>>
): ContentItem | null {
  const course = courses.find((c) => c.id === courseId)
  if (!course || !course.contentSections) return null

  let updated: ContentItem | null = null
  courses = courses.map((c) => {
    if (c.id !== courseId) return c
    return {
      ...c,
      contentSections: c.contentSections?.map((section) => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          items: section.items.map((it) => {
            if (it.id !== itemId) return it
            updated = { ...it, ...payload }
            return updated
          }),
        }
      }),
    }
  })
  return updated
}

export function removeContentItem(
  courseId: string,
  sectionId: string,
  itemId: string
): boolean {
  const course = courses.find((c) => c.id === courseId)
  if (!course || !course.contentSections) return false

  courses = courses.map((c) => {
    if (c.id !== courseId) return c
    return {
      ...c,
      contentSections: c.contentSections?.map((section) => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          items: section.items.filter((it) => it.id !== itemId),
        }
      }),
    }
  })
  return true
}

export function getStudents(): InstructorStudent[] {
  return [...students]
}

export function getStudentName(id: string): string {
  const s = students.find((x) => x.id === id)
  return s ? `${s.firstName} ${s.lastName}` : id
}

export function addStudent(
  student: Omit<InstructorStudent, 'id'>
): InstructorStudent {
  const newStudent: InstructorStudent = {
    ...student,
    id: crypto.randomUUID(),
  }
  students = [...students, newStudent]
  return newStudent
}

export function getSubmissions(): Submission[] {
  return [...submissions]
}

export function addComment(
  submissionId: string,
  text: string
): void {
  submissions = submissions.map((s) =>
    s.id === submissionId
      ? {
          ...s,
          comments: [
            ...s.comments,
            {
              id: crypto.randomUUID(),
              text,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      : s
  )
}

export function getAnnouncements(): Announcement[] {
  return announcements.filter((a) => a.status === 'published')
}

export function updateSubmissionStatus(
  submissionId: string,
  status: 'pending' | 'reviewed'
): void {
  submissions = submissions.map((s) =>
    s.id === submissionId ? { ...s, status } : s
  )
}

// --- Trainer flow (LMS spec) ---

export interface TrainerSession {
  id: string
  topic: string
  courseId: string
  courseName: string
  deliveryType: 'Live' | 'Virtual' | 'In-person' | 'Self-paced'
  date: string
  startTime: string
  endTime: string
  meetingLink?: string
  enrolledCount: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

export interface TrainerActivity {
  id: string
  timestamp: string
  action: 'Session Started' | 'Assessment Graded' | 'Feedback Sent' | 'Module Published'
  module?: string
  courseName?: string
}

export interface LearnerProgress {
  learnerId: string
  learnerName: string
  courseId: string
  courseName: string
  completionPercent: number
  modulesCompleted: number
  totalModules: number
  lastActivity: string
  timeSpentMinutes?: number
}

const trainerSessions: TrainerSession[] = [
  { id: 's1', topic: 'JavaScript Basics', courseId: '1', courseName: 'Introduction to Programming', deliveryType: 'Virtual', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), startTime: '10:00', endTime: '11:30', meetingLink: 'https://meet.example.com/js-basics', enrolledCount: 12, status: 'scheduled' },
  { id: 's2', topic: 'Arrays & Loops', courseId: '1', courseName: 'Introduction to Programming', deliveryType: 'Virtual', date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), startTime: '14:00', endTime: '15:30', meetingLink: 'https://meet.example.com/arrays', enrolledCount: 12, status: 'scheduled' },
  { id: 's3', topic: 'Quiz Review', courseId: '1', courseName: 'Introduction to Programming', deliveryType: 'Live', date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), startTime: '09:00', endTime: '10:00', meetingLink: 'https://meet.example.com/quiz', enrolledCount: 10, status: 'scheduled' },
]

const trainerActivity: TrainerActivity[] = [
  { id: 'a1', timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'Assessment Graded', module: 'Assignment 1', courseName: 'Introduction to Programming' },
  { id: 'a2', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), action: 'Feedback Sent', module: 'Project Task', courseName: 'Introduction to Programming' },
  { id: 'a3', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), action: 'Session Started', module: 'JS Variables', courseName: 'Introduction to Programming' },
]

export function getTrainerSessions(): TrainerSession[] {
  return [...trainerSessions]
}

export function getTrainerActivity(): TrainerActivity[] {
  return trainerActivity
}

export function getTrainerMetrics() {
  const sessions = getTrainerSessions()
  const now = new Date()
  const sevenDaysFromNow = new Date(now)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled' && new Date(s.date) >= now && new Date(s.date) <= sevenDaysFromNow).length
  const courses = getCourses()
  const subs = getSubmissions()
  const graded = subs.filter((s) => s.status === 'reviewed').length
  const pending = subs.filter((s) => s.status === 'pending').length
  const sts = getStudents()
  return {
    assignedCourses: courses.length,
    upcomingSessions7Days: upcomingSessions,
    learnersEnrolled: sts.length,
    completionRatePercent: 72,
    assessmentsGradedMonthly: graded,
    feedbackPending: pending,
  }
}

export function getLearnerProgress(): LearnerProgress[] {
  const sts = getStudents()
  const courses = getCourses()
  const result: LearnerProgress[] = []
  sts.forEach((s) => {
    courses.forEach((c) => {
      const modules = c.contentSections?.length ?? 0
      const completed = Math.min(modules, randomInt(modules + 1))
      result.push({
        learnerId: s.id,
        learnerName: `${s.firstName} ${s.lastName}`,
        courseId: c.id,
        courseName: c.name,
        completionPercent: modules ? Math.round((completed / modules) * 100) : 0,
        modulesCompleted: completed,
        totalModules: modules,
        lastActivity: new Date(Date.now() - randomInt(7 * 24 * 3600000)).toISOString(),
        timeSpentMinutes: Math.floor(60 + randomInt(300)),
      })
    })
  })
  return result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
}

// === Curriculum Builder Methods (Mirroring Org Admin) ===

export function getProgramResources(programId: string): ProgramResource[] {
  return programResources
    .filter((r) => r.programId === programId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function addProgramResource(data: Omit<ProgramResource, 'id' | 'createdAt'>): ProgramResource {
  const r: ProgramResource = {
    ...data,
    id: `res-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  programResources = [...programResources, r]
  return r
}

export function updateProgramResource(id: string, data: Partial<ProgramResource>): ProgramResource | null {
  const idx = programResources.findIndex((r) => r.id === id)
  if (idx === -1) return null
  programResources = programResources.map((r) => (r.id === id ? { ...r, ...data } : r))
  return programResources[idx]
}

export function removeProgramResource(id: string): void {
  programResources = programResources.filter((r) => r.id !== id)
}

export function getProgramTasks(programId: string): ProgramTask[] {
  return programTasks
    .filter((t) => t.programId === programId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function addProgramTask(data: Omit<ProgramTask, 'id' | 'createdAt'>): ProgramTask {
  const t: ProgramTask = {
    ...data,
    id: `tsk-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  programTasks = [...programTasks, t]
  return t
}

export function updateProgramTask(id: string, data: Partial<ProgramTask>): ProgramTask | null {
  const idx = programTasks.findIndex((t) => t.id === id)
  if (idx === -1) return null
  programTasks = programTasks.map((t) => (t.id === id ? { ...t, ...data } : t))
  return programTasks[idx]
}

export function removeProgramTask(id: string): void {
  programTasks = programTasks.filter((t) => t.id !== id)
}

export function getProgramAssessments(programId: string): ProgramAssessment[] {
  return programAssessments
    .filter((a) => a.programId === programId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function addProgramAssessment(data: Omit<ProgramAssessment, 'id' | 'createdAt'>): ProgramAssessment {
  const a: ProgramAssessment = {
    ...data,
    id: `asm-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: data.status || 'draft',
  }
  programAssessments = [...programAssessments, a]
  return a
}

export function removeProgramAssessment(id: string): void {
  programAssessments = programAssessments.filter((a) => a.id !== id)
}

export function getQuestions(quizId: string): Question[] {
  return questions.filter((q) => q.quizId === quizId)
}

export function addQuestion(data: Omit<Question, 'id'>): Question {
  const q: Question = {
    ...data,
    id: `qu-${Date.now()}`,
  }
  questions = [...questions, q]
  return q
}
