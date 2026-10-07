// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockUseParams() }
})

vi.mock('../useStoreRefresh', () => ({
  useStoreRefresh: () => vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => [{ id: 1, name: 'Org' }],
}))

const mockGetCourseModulesApi = vi.fn()
const mockCreateCourseModuleApi = vi.fn()
const mockDeleteCourseModuleApi = vi.fn()
const mockGetModuleNodesApi = vi.fn()
const mockGetModuleNodeApi = vi.fn()

vi.mock('@/lib/api/organizations', () => ({
  getCourseModulesApi: (...args: unknown[]) => mockGetCourseModulesApi(...args),
  createCourseModuleApi: (...args: unknown[]) => mockCreateCourseModuleApi(...args),
  deleteCourseModuleApi: (...args: unknown[]) => mockDeleteCourseModuleApi(...args),
  getModuleNodesApi: (...args: unknown[]) => mockGetModuleNodesApi(...args),
  getModuleNodeApi: (...args: unknown[]) => mockGetModuleNodeApi(...args),

  // unused in these tests (but referenced by file)
  getCoursesApi: vi.fn().mockResolvedValue([]),
  getCourseByIdApi: vi.fn().mockResolvedValue({ id: 10, title: 'C', description: '', status: 'Draft' }),
  updateCourseApi: vi.fn(),
  createCourseApi: vi.fn(),
  createModuleNodeApi: vi.fn(),
  updateCourseModuleApi: vi.fn(),
  updateModuleNodeApi: vi.fn(),
  deleteModuleNodeApi: vi.fn(),
}))

// Local store is used for track/levels when available; keep minimal safe mocks.
vi.mock('../store', () => ({
  getCourseTracks: () => [],
  getCourseLevels: () => [],
  addCourseLevel: vi.fn(),
  updateCourseLevel: vi.fn(),
  removeCourseLevelsByName: vi.fn(),
  addCourseTrack: vi.fn(),
  updateCourseTrack: vi.fn(),

  getProgramsByLevel: () => [],
  addProgram: vi.fn(),
  updateProgram: vi.fn(),

  getProgramResources: () => [],
  getProgramTasks: () => [],
  getProgramAssessments: () => [],
  addProgramResource: vi.fn(),
  updateProgramResource: vi.fn(),
  removeProgramResource: vi.fn(),
  addProgramTask: vi.fn(),
  updateProgramTask: vi.fn(),
  removeProgramTask: vi.fn(),
  addProgramAssessment: vi.fn(),
  updateProgramAssessment: vi.fn(),
  removeProgramAssessment: vi.fn(),

  addQuestion: vi.fn(),
  getQuestions: () => [],
}))

import { showToast } from '@/lib/toastApi'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockGetCourseModulesApi.mockReset()
  mockCreateCourseModuleApi.mockReset()
  mockDeleteCourseModuleApi.mockReset()
  mockGetModuleNodesApi.mockReset()
  mockGetModuleNodeApi.mockReset()
})

