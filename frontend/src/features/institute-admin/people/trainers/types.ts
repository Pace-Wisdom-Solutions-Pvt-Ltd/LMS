// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { BatchOption } from '../students/types'

export type { BatchOption }

/** A trainer/staff row as shown in the listing table. */
export type TrainerRow = {
  id: string
  userUuid: string
  firstName: string
  lastName: string
  email: string
  role?: string
  status: 'active' | 'inactive'
  userStatus: string
  assignedCourseTitles: string[]
}

/** Editable fields backing the create / edit trainer form. */
export type TrainerForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  batches: string[]
  courses: string[]
}

export const EMPTY_TRAINER_FORM: TrainerForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  batches: [],
  courses: [],
}

/** Fully-loaded trainer details shown in the details modal. */
export type TrainerDetails = {
  id: string
  userUuid: string
  name: string
  email: string
  phone: string
  role: string
  batch: string
  assignedCourses: string[]
  isActive: boolean
  userStatus: string
  joinedAt: string
}

/** Org admins are view-only in the trainer listing. */
export function isOrgAdmin(role?: string): boolean {
  return String(role ?? '').toLowerCase() === 'org_admin'
}
