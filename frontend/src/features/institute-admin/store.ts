// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { newId } from '@/lib/ids'

// === Types ===

export interface AttendanceRecord {
  id: string
  date: string
  gradeId: string
  sectionId: string
  present: number
  absent: number
  total: number
}

export interface Grade {
  id: string
  name: string
  order: number
  description?: string
}

export interface Section {
  id: string
  name: string
  gradeId: string
  capacity: number
  room?: string
}

export interface Subject {
  id: string
  name: string
  code: string
  description?: string
  category?: string
  durationHours?: number
  mandatory?: boolean
  status?: 'draft' | 'published'
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  subjects: string[]
  joinedAt: string
  status: 'active' | 'inactive'
}

export interface Session {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  subjectId: string
  teacherId: string
  sectionId: string
  room?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface Department {
  id: string
  name: string
  parentId?: string
  managerId?: string
  status: 'active' | 'inactive'
  maxLearners?: number
}

export type JobRoleLevel = 'Junior' | 'Mid' | 'Senior'

export interface JobRole {
  id: string
  name: string
  level: JobRoleLevel
  requiredSkillIds: string[]
  status: 'active' | 'inactive'
}

export interface Skill {
  id: string
  name: string
}

export type TrainingCycleStatus = 'current' | 'past' | 'upcoming'

export interface TrainingCycle {
  id: string
  startDate: string
  endDate: string
  compliancePeriodName: string
  status: TrainingCycleStatus
}

export interface SkillsMapping {
  id: string
  departmentId?: string
  jobRoleId?: string
  skillIds: string[]
  trainerIds: string[]
  contentOwnerIds: string[]
}

export interface Question {
  id: string
  quizId?: string
  text: string
  type: 'mcq' | 'short_answer'
  options?: { id: string; text: string; isCorrect: boolean }[]
  allowMultipleCorrect?: boolean
  subjectId?: string
}

export type SubmissionFormat =
  | 'link'
  | 'paragraph'
  | 'pdf'
  | 'screenshot'
  | 'codeblock'
  | 'file'

export interface CourseTrack {
  id: string
  name: string
  description?: string
  createdAt: string
  status: 'draft' | 'published'
}

export interface CourseLevel {
  id: string
  trackId: string
  name: 'Beginner' | 'Intermediate' | 'Advanced' | string
  order: number
}

export interface Program {
  id: string
  trackId: string
  levelId: string
  title: string
  description?: string
  estimatedHours?: number
  status: 'draft' | 'published'
  createdAt: string
}

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

export interface Announcement {
  id: string
  title: string
  body: string
  target: 'all' | 'teachers' | 'students' | string
  createdBy: string
  createdAt: string
  status: 'draft' | 'published'
}

export interface RescheduleRequest {
  id: string
  sessionId: string
  requestedDate: string
  reason: string
  requestedBy: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface CalendarConflict {
  id: string
  type: string
  date: string
  time: string
  detail: string
  sessionIds?: string[]
}

// === Seed Data ===

const grades: Grade[] = [
  { id: 'g1', name: 'Grade 7', order: 7, description: 'Middle school' },
  { id: 'g2', name: 'Grade 8', order: 8 },
  { id: 'g3', name: 'Grade 9', order: 9 },
]

const sections: Section[] = [
  { id: 's1', name: 'Section A', gradeId: 'g1', capacity: 35, room: 'R101' },
  { id: 's2', name: 'Section B', gradeId: 'g1', capacity: 32, room: 'R102' },
  { id: 's3', name: 'Section A', gradeId: 'g2', capacity: 30, room: 'R201' },
]

const subjects: Subject[] = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH', description: 'Core math', category: 'Compliance', durationHours: 4, mandatory: true, status: 'published' },
  { id: 'sub2', name: 'Science', code: 'SCI', description: 'Natural sciences', category: 'Technical', durationHours: 3, mandatory: false, status: 'draft' },
  { id: 'sub3', name: 'English', code: 'ENG', description: 'Language arts', category: 'Onboarding', durationHours: 2, mandatory: false, status: 'published' },
]

const teachers: Teacher[] = [
  { id: 't1', firstName: 'John', lastName: 'Doe', email: 'john@org.com', phone: '+1234567890', subjects: ['sub1'], joinedAt: '2025-01-15', status: 'active' },
  { id: 't2', firstName: 'Jane', lastName: 'Smith', email: 'jane@org.com', subjects: ['sub2', 'sub3'], joinedAt: '2025-02-01', status: 'active' },
]

let sessions: Session[] = [
  { id: 'ses1', title: 'Math Class', date: '2026-03-02', startTime: '09:00', endTime: '09:45', subjectId: 'sub1', teacherId: 't1', sectionId: 's1', room: 'R101', status: 'scheduled' },
  { id: 'ses2', title: 'Science Lab', date: '2026-03-02', startTime: '10:00', endTime: '10:45', subjectId: 'sub2', teacherId: 't2', sectionId: 's1', room: 'Lab1', status: 'scheduled' },
  { id: 'ses3', title: 'English', date: '2026-03-01', startTime: '11:00', endTime: '11:45', subjectId: 'sub3', teacherId: 't2', sectionId: 's1', status: 'completed' },
]

let departments: Department[] = [
  { id: 'dept1', name: 'Engineering', status: 'active', maxLearners: 100 },
  { id: 'dept2', name: 'Data Team', parentId: 'dept1', status: 'active', maxLearners: 30 },
]

let jobRoles: JobRole[] = [
  { id: 'role1', name: 'Software Engineer', level: 'Mid', requiredSkillIds: ['sk1', 'sk2'], status: 'active' },
  { id: 'role2', name: 'Data Analyst', level: 'Junior', requiredSkillIds: ['sk1', 'sk3'], status: 'active' },
]

let skills: Skill[] = [
  { id: 'sk1', name: 'Python' },
  { id: 'sk2', name: 'System Design' },
  { id: 'sk3', name: 'SQL & Reporting' },
]

let trainingCycles: TrainingCycle[] = [
  { id: 'tc1', startDate: '2026-01-01', endDate: '2026-12-31', compliancePeriodName: 'FY 2026', status: 'current' },
]

let skillsMappings: SkillsMapping[] = [
  { id: 'sm1', departmentId: 'dept1', skillIds: ['sk1', 'sk2'], trainerIds: [], contentOwnerIds: [] },
  { id: 'sm2', jobRoleId: 'role2', skillIds: ['sk1', 'sk3'], trainerIds: [], contentOwnerIds: [] },
]

let questions: Question[] = [
  { id: 'qu1', quizId: 'q1', text: 'What is 2 + 2?', type: 'mcq', options: [{ id: 'o1', text: '3', isCorrect: false }, { id: 'o2', text: '4', isCorrect: true }], subjectId: 'sub1' },
  { id: 'qu2', quizId: 'q1', text: 'Simplify: 3x + 2x', type: 'short_answer', subjectId: 'sub1' },
]


let courseTracks: CourseTrack[] = [
  { id: 'trk1', name: 'Data Science', description: 'End-to-end data science learning path.', createdAt: '2026-02-10', status: 'published' },
]

let courseLevels: CourseLevel[] = [
  { id: 'lvl1', trackId: 'trk1', name: 'Beginner', order: 1 },
  { id: 'lvl2', trackId: 'trk1', name: 'Intermediate', order: 2 },
  { id: 'lvl3', trackId: 'trk1', name: 'Advanced', order: 3 },
]

let programs: Program[] = [
  { id: 'prg1', trackId: 'trk1', levelId: 'lvl1', title: 'Python for Beginners', description: 'Python fundamentals for absolute beginners.', estimatedHours: 10, status: 'published', createdAt: '2026-02-12' },
  { id: 'prg2', trackId: 'trk1', levelId: 'lvl1', title: 'Beginner Projects: Mini Apps', description: 'Apply your beginner Python skills by building small, guided projects.', estimatedHours: 8, status: 'published', createdAt: '2026-02-18' },
  { id: 'prg3', trackId: 'trk1', levelId: 'lvl2', title: 'Python Intermediate Concepts', description: 'Intermediate-level Python: functions, modules, error handling and file I/O.', estimatedHours: 12, status: 'published', createdAt: '2026-02-20' },
]

let programResources: ProgramResource[] = [
  { id: 'res1', programId: 'prg1', title: 'Intro to Python (YouTube)', type: 'youtube', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', focusNotes: 'Focus on chapters 1–5 only.', outline: 'What is Python? · Installing Python · First script · Variables & types', order: 1, createdAt: '2026-02-13' },
  { id: 'res2', programId: 'prg1', title: 'Python Basics PDF', type: 'pdf', url: 'https://example.com/python-basics.pdf', focusNotes: 'Read pages 10–25.', outline: 'Variables · Conditions · Loops · Functions', order: 2, createdAt: '2026-02-13' },
  { id: 'res3', programId: 'prg2', title: 'Project Ideas: Simple Games', type: 'link', url: 'https://example.com/python-beginner-projects.docx', focusNotes: 'Pick one mini-project to build.', outline: 'Game loops · Random numbers · User input', order: 1, createdAt: '2026-02-18' },
  { id: 'res4', programId: 'prg3', title: 'Intermediate Python Tutorial (YouTube)', type: 'youtube', url: 'https://www.youtube.com/watch?v=HGOBQPFzWKo', focusNotes: 'Focus on functions, error handling and modules.', outline: 'Defining functions · Exceptions · Modules & packages', order: 1, createdAt: '2026-02-20' },
]

let programTasks: ProgramTask[] = [
  { id: 'tsk1', programId: 'prg1', title: 'Variables & Data Types Practice', description: 'Write a short script demonstrating variables and basic types.', requiredSubmissionFormats: ['codeblock'], dueDate: '2026-03-20', createdAt: '2026-02-14' },
  { id: 'tsk2', programId: 'prg2', title: 'Build Your First Mini App', description: 'Implement one of the beginner project ideas and submit your solution.', requiredSubmissionFormats: ['codeblock'], dueDate: '2026-03-25', createdAt: '2026-02-18' },
  { id: 'tsk3', programId: 'prg3', title: 'Functions & Error Handling Exercise', description: 'Write functions that validate user input and handle common errors.', requiredSubmissionFormats: ['codeblock'], dueDate: '2026-04-05', createdAt: '2026-02-21' },
]

let programAssessments: ProgramAssessment[] = [
  { id: 'asm1', programId: 'prg1', name: 'Python Basics Assessment', type: 'practical', durationMinutes: 45, mandatory: true, requiredSubmissionFormats: ['link', 'codeblock'], createdAt: '2026-02-15', status: 'published' },
  { id: 'asm2', programId: 'prg2', name: 'Beginner Projects Review', type: 'scenario', durationMinutes: 30, mandatory: false, requiredSubmissionFormats: ['link'], createdAt: '2026-02-22', status: 'draft' },
  { id: 'asm3', programId: 'prg3', name: 'Intermediate Python Practical', type: 'practical', durationMinutes: 60, mandatory: true, requiredSubmissionFormats: ['codeblock'], createdAt: '2026-02-24', status: 'published' },
]

let announcements: Announcement[] = [
  { id: 'a1', title: 'Welcome Back', body: 'Welcome to the new academic year!', target: 'all', createdBy: 'Admin', createdAt: '2026-02-01T09:00:00', status: 'published' },
  { id: 'a2', title: 'Holiday Notice', body: 'School closed on March 15.', target: 'all', createdBy: 'Admin', createdAt: '2026-02-20T14:00:00', status: 'draft' },
]

const TODAY = new Date().toISOString().split('T')[0]

const attendanceRecords: AttendanceRecord[] = [
  { id: 'att1', date: '2026-03-01', gradeId: 'g1', sectionId: 's1', present: 32, absent: 3, total: 35 },
  { id: 'att2', date: '2026-03-01', gradeId: 'g1', sectionId: 's2', present: 30, absent: 2, total: 32 },
  { id: 'att-today1', date: TODAY, gradeId: 'g1', sectionId: 's1', present: 25, absent: 10, total: 35 },
  { id: 'att-today2', date: TODAY, gradeId: 'g1', sectionId: 's2', present: 22, absent: 10, total: 32 },
]

let rescheduleRequests: RescheduleRequest[] = [
  { id: 'rr1', sessionId: 'ses1', requestedDate: '2026-03-05', reason: 'Teacher unavailable', requestedBy: 'John Doe', status: 'pending', createdAt: '2026-02-28T10:00:00' },
]

const calendarConflicts: CalendarConflict[] = [
  { id: 'cc1', type: 'Teacher double-booked', date: '2026-03-03', time: '10:00 AM', detail: 'John Doe assigned to two sessions', sessionIds: ['ses1', 'ses2'] },
]

// === Attendance ===

export function getAttendanceData(): AttendanceRecord[] {
  return [...attendanceRecords]
}

// === Sessions ===

export function getSessions(): Session[] {
  return [...sessions].sort((a, b) => {
    const da = new Date(`${a.date}T${a.startTime}`).getTime()
    const db = new Date(`${b.date}T${b.startTime}`).getTime()
    return da - db
  })
}

export function updateSession(id: string, data: Partial<Session>): Session | null {
  const prev = sessions.find((x) => x.id === id)
  if (!prev) return null
  const idx = sessions.findIndex((x) => x.id === id)
  sessions = sessions.map((x) => (x.id === id ? { ...x, ...data } : x))
  return sessions[idx]
}

// === Quizzes & Questions ===

export function getQuestions(quizId?: string): Question[] {
  if (quizId) return questions.filter((q) => q.quizId === quizId)
  return [...questions]
}

export function addQuestion(data: Omit<Question, 'id'>): Question {
  const q: Question = { ...data, id: newId('qu') }
  questions = [...questions, q]
  return q
}


// === Training Structure ===

export function getDepartments(): Department[] {
  return [...departments]
}

export function addDepartment(data: Omit<Department, 'id'>): Department {
  const d: Department = { ...data, id: `dept-${Date.now()}` }
  departments = [...departments, d]
  return d
}

export function updateDepartment(id: string, data: Partial<Department>): Department | null {
  const idx = departments.findIndex((x) => x.id === id)
  if (idx === -1) return null
  departments = departments.map((x) => (x.id === id ? { ...x, ...data } : x))
  return departments[idx]
}

export function getJobRoles(): JobRole[] {
  return [...jobRoles]
}

export function addJobRole(data: Omit<JobRole, 'id'>): JobRole {
  const r: JobRole = { ...data, id: `role-${Date.now()}` }
  jobRoles = [...jobRoles, r]
  return r
}

export function updateJobRole(id: string, data: Partial<JobRole>): JobRole | null {
  const idx = jobRoles.findIndex((x) => x.id === id)
  if (idx === -1) return null
  jobRoles = jobRoles.map((x) => (x.id === id ? { ...x, ...data } : x))
  return jobRoles[idx]
}

export function getSkills(): Skill[] {
  return [...skills]
}

export function addSkill(data: Omit<Skill, 'id'>): Skill {
  const s: Skill = { ...data, id: `sk-${Date.now()}` }
  skills = [...skills, s]
  return s
}

export function getTrainingCycles(): TrainingCycle[] {
  return [...trainingCycles].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
}

export function addTrainingCycle(data: Omit<TrainingCycle, 'id'>): TrainingCycle {
  const t: TrainingCycle = { ...data, id: `tc-${Date.now()}` }
  trainingCycles = [t, ...trainingCycles]
  return t
}

export function updateTrainingCycle(id: string, data: Partial<TrainingCycle>): TrainingCycle | null {
  const idx = trainingCycles.findIndex((x) => x.id === id)
  if (idx === -1) return null
  trainingCycles = trainingCycles.map((x) => (x.id === id ? { ...x, ...data } : x))
  return trainingCycles[idx]
}

export function getSkillsMappings(): SkillsMapping[] {
  return [...skillsMappings]
}

export function addSkillsMapping(data: Omit<SkillsMapping, 'id'>): SkillsMapping {
  const m: SkillsMapping = { ...data, id: `sm-${Date.now()}` }
  skillsMappings = [...skillsMappings, m]
  return m
}

export function updateSkillsMapping(id: string, data: Partial<SkillsMapping>): SkillsMapping | null {
  const idx = skillsMappings.findIndex((x) => x.id === id)
  if (idx === -1) return null
  skillsMappings = skillsMappings.map((x) => (x.id === id ? { ...x, ...data } : x))
  return skillsMappings[idx]
}

// === Announcements ===

export function getAnnouncements(): Announcement[] {
  return [...announcements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addAnnouncement(data: Omit<Announcement, 'id'>): Announcement {
  const a: Announcement = { ...data, id: `a-${Date.now()}` }
  announcements = [a, ...announcements]
  return a
}

export function updateAnnouncement(id: string, data: Partial<Announcement>): Announcement | null {
  const idx = announcements.findIndex((x) => x.id === id)
  if (idx === -1) return null
  announcements = announcements.map((x) => (x.id === id ? { ...x, ...data } : x))
  return announcements[idx]
}

// === Reschedule & Conflicts ===

export function getRescheduleRequests(): RescheduleRequest[] {
  return [...rescheduleRequests]
}

export function updateRescheduleRequest(id: string, status: 'pending' | 'approved' | 'rejected'): RescheduleRequest | null {
  const prev = rescheduleRequests.find((x) => x.id === id)
  if (!prev) return null
  const idx = rescheduleRequests.findIndex((x) => x.id === id)
  rescheduleRequests = rescheduleRequests.map((x) => (x.id === id ? { ...x, status } : x))
  return rescheduleRequests[idx]
}

export function getCalendarConflicts(): CalendarConflict[] {
  return [...calendarConflicts]
}

// === Course Builder (Track → Level → Program) ===

export function getCourseTracks(): CourseTrack[] {
  return [...courseTracks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addCourseTrack(data: Omit<CourseTrack, 'id' | 'createdAt'>): CourseTrack {
  const t: CourseTrack = { id: `trk-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0], ...data }
  courseTracks = [t, ...courseTracks]
  return t
}

export function updateCourseTrack(id: string, data: Partial<CourseTrack>): CourseTrack | null {
  const idx = courseTracks.findIndex((x) => x.id === id)
  if (idx === -1) return null
  courseTracks = courseTracks.map((x) => (x.id === id ? { ...x, ...data } : x))
  return courseTracks[idx]
}

export function getCourseLevels(trackId: string): CourseLevel[] {
  return courseLevels.filter((l) => l.trackId === trackId).slice().sort((a, b) => a.order - b.order)
}

export function addCourseLevel(data: Omit<CourseLevel, 'id'>): CourseLevel {
  const lvl: CourseLevel = { ...data, id: `lvl-${Date.now()}` }
  courseLevels = [...courseLevels, lvl]
  return lvl
}

export function updateCourseLevel(id: string, data: Partial<CourseLevel>): CourseLevel | null {
  const idx = courseLevels.findIndex((x) => x.id === id)
  if (idx === -1) return null
  courseLevels = courseLevels.map((x) => (x.id === id ? { ...x, ...data } : x))
  return courseLevels[idx]
}

export function removeCourseLevelsByName(trackId: string, name: string): number {
  const before = courseLevels.length
  const target = name.trim().toLowerCase()
  courseLevels = courseLevels.filter((l) => !(l.trackId === trackId && String(l.name).toLowerCase() === target))
  return before - courseLevels.length
}

export function getProgramsByLevel(levelId: string): Program[] {
  return programs.filter((p) => p.levelId === levelId).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addProgram(data: Omit<Program, 'id' | 'createdAt'>): Program {
  const p: Program = { id: `prg-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0], ...data }
  programs = [p, ...programs]
  return p
}

export function updateProgram(id: string, data: Partial<Program>): Program | null {
  const idx = programs.findIndex((x) => x.id === id)
  if (idx === -1) return null
  programs = programs.map((x) => (x.id === id ? { ...x, ...data } : x))
  return programs[idx]
}

export function getProgramResources(programId: string): ProgramResource[] {
  return programResources.filter((r) => r.programId === programId).slice().sort((a, b) => {
    const ao = a.order ?? 0
    const bo = b.order ?? 0
    if (ao !== bo) return ao - bo
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

export function addProgramResource(data: Omit<ProgramResource, 'id' | 'createdAt'>): ProgramResource {
  const existing = programResources.filter((r) => r.programId === data.programId)
  const maxOrder = existing.reduce((m, r) => (r.order && r.order > m ? r.order : m), 0)
  const r: ProgramResource = { id: `res-${Date.now()}`, createdAt: new Date().toISOString(), order: data.order ?? maxOrder + 1, ...data }
  programResources = [r, ...programResources]
  return r
}

export function updateProgramResource(id: string, data: Partial<ProgramResource>): ProgramResource | null {
  const idx = programResources.findIndex((x) => x.id === id)
  if (idx === -1) return null
  programResources = programResources.map((x) => (x.id === id ? { ...x, ...data } : x))
  return programResources[idx]
}

export function removeProgramResource(id: string): boolean {
  const before = programResources.length
  programResources = programResources.filter((r) => r.id !== id)
  return programResources.length < before
}

export function getProgramTasks(programId: string): ProgramTask[] {
  return programTasks.filter((t) => t.programId === programId).slice().sort((a, b) => {
    const ao = a.order ?? 0
    const bo = b.order ?? 0
    if (ao !== bo) return ao - bo
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

export function addProgramTask(data: Omit<ProgramTask, 'id' | 'createdAt'>): ProgramTask {
  const existing = programTasks.filter((t) => t.programId === data.programId)
  const maxOrder = existing.reduce((m, t) => (t.order && t.order > m ? t.order : m), 0)
  const t: ProgramTask = { id: `tsk-${Date.now()}`, createdAt: new Date().toISOString(), order: data.order ?? maxOrder + 1, ...data }
  programTasks = [t, ...programTasks]
  return t
}

export function updateProgramTask(id: string, data: Partial<ProgramTask>): ProgramTask | null {
  const idx = programTasks.findIndex((x) => x.id === id)
  if (idx === -1) return null
  programTasks = programTasks.map((x) => (x.id === id ? { ...x, ...data } : x))
  return programTasks[idx]
}

export function removeProgramTask(id: string): boolean {
  const before = programTasks.length
  programTasks = programTasks.filter((t) => t.id !== id)
  return programTasks.length < before
}

export function getProgramAssessments(programId: string): ProgramAssessment[] {
  return programAssessments.filter((a) => a.programId === programId).slice().sort((a, b) => {
    const ao = a.order ?? 0
    const bo = b.order ?? 0
    if (ao !== bo) return ao - bo
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

export function addProgramAssessment(data: Omit<ProgramAssessment, 'id' | 'createdAt'>): ProgramAssessment {
  const existing = programAssessments.filter((a) => a.programId === data.programId)
  const maxOrder = existing.reduce((m, a) => (a.order && a.order > m ? a.order : m), 0)
  const a: ProgramAssessment = { id: `asm-${Date.now()}`, createdAt: new Date().toISOString(), order: data.order ?? maxOrder + 1, ...data }
  programAssessments = [a, ...programAssessments]
  return a
}

export function updateProgramAssessment(id: string, data: Partial<ProgramAssessment>): ProgramAssessment | null {
  const idx = programAssessments.findIndex((x) => x.id === id)
  if (idx === -1) return null
  programAssessments = programAssessments.map((x) => (x.id === id ? { ...x, ...data } : x))
  return programAssessments[idx]
}

export function removeProgramAssessment(id: string): boolean {
  const before = programAssessments.length
  programAssessments = programAssessments.filter((a) => a.id !== id)
  return programAssessments.length < before
}

// === Name Helpers ===

export function getGradeName(id: string): string {
  return grades.find((g) => g.id === id)?.name ?? id
}

export function getSectionName(id: string): string {
  return sections.find((s) => s.id === id)?.name ?? id
}

export function getSubjectName(id: string): string {
  return subjects.find((s) => s.id === id)?.name ?? id
}

export function getTeacherName(id: string): string {
  const t = teachers.find((x) => x.id === id)
  return t ? `${t.firstName} ${t.lastName}` : id
}

export function getDepartmentName(id: string): string {
  return departments.find((d) => d.id === id)?.name ?? id
}

export function getJobRoleName(id: string): string {
  return jobRoles.find((r) => r.id === id)?.name ?? id
}

export function getSkillName(id: string): string {
  return skills.find((s) => s.id === id)?.name ?? id
}
