// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import InstituteAdminCourseBuilder from '../course-builder/CourseBuilder'
import * as orgApi from '@/lib/api/organizations'
import type { ApiCourseModule, ApiModuleNode } from '@/lib/api/organizations'

// Mock toast and confirm
vi.mock('@/lib/toastApi', () => ({ showToast: vi.fn() }))

// Mock navigations and params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ courseId: 'course-456' }),
  }
})

vi.mock('@/lib/api/organizations', () => ({
  createCourseApi: vi.fn(),
  createCourseModuleApi: vi.fn(),
  createModuleNodeApi: vi.fn().mockResolvedValue({ id: 1001, title: 'Created Node' }),
  deleteCourseModuleApi: vi.fn(),
  deleteModuleNodeApi: vi.fn(),
  getCoursesApi: vi.fn().mockResolvedValue([{ id: 'course-456', title: 'Test Course', status: 'published' }]),
  getCourseModulesApi: vi.fn().mockResolvedValue([]),
  getModuleNodesApi: vi.fn().mockResolvedValue([]),
  getModuleChaptersApi: vi.fn().mockResolvedValue([]),
  getModuleNodeApi: vi.fn().mockResolvedValue({ id: 'n1', title: 'Normal Node', learning_material: {} }),
  updateCourseModuleApi: vi.fn(),
  updateModuleNodeApi: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 'org-123', name: 'Test Org' }]),
  getStoredUser: vi.fn().mockReturnValue({ email: 'admin@test.com', role: 'institute_admin', roles: ['institute_admin'] }),
  hasRole: vi.fn().mockReturnValue(true),
}))

vi.mock('@/features/institute-admin/useStoreRefresh', () => ({
  useStoreRefresh: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('@/features/institute-admin/store', async () => {
  const actual = await vi.importActual('@/features/institute-admin/store')
  return {
    ...actual,
    getCourseTracks: vi.fn().mockReturnValue([{ id: 'course-456', name: 'Test Course' }]),
    getCourseLevels: vi.fn().mockReturnValue([]),
    getProgramResources: vi.fn().mockReturnValue([]),
    getProgramTasks: vi.fn().mockReturnValue([]),
    getProgramAssessments: vi.fn().mockReturnValue([]),
    getQuestions: vi.fn().mockReturnValue([]),
    addProgramResource: vi.fn().mockReturnValue({ id: 'res-new' }),
    addProgramTask: vi.fn().mockReturnValue({ id: 'task-new' }),
    addProgramAssessment: vi.fn().mockReturnValue({ id: 'quiz-new' }),
    addQuestion: vi.fn(),
    addCourseLevel: vi.fn().mockReturnValue({ id: 'lvl-new', name: 'New Level' }),
    removeCourseLevelsByName: vi.fn(),
    updateProgram: vi.fn(),
    addProgram: vi.fn(),
  }
})

describe('CourseBuilder Coverage High-Yield Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(orgApi.getCourseModulesApi).mockResolvedValue([
      { id: 'mod-1', title: 'Level 1', sequence_order: 1 }
    ] as unknown as ApiCourseModule[])
    vi.mocked(orgApi.getModuleChaptersApi).mockResolvedValue([
      { id: 1, title: 'Phase 1', sequence_order: 1 }
    ])
    vi.mocked(orgApi.getModuleNodesApi).mockResolvedValue([] as ApiModuleNode[])
  })

  afterEach(() => cleanup())

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/institute-admin/course/course-456']}>
      <Routes>
        <Route path="/institute-admin/course/:courseId" element={<InstituteAdminCourseBuilder />} />
      </Routes>
    </MemoryRouter>
  )

  it('renders correctly and loads data', async () => {
    renderComponent()
    // Course name is shown as the input's value (not plain text).
    await waitFor(() => expect(screen.getByDisplayValue('Test Course')).toBeTruthy())
  })
})
