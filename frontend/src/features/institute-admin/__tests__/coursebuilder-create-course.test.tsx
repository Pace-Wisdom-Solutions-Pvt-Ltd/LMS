// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

const mockNavigate = vi.fn()
const mockUseParams = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  }
})

vi.mock('../useStoreRefresh', () => ({
  useStoreRefresh: () => vi.fn(),
}))

const mockGetStoredOrganizations = vi.fn()
vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => mockGetStoredOrganizations(),
}))

const mockCreateCourseApi = vi.fn()
const mockUpdateCourseApi = vi.fn()
const mockGetCoursesApi = vi.fn().mockResolvedValue([])
const mockGetCourseModulesApi = vi.fn().mockResolvedValue([])
const mockGetModuleNodesApi = vi.fn().mockResolvedValue([])
const mockGetModuleNodeApi = vi.fn().mockResolvedValue(null)

vi.mock('@/lib/api/organizations', () => ({
  createCourseApi: (...args: unknown[]) => mockCreateCourseApi(...args),
  updateCourseApi: (...args: unknown[]) => mockUpdateCourseApi(...args),
  getCoursesApi: (...args: unknown[]) => mockGetCoursesApi(...args),
  getCourseModulesApi: (...args: unknown[]) => mockGetCourseModulesApi(...args),
  getModuleNodesApi: (...args: unknown[]) => mockGetModuleNodesApi(...args),
  getModuleChaptersApi: vi.fn().mockResolvedValue([]),
  getModuleNodeApi: (...args: unknown[]) => mockGetModuleNodeApi(...args),
  // other APIs referenced but not used in these tests
  createCourseModuleApi: vi.fn(),
  updateCourseModuleApi: vi.fn(),
  deleteCourseModuleApi: vi.fn(),
  createModuleNodeApi: vi.fn(),
  updateModuleNodeApi: vi.fn(),
  deleteModuleNodeApi: vi.fn(),
}))

const mockGetCourseTracks = vi.fn()
const mockUpdateCourseTrack = vi.fn()
const mockAddCourseTrack = vi.fn()

vi.mock('../store', () => ({
  // types are compile-time only
  addQuestion: vi.fn(),
  getQuestions: vi.fn().mockReturnValue([]),
  getCourseTracks: (...args: unknown[]) => mockGetCourseTracks(...args),
  addCourseTrack: (...args: unknown[]) => mockAddCourseTrack(...args),
  updateCourseTrack: (...args: unknown[]) => mockUpdateCourseTrack(...args),
  getCourseLevels: vi.fn().mockReturnValue([]),
  addCourseLevel: vi.fn().mockReturnValue({ id: 'lvl-1' }),
  updateCourseLevel: vi.fn(),
  removeCourseLevelsByName: vi.fn(),
  getProgramsByLevel: vi.fn().mockReturnValue([]),
  addProgram: vi.fn(),
  updateProgram: vi.fn(),
  getProgramResources: vi.fn().mockReturnValue([]),
  addProgramResource: vi.fn(),
  updateProgramResource: vi.fn(),
  getProgramTasks: vi.fn().mockReturnValue([]),
  addProgramTask: vi.fn(),
  updateProgramTask: vi.fn(),
  getProgramAssessments: vi.fn().mockReturnValue([]),
  addProgramAssessment: vi.fn(),
  updateProgramAssessment: vi.fn(),
  removeProgramResource: vi.fn(),
  removeProgramTask: vi.fn(),
  removeProgramAssessment: vi.fn(),
}))

import { showToast } from '@/lib/toastApi'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('InstituteAdminCourseBuilder - create/update course meta', () => {
  it('shows error when org is missing on "Save Course"', async () => {
    mockUseParams.mockReturnValue({})
    mockGetStoredOrganizations.mockReturnValue([])
    mockGetCourseTracks.mockReturnValue([])

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    const [courseNameInput] = screen.getAllByRole('textbox')
    fireEvent.change(courseNameInput, { target: { value: 'Course A' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Course/i }))

    expect(showToast).toHaveBeenCalledWith('Organization not found.', 'error')
    expect(mockCreateCourseApi).not.toHaveBeenCalled()
  })

  it('creates course via API and navigates on success', async () => {
    mockUseParams.mockReturnValue({})
    mockGetStoredOrganizations.mockReturnValue([{ id: 1, name: 'Org' }])
    mockGetCourseTracks.mockReturnValue([])
    mockCreateCourseApi.mockResolvedValueOnce({ id: 99, title: 'Course A', description: null, status: 'Published' })

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    const [courseNameInput] = screen.getAllByRole('textbox')
    fireEvent.change(courseNameInput, { target: { value: '  Course A  ' } })
    // Status is a custom Dropdown: open it and pick "Published" from the portal menu
    fireEvent.click(screen.getByRole('button', { name: /select…/i }))
    fireEvent.click(screen.getByRole('button', { name: /^published$/i }))
    const descTextarea = screen.getAllByRole('textbox')[1]
    fireEvent.change(descTextarea, { target: { value: '  Desc ' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Course/i }))

    await waitFor(() => expect(mockCreateCourseApi).toHaveBeenCalled())
    await waitFor(() => expect(mockAddCourseTrack).toHaveBeenCalled())
    expect(mockCreateCourseApi).toHaveBeenCalledWith('1', {
      title: 'Course A',
      description: 'Desc',
      status: 'Published',
    })
    expect(mockAddCourseTrack).toHaveBeenCalledWith({
      name: 'Course A',
      description: undefined,
      status: 'published',
    })
    expect(showToast).toHaveBeenCalledWith('Course created.', 'success')
    expect(mockNavigate).toHaveBeenCalledWith('/org-admin/content/99', { replace: true })
  })

  it('updates course via API when editing an existing API course', async () => {
    mockUseParams.mockReturnValue({ courseId: '123' })
    mockGetStoredOrganizations.mockReturnValue([{ id: 1, name: 'Org' }])
    mockGetCourseTracks.mockReturnValue([]) 
    mockUpdateCourseApi.mockResolvedValueOnce({ id: 123, title: 'New Name', description: null, status: 'Draft' })

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    const [courseNameInput] = screen.getAllByRole('textbox')
    fireEvent.change(courseNameInput, { target: { value: 'New Name' } })
    fireEvent.click(screen.getByRole('button', { name: /Update Course/i }))

    await waitFor(() => {
      expect(mockUpdateCourseApi).toHaveBeenCalledWith('1', '123', {
        title: 'New Name',
        description: undefined,
        status: 'Draft',
      })
    })

    expect(showToast).toHaveBeenCalledWith('Course updated.', 'success')
  })

  it('shows error toast when updateCourseApi fails', async () => {
    mockUseParams.mockReturnValue({ courseId: '123' })
    mockGetStoredOrganizations.mockReturnValue([{ id: 1, name: 'Org' }])
    mockGetCourseTracks.mockReturnValue([]) 
    mockUpdateCourseApi.mockRejectedValueOnce(new Error('Network error'))

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    const [courseNameInput] = screen.getAllByRole('textbox')
    fireEvent.change(courseNameInput, { target: { value: 'New Name' } })
    fireEvent.click(screen.getByRole('button', { name: /Update Course/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Network error', 'error')
    })
  })
})