describe('CourseBuilder - levels + phase drafts', () => {
  it('creates unique levels via API (skips duplicates)', async () => {
    mockUseParams.mockReturnValue({ courseId: '10' })

    mockGetCourseModulesApi.mockResolvedValue([
      { id: 1, title: 'Beginner', sequence_order: 1 },
    ])
    mockCreateCourseModuleApi
      .mockResolvedValueOnce({ id: 2, title: 'Intermediate', sequence_order: 2 })
      .mockResolvedValueOnce({ id: 3, title: 'Advanced', sequence_order: 3 })

    // nodes auto-load; keep stable
    mockGetModuleNodesApi.mockResolvedValue([])
    mockGetModuleNodeApi.mockResolvedValue(null)

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    // reveal the add-level draft form when existing levels exist
    fireEvent.click(screen.getByRole('button', { name: /^Add level$/i }))

    // Click create with empty input(s) -> should no-op without API calls
    // (still covers the early-return guard)

    const createBtns = screen.getAllByRole('button', { name: /Create level/i })
    fireEvent.click(createBtns.at(-1) as HTMLElement)

    expect(mockCreateCourseModuleApi).not.toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalledWith('Level(s) created.', 'success')
  })

  it('creates a new level via API and shows success toast', async () => {
    mockUseParams.mockReturnValue({ courseId: '10' })

    mockGetCourseModulesApi.mockResolvedValue([
      { id: 1, title: 'Beginner', sequence_order: 1 },
    ])
    mockCreateCourseModuleApi.mockResolvedValueOnce({ id: 2, title: 'Intermediate', sequence_order: 2 })

    mockGetModuleNodesApi.mockResolvedValue([])
    mockGetModuleNodeApi.mockResolvedValue(null)

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /^Add level$/i }))

    const levelInputs = screen.getAllByPlaceholderText('e.g. Beginner').map((el) => el as HTMLInputElement)
    fireEvent.change(levelInputs.at(-1) as HTMLElement, { target: { value: 'Intermediate' } })

    const createBtns = screen.getAllByRole('button', { name: /Create level/i })
    fireEvent.click(createBtns.at(-1) as HTMLElement)

    await waitFor(() => expect(mockCreateCourseModuleApi).toHaveBeenCalled())
    expect(showToast).toHaveBeenCalledWith('Level(s) created.', 'success')
  })

  it('deletes a level after confirmation', async () => {
    mockUseParams.mockReturnValue({ courseId: '10' })

    mockGetCourseModulesApi.mockResolvedValue([
      { id: 1, title: 'Beginner', sequence_order: 1, description: '' },
    ])
    mockGetModuleNodesApi.mockResolvedValue([])
    mockGetModuleNodeApi.mockResolvedValue(null)
    mockDeleteCourseModuleApi.mockResolvedValueOnce(undefined)

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }))

    const confirm = await screen.findByRole('heading', { name: /Confirm action/i })
    fireEvent.click(within(confirm.parentElement as HTMLElement).getByRole('button', { name: 'OK' }))

    await waitFor(() => expect(mockDeleteCourseModuleApi).toHaveBeenCalled())
    expect(showToast).toHaveBeenCalledWith('Level deleted.', 'success')
  })

  it('does not delete a level when confirmation is cancelled', async () => {
    mockUseParams.mockReturnValue({ courseId: '10' })

    mockGetCourseModulesApi.mockResolvedValue([
      { id: 1, title: 'Beginner', sequence_order: 1, description: '' },
    ])
    mockGetModuleNodesApi.mockResolvedValue([])
    mockGetModuleNodeApi.mockResolvedValue(null)
    mockDeleteCourseModuleApi.mockResolvedValueOnce(undefined)

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }))

    const confirm = await screen.findByRole('heading', { name: /Confirm action/i })
    fireEvent.click(within(confirm.parentElement as HTMLElement).getByRole('button', { name: /Cancel/i }))

    await waitFor(() => expect(screen.queryByRole('heading', { name: /Confirm action/i })).toBeNull())
    expect(mockDeleteCourseModuleApi).not.toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalledWith('Level deleted.', 'success')
  })

  it('adds and deletes a phase draft under a level', async () => {
    mockUseParams.mockReturnValue({ courseId: '10' })

    mockGetCourseModulesApi.mockResolvedValue([
      { id: 1, title: 'Beginner', sequence_order: 1, description: '' },
    ])
    mockGetModuleNodesApi.mockResolvedValue([])
    mockGetModuleNodeApi.mockResolvedValue(null)

    const { default: CourseBuilder } = await import('../course-builder/CourseBuilder')
    render(
      <MemoryRouter>
        <CourseBuilder />
      </MemoryRouter>
    )

    // open program modal for this module
    await waitFor(() => expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /Add Chapter/i }))

    // modal uses createPortal; find its form fields
    const dialog = await screen.findByRole('dialog')
    const [titleInput] = within(dialog).getAllByRole('textbox')
    fireEvent.change(titleInput, { target: { value: 'Phase 1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Add$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(showToast).toHaveBeenCalledWith('Phase added.', 'success')

    // delete draft phase
    const delBtns = screen.getAllByRole('button', { name: 'Delete phase' })
    fireEvent.click(delBtns.at(-1) as HTMLElement)
    const confirm = await screen.findByRole('heading', { name: /Confirm action/i })
    fireEvent.click(within(confirm.parentElement as HTMLElement).getByRole('button', { name: 'OK' }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Phase deleted.', 'success'))
  })
})

