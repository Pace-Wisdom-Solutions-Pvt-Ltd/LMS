// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { getCourse } from '../store'
import LearnerProgress from '../progress/LearnerProgress'
import CreateTask from '../modals/CreateTask'

afterEach(() => cleanup())

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/components/ui/PageCard', () => ({
  default: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
    <div data-testid="page-card">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/BackButton', () => ({
  default: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
}))

vi.mock('../store', () => ({
  getStudents: vi.fn().mockReturnValue([
    { id: 's1', firstName: 'Alice', lastName: 'A', email: 'alice@test.com' },
    { id: 's2', firstName: 'Bob', lastName: 'B', email: 'bob@test.com' },
  ]),
  getCourse: vi.fn().mockReturnValue({ id: 'c1', name: 'Course A', code: 'CA', summary: '', assessments: [] }),
  addAssessment: vi.fn().mockReturnValue({ id: 'task1' }),
}))

vi.mock('@/lib/api/organizations', () => ({
  getLearnerProgressPaginatedApi: vi.fn().mockResolvedValue({
    count: 2,
    next: null,
    previous: null,
    results: [
      { student_id: 's1', learner_name: 'Alice Learner', course_id: 1, course_title: 'Course A', completion_percentage: 75, modules_progress: '3/4', last_activity: '2024-03-01' },
      { student_id: 's2', learner_name: 'Bob Learner', course_id: 1, course_title: 'Course A', completion_percentage: 40, modules_progress: '2/5', last_activity: '2024-03-02' },
    ],
  }),
  getPublishedCoursesApi: vi.fn().mockResolvedValue([
    { id: 1, title: 'Course A', status: 'Published' },
  ]),
  exportAllLearnerProgressApi: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => [{ id: 1 }],
  getStoredUser: () => ({ id: 1, name: 'Test' }),
}))

describe('InstructorLearnerProgress', () => {
  it('renders without crashing', async () => {
    render(<MemoryRouter><LearnerProgress /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Alice Learner')).toBeTruthy()
    })
    expect(screen.getByText('Bob Learner')).toBeTruthy()
  })
})

describe('CreateTask', () => {
  it('renders task creation form for valid course', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/trainer/courses/c1/create-task']}>
        <Routes>
          <Route path="/trainer/courses/:courseId/create-task" element={<CreateTask />} />
        </Routes>
      </MemoryRouter>
    )
    expect(container.textContent).toContain('Create Task')
    expect(container.textContent).toContain('Text area')
    expect(container.textContent).toContain('MCQ with options')
  })

  it('shows project not found for unknown courseId', () => {
    vi.mocked(getCourse).mockReturnValueOnce(undefined)
    const { container } = render(
      <MemoryRouter initialEntries={['/trainer/courses/unknown/create-task']}>
        <Routes>
          <Route path="/trainer/courses/:courseId/create-task" element={<CreateTask />} />
        </Routes>
      </MemoryRouter>
    )
    expect(container.textContent).toContain('not found')
  })
})
