// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StudentMyCourses from '../courses/MyCourses'
import * as orgApi from '../../../lib/api/organizations'
import type { ApiCourseRoadmap, ApiEnrolledCourse } from '../../../lib/api/organizations'

// Mock the API layer
vi.mock('../../../lib/api/organizations', () => ({
  getMyCoursesApi: vi.fn(),
  getCourseRoadmapApi: vi.fn(),
  completeModuleNodeApi: vi.fn(),
}))

// Mock auth
vi.mock('../../../lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
  getStoredUser: vi.fn().mockReturnValue({ email: 'student@test.com', role: 'student' }),
  hasRole: vi.fn().mockReturnValue(true),
}))

describe('StudentMyCourses - progress interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const course: ApiEnrolledCourse = {
      id: 1,
      organization: 1,
      title: 'AI Mastery',
      description: 'Deep dive.',
      completion_percentage: '10',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue([course])
    // Legacy/detail roadmap shape with inline content, which ApiRoadmapNode doesn't model.
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue({
      ...course,
      modules: [
        {
          id: 101,
          title: 'Foundations',
          nodes: [
            { id: 201, title: 'Intro Video', learning_material: { content_type: 'video', content_url: 'https://youtube.com/watch?v=123' }, is_completed: false }
          ]
        }
      ]
    } as unknown as ApiCourseRoadmap)
    vi.mocked(orgApi.completeModuleNodeApi).mockResolvedValue(undefined)
  })

  it('completes a roadmap node and triggers UI update', async () => {
    // Render with Route to provide courseId
    render(
      <MemoryRouter initialEntries={['/student/my-courses/1']}>
        <Routes>
          <Route path="/student/my-courses/:courseId" element={<StudentMyCourses />} />
        </Routes>
      </MemoryRouter>
    )

    // 1. Module is already auto-expanded on mount (Foundations)
    // 2. Expand Node
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)
    
    // 3. Mark as Completed
    const completeBtn = await screen.findByText(/MARK AS COMPLETED/i)
    fireEvent.click(completeBtn)
    
    // 4. Verify API call with numeric ID
    await waitFor(() => {
      expect(orgApi.completeModuleNodeApi).toHaveBeenCalledWith(201)
    })
  })

  it('navigates to roadmap when course card is clicked in list view', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter initialEntries={['/student/my-courses']}>
        <Routes>
          <Route path="/student/my-courses" element={<StudentMyCourses />} />
          <Route path="/student/my-courses/:courseId" element={<div>ROADMAP VIEW</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Find course card button
    const cardBtn = await screen.findByTestId('course-card-btn')
    await user.click(cardBtn)

    // Verify navigation
    expect(await screen.findByText(/ROADMAP VIEW/i)).toBeDefined()
  })
})
