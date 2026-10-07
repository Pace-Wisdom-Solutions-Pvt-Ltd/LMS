// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as matchers from '@testing-library/jest-dom/matchers'
import { MemoryRouter } from 'react-router-dom'
import StudentMyCourses from '../courses/MyCourses'
import * as orgApi from '../../../lib/api/organizations'

expect.extend(matchers)

afterEach(() => cleanup())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({})
  }
})

vi.mock('../../../lib/api/organizations', () => ({
  getMyCoursesApi: vi.fn(),
  getCourseRoadmapApi: vi.fn(),
  completeModuleNodeApi: vi.fn()
}))

vi.mock('../../../stores/authStore', () => ({
  getStoredOrganizations: () => [{ id: 1 }]
}))

const mockCourses = [
  {
    id: 1,
    title: 'Data Science Fundamentals',
    description: 'Learn the basics of data science',
    completion_percentage: '40',
    thumbnail: null,
    organization: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

describe('StudentMyCourses – Course List Interaction', () => {
  beforeEach(() => {
    vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourses)
  })

  it('renders student course list dashboard', async () => {
    render(
      <MemoryRouter>
        <StudentMyCourses />
      </MemoryRouter>
    )

    expect(await screen.findByText(/MY COURSES/i)).toBeInTheDocument()
    expect(screen.getByText(/DATA SCIENCE FUNDAMENTALS/i)).toBeInTheDocument()
    expect(screen.getByText(/40% DONE/i)).toBeInTheDocument()
  })

  it('navigates to detailed roadmap when course card is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <StudentMyCourses />
      </MemoryRouter>
    )

    const courseCard = await screen.findByTestId('course-card-btn')
    await user.click(courseCard)

    expect(mockNavigate).toHaveBeenCalledWith('/student/my-courses/1')
  })
})
