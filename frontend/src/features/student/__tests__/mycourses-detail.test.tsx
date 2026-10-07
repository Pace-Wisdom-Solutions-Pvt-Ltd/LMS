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
  hasRole: vi.fn().mockReturnValue(true),
}))

// Legacy/detail roadmap shape: nodes carry their content inline, which the UI
// still supports alongside the newer capability-flag shape.
const mockRoadmap = {
  id: 1,
  title: 'Data Science Fundamentals',
  modules: [
    {
      id: 101,
      title: 'Easy',
      objective: 'Learn the basics',
      nodes: [
        { 
          id: 201, 
          title: 'Video Lesson', 
          quick_outline: [{ id: 1, text: 'Intro to Python' }],
          focus_areas: [{ id: 1, text: 'Syntax and Variables' }],
          learning_material: { 
            content_type: 'video', 
            content_url: 'https://youtube.com'
          },
          is_completed: false 
        }
      ]
    },
    {
      id: 102,
      title: 'Hard',
      objective: 'Advanced topics',
      nodes: []
    }
  ]
} as unknown as ApiCourseRoadmap

const mockCourses: ApiEnrolledCourse[] = [
  {
    id: 1,
    organization: 1,
    title: 'Data Science Fundamentals',
    description: 'Basics.',
    completion_percentage: '0',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

const renderDetailView = () => {
  render(
    <MemoryRouter initialEntries={['/student/my-courses/1']}>
      <Routes>
        <Route path="/student/my-courses/:courseId" element={<StudentMyCourses />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('StudentMyCourses – CourseDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(mockRoadmap)
    vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourses)
  })

  it('renders detailed roadmap with course title', async () => {
    renderDetailView()
    expect(await screen.findByText(/Data Science Fundamentals/i)).toBeDefined()
  })

  it('shows phase labels and titles', async () => {
    renderDetailView()
    await waitFor(() => {
      expect(screen.getByText('01')).toBeDefined()
      expect(screen.getByText('02')).toBeDefined()
      expect(screen.getByText('Easy PHASE')).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Easy', level: 4 })).toBeDefined()
    })
    // Phase 1 is open; phase 2 stays locked until phase 1 is complete.
    expect(screen.getByText('Module Objective')).toBeDefined()
    expect(screen.getByText('Locked Phase')).toBeDefined()
  })
})

describe('StudentMyCourses – Node Interaction', () => {
  beforeEach(() => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(mockRoadmap)
    vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourses)
    vi.mocked(orgApi.completeModuleNodeApi).mockResolvedValue(undefined)
  })

  it('expands a module and shows its nodes', async () => {
    renderDetailView()
    
    // Easy module is already expanded by auto-expansion logic
    expect(await screen.findByText(/Video Lesson/i)).toBeDefined()
  })

  it('shows instructional guidance (Outline/Focus) when node is expanded', async () => {
    const user = userEvent.setup()
    renderDetailView()
    
    // Easy module is already expanded
    const nodeBtn = await screen.findByTestId('node-btn')
    await user.click(nodeBtn)
    
    // Check for instructional sections
    const outline = await screen.findByText(/Quick Outline/i)
    const focus = await screen.findByText(/Focus Areas/i)
    
    expect(outline).toBeDefined()
    expect(focus).toBeDefined()
  })

  it('completes a node and updates state', async () => {
    renderDetailView()
    
    // Easy module is already expanded
    // Expand Node
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)
    
    // Mark as completed
    const completeBtn = await screen.findByText(/MARK AS COMPLETED/i)
    fireEvent.click(completeBtn)
    
    // Verify API call with numeric ID
    await waitFor(() => {
      expect(orgApi.completeModuleNodeApi).toHaveBeenCalledWith(201)
    })
  })
})
