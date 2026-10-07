// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

export type StudentRow = {
  id: string
  studentUuid: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  studentId?: string | null
  batchIds: string[]
  courseId?: string | null
  courseTitle?: string | null
  status: string
  userStatus: string
}

/** Editable fields backing the create / edit student form. */
export type StudentForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  batchIds: string[]
  studentId: string
  courseIds: string[]
  /** Active state; editable via the toggle in the edit form. */
  isActive: boolean
}

export const EMPTY_STUDENT_FORM: StudentForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  batchIds: [],
  studentId: '',
  courseIds: [],
  isActive: true,
}

/** A batch plus the courses attached to it, as needed by the student forms. */
export type BatchOption = {
  id: string
  name: string
  courses: { id: string; name: string }[]
}
