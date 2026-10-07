// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Student LMS data store (UI demo). Resets on refresh.
 */

export interface EnrolledCourse {
  id: string
  name: string
  code: string
  category: string
  progress: number
  startDate: string
  dueDate?: string
  mandatory: boolean
  status: 'in_progress' | 'completed' | 'overdue'
  description?: string
  estimatedDuration?: number // hours
  modules: StudentModule[]
}

export type StudentModuleContentType = 'video' | 'pdf' | 'quiz' | 'interactive' | 'task'

/** When contentType is 'task', this indicates how the student must submit (e.g. codeblock). */
export type TaskSubmissionFormat = 'codeblock' | 'link' | 'paragraph' | 'pdf' | 'screenshot' | 'file'

export interface StudentModule {
  id: string
  title: string
  contentType: StudentModuleContentType
  youtubeUrl?: string
  duration?: number // min
  completed: boolean
  order: number
  /** For tasks: required submission format(s). If includes 'codeblock', show CodeBlock. */
  requiredSubmissionFormats?: TaskSubmissionFormat[]
}

export interface AssignedAssessment {
  id: string
  name: string
  type: 'MCQ' | 'Scenario' | 'Essay'
  dueDate: string
  attemptsRemaining: number
  status: 'not_started' | 'in_progress' | 'submitted'
  courseName?: string
}

export interface AssessmentResult {
  assessmentId: string
  scorePercent: number
  passFail: 'pass' | 'fail'
  attemptDate: string
  feedback?: string
  certificateEligible: boolean
}

export interface StudentAlert {
  id: string
  type: 'session' | 'assessment_due' | 'feedback' | 'deadline'
  title: string
  message: string
  date: string
}

export interface StudentCertificate {
  id: string
  name: string
  issuedDate: string
  courseName: string
}

export interface FeedbackReceived {
  id: string
  trainerName: string
  courseName: string
  moduleName?: string
  text: string
  rating?: number
  date: string
}

// Mock data
const enrolled: EnrolledCourse[] = [
  {
    id: 'c1',
    name: 'Introduction to Programming',
    code: 'CS101',
    category: 'Technical',
    progress: 65,
    startDate: '2026-01-15',
    dueDate: '2026-03-31',
    mandatory: true,
    status: 'in_progress',
    description: 'Learn basics of programming',
    estimatedDuration: 20,
    modules: [
      { id: 'm1', title: 'What is JavaScript?', contentType: 'video', youtubeUrl: 'https://www.youtube.com/watch?v=upDLs1sn7g4', duration: 15, completed: true, order: 1 },
      { id: 'm2', title: 'Variables & Basics', contentType: 'video', youtubeUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk', duration: 20, completed: true, order: 2 },
      { id: 'm3', title: 'Variables & Data Types Practice', contentType: 'task', requiredSubmissionFormats: ['codeblock'], completed: false, order: 3 },
      { id: 'm4', title: 'Quiz 1 - Fundamentals', contentType: 'quiz', duration: 10, completed: false, order: 4 },
    ],
  },
  {
    id: 'c2',
    name: 'HTML Fundamentals',
    code: 'HTML101',
    category: 'Technical',
    progress: 100,
    startDate: '2026-01-10',
    dueDate: '2026-02-28',
    mandatory: false,
    status: 'completed',
    description: 'Core HTML5',
    estimatedDuration: 8,
    modules: [
      { id: 'm4', title: 'HTML Basics', contentType: 'video', duration: 25, completed: true, order: 1 },
      { id: 'm5', title: 'Quiz 1', contentType: 'quiz', duration: 5, completed: true, order: 2 },
    ],
  },
]

const assessments: AssignedAssessment[] = [
  { id: 'a1', name: 'Programming Basics Quiz', type: 'MCQ', dueDate: '2026-03-15', attemptsRemaining: 2, status: 'not_started', courseName: 'Introduction to Programming' },
  { id: 'a2', name: 'HTML Assessment', type: 'MCQ', dueDate: '2026-02-20', attemptsRemaining: 0, status: 'submitted', courseName: 'HTML Fundamentals' },
]

const results: AssessmentResult[] = [
  { assessmentId: 'a2', scorePercent: 85, passFail: 'pass', attemptDate: '2026-02-18', feedback: 'Good work!', certificateEligible: true },
]

const alerts: StudentAlert[] = [
  { id: 'al1', type: 'assessment_due', title: 'Assessment Due Soon', message: 'Programming Basics Quiz due Mar 15', date: new Date().toISOString() },
  { id: 'al2', type: 'feedback', title: 'New Feedback', message: 'Feedback received for HTML Assessment', date: new Date(Date.now() - 86400000).toISOString() },
]

const recommended = [
  { id: 'r1', name: 'React Fundamentals', category: 'Technical' },
  { id: 'r2', name: 'Compliance Training', category: 'Mandatory' },
]

const certificates: StudentCertificate[] = [
  { id: 'cert1', name: 'HTML Fundamentals Certificate', issuedDate: '2026-02-20', courseName: 'HTML Fundamentals' },
]

const feedbackList: FeedbackReceived[] = [
  { id: 'f1', trainerName: 'John Doe', courseName: 'HTML Fundamentals', text: 'Excellent progress! Keep it up.', rating: 5, date: '2026-02-18' },
]

export function getStudentMetrics() {
  const totalCourses = enrolled.length
  const overallCompletion = totalCourses ? Math.round(enrolled.reduce((s, c) => s + c.progress, 0) / totalCourses) : 0
  const pendingAssessments = assessments.filter((a) => a.status !== 'submitted').length
  const dueSoon = enrolled.filter((c) => c.dueDate && new Date(c.dueDate) <= new Date(Date.now() + 14 * 86400000)).length

  return {
    enrolledCourses: totalCourses,
    upcomingMandatoryDueDates: dueSoon,
    overallCompletionPercent: overallCompletion,
    pendingAssessments,
    certificatesEarned: certificates.length,
    learningHoursThisMonth: 12,
  }
}

export function getEnrolledCourses(): EnrolledCourse[] {
  return [...enrolled]
}

export function getCourseById(id: string): EnrolledCourse | undefined {
  return enrolled.find((c) => c.id === id)
}

export function getAssignedAssessments(): AssignedAssessment[] {
  return [...assessments]
}

export function getAssessmentResult(assessmentId: string): AssessmentResult | undefined {
  return results.find((r) => r.assessmentId === assessmentId)
}

export function getAlerts(): StudentAlert[] {
  return [...alerts]
}

export function getRecommended(): { id: string; name: string; category: string }[] {
  return [...recommended]
}

export function getCertificates(): StudentCertificate[] {
  return [...certificates]
}

export function getFeedbackReceived(): FeedbackReceived[] {
  return [...feedbackList]
}

export function markModuleComplete(courseId: string, moduleId: string): void {
  const course = enrolled.find((c) => c.id === courseId)
  if (!course) return
  const mod = course.modules.find((m) => m.id === moduleId)
  if (mod) mod.completed = true
  // Recompute course progress
  const completedCount = course.modules.filter((m) => m.completed).length
  course.progress = course.modules.length ? Math.round((completedCount / course.modules.length) * 100) : 0
  if (course.progress >= 100) course.status = 'completed'
}
