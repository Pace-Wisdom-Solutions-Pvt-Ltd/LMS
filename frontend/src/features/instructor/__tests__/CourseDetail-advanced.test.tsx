// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Mock navigations and params
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ courseId: '1' }),
  }
})

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => [{ id: 1 }],
  getStoredUser: () => ({ id: 1, name: 'Test' }),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

const mockGetCourseById = vi.fn()
const mockGetCourseModules = vi.fn()
const mockGetModuleNodes = vi.fn()
const mockGetModuleChapters = vi.fn()
const mockCreateChapter = vi.fn()

vi.mock('@/lib/api/organizations', () => ({
  getCourseByIdApi: (...args: unknown[]) => mockGetCourseById(...args),
  getCourseModulesApi: (...args: unknown[]) => mockGetCourseModules(...args),
  getModuleNodesApi: (...args: unknown[]) => mockGetModuleNodes(...args),
  getModuleChaptersApi: (...args: unknown[]) => mockGetModuleChapters(...args),
  createChapterApi: (...args: unknown[]) => mockCreateChapter(...args),
}))

// Mock the ProgramInner component to simplify testing
vi.mock('../courses/InstructorCourseBuilderProgramInner', () => ({
  ProgramInner: ({ programId }: { programId: string }) => (
    <div data-testid={`program-inner-${programId}`}>Phase {programId}</div>
  ),
}))

import CourseDetail from '../courses/CourseDetail'

describe('CourseDetail - Instructor interaction tests (API-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCourseById.mockResolvedValue({
      id: 1,
      title: 'Test Course',
      description: 'Test summary',
      status: 'published',
    })
    mockGetCourseModules.mockResolvedValue([
      { id: 10, title: 'Module 1', sequence_order: 1 },
    ])
    mockGetModuleChapters.mockResolvedValue([
      { id: 100, title: 'Phase 1', description: 'Phase desc', sequence_order: 1 },
    ])
    mockGetModuleNodes.mockResolvedValue([])
    mockCreateChapter.mockResolvedValue({ id: 200, title: 'New Phase Title' })
  })

  afterEach(() => cleanup())

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/trainer/courses/1']}>
        <Routes>
          <Route path="/trainer/courses/:courseId" element={<CourseDetail />} />
        </Routes>
      </MemoryRouter>,
    )

  it('renders course title and curriculum builder heading', async () => {
    renderComponent()
    expect(await screen.findByText('Test Course')).toBeTruthy()
    expect(screen.getByText('Curriculum Builder')).toBeTruthy()
  })

  it('renders module title and phase count', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByText(/1 Phases/)).toBeTruthy()
  })

  it('shows Add Phase button for each module', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add Phase/i })).toBeTruthy()
  })

  it('opens Add Phase modal when clicking Add Phase', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Add Phase/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Add New Phase/i })).toBeTruthy(),
    )
  })

  it('shows back button that navigates to courses list', async () => {
    renderComponent()
    expect(await screen.findByText('Test Course')).toBeTruthy()
    const backBtn = screen.getByText(/Back to Assigned Courses/i)
    expect(backBtn).toBeTruthy()
    const backButton = backBtn.closest('button')
    expect(backButton).toBeTruthy()
    fireEvent.click(backButton!)
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/courses')
  })

  it('shows No Modules message when no modules exist', async () => {
    mockGetCourseModules.mockResolvedValue([])
    renderComponent()
    expect(await screen.findByText('Test Course')).toBeTruthy()
    expect(screen.getByText(/No modules found/i)).toBeTruthy()
  })

  it('shows loading state initially', () => {
    // Make the API call hang to keep loading state
    mockGetCourseById.mockReturnValue(new Promise(() => {}))
    renderComponent()
    expect(screen.getByText(/Loading course curriculum/i)).toBeTruthy()
  })

  it('shows "Course not found" when API returns null-ish course', async () => {
    mockGetCourseById.mockResolvedValue(null)
    renderComponent()
    await waitFor(() =>
      expect(screen.getByText(/Course not found/i)).toBeTruthy(),
    )
  })

  it('shows error toast when getCourseByIdApi fails', async () => {
    const { showToast } = await import('@/lib/toastApi')
    mockGetCourseById.mockRejectedValue(new Error('Network error'))
    renderComponent()
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Network error', 'error'),
    )
  })

  it('shows error toast with generic message for non-Error rejection', async () => {
    const { showToast } = await import('@/lib/toastApi')
    mockGetCourseById.mockRejectedValue('string error')
    renderComponent()
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Failed to load course.', 'error'),
    )
  })

  it('shows course description and status badge', async () => {
    renderComponent()
    expect(await screen.findByText('Test Course')).toBeTruthy()
    expect(screen.getByText('Test summary')).toBeTruthy()
    expect(screen.getByText('published')).toBeTruthy()
    // ID display was removed from course header
  })

  it('shows "No description provided." when course has no description', async () => {
    mockGetCourseById.mockResolvedValue({
      id: 1,
      title: 'No Desc Course',
      description: '',
      status: 'draft',
    })
    renderComponent()
    expect(await screen.findByText('No Desc Course')).toBeTruthy()
    expect(screen.getByText('No description provided.')).toBeTruthy()
  })

  it('shows "Draft" when course has no status', async () => {
    mockGetCourseById.mockResolvedValue({
      id: 1,
      title: 'Draft Course',
      description: 'desc',
    })
    renderComponent()
    expect(await screen.findByText('Draft Course')).toBeTruthy()
    expect(screen.getByText('Draft')).toBeTruthy()
  })

  it('fills and submits the Add Phase modal to create the phase on the server', async () => {
    const { showToast } = await import('@/lib/toastApi')
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /Add Phase/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Add New Phase/i })).toBeTruthy(),
    )

    // Fill title and description
    fireEvent.change(screen.getByLabelText(/Phase Title/i), {
      target: { value: 'New Phase Title' },
    })
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Phase description' },
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Add Phase' }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Phase added.', 'success'),
    )
    expect(mockCreateChapter).toHaveBeenCalledWith('1', '1', '10', {
      title: 'New Phase Title',
      description: 'Phase description',
    })
  })

  it('shows warning toast when phase title is empty', async () => {
    const { showToast } = await import('@/lib/toastApi')
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Add Phase/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Add New Phase/i })).toBeTruthy(),
    )

    // Submit without filling title
    fireEvent.click(screen.getByRole('button', { name: 'Add Phase' }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Phase title is required.', 'warning'),
    )
    expect(mockCreateChapter).not.toHaveBeenCalled()
  })

  it('closes the Add Phase modal when Cancel is clicked', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Add Phase/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Add New Phase/i })).toBeTruthy(),
    )

    fireEvent.click(screen.getByText('Cancel'))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /Add New Phase/i })).toBeNull(),
    )
  })

  it('shows a newly added phase after it is saved', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByText('1 Phases')).toBeTruthy()

    mockGetModuleChapters.mockResolvedValue([
      { id: 100, title: 'Phase 1', sequence_order: 1 },
      { id: 200, title: 'New Phase', sequence_order: 2 },
    ])
    fireEvent.click(screen.getByRole('button', { name: /Add Phase/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Add New Phase/i })).toBeTruthy(),
    )
    fireEvent.change(screen.getByLabelText(/Phase Title/i), {
      target: { value: 'New Phase' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Phase' }))

    // The phase is saved immediately and the module is reloaded from the server.
    await waitFor(() => expect(screen.getByText('2 Phases')).toBeTruthy())
    expect(screen.getByTestId('program-inner-chapter:10:200')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Add New Phase/i })).toBeNull()
  })

  it('handles fetchModules failure gracefully', async () => {
    mockGetCourseModules.mockRejectedValue(new Error('modules fail'))
    renderComponent()
    await waitFor(() =>
      expect(screen.getByText('Test Course')).toBeTruthy(),
    )
    // Should show empty state
    expect(screen.getByText(/No modules found/i)).toBeTruthy()
  })

  it('handles fetchNodes failure gracefully (empty nodes)', async () => {
    mockGetModuleNodes.mockRejectedValue(new Error('nodes fail'))
    mockGetModuleChapters.mockRejectedValue(new Error('chapters fail'))
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    // Module shows 0 phases
    expect(screen.getByText(/0 Phases/)).toBeTruthy()
  })

  it('renders multiple modules', async () => {
    mockGetCourseModules.mockResolvedValue([
      { id: 10, title: 'Module A', sequence_order: 1 },
      { id: 20, title: 'Module B', sequence_order: 2 },
    ])
    renderComponent()
    expect(await screen.findByText('Module A')).toBeTruthy()
    expect(screen.getByText('Module B')).toBeTruthy()
  })

  it('renders module with index-based number when no sequence_order', async () => {
    mockGetCourseModules.mockResolvedValue([
      { id: 10, title: 'Module NoOrder' },
    ])
    mockGetModuleNodes.mockResolvedValue([])
    renderComponent()
    expect(await screen.findByText('Module NoOrder')).toBeTruthy()
    // Phase numbers are now index-based (1, 2, 3...) instead of sequence_order
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('groups items under their phase and lists items without a phase separately', async () => {
    mockGetModuleNodes.mockResolvedValue([
      { id: 300, title: 'Loose item', chapter: null, sequence_order: 1 },
      { id: 301, title: 'Phase item', chapter: 100, sequence_order: 2 },
    ])
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByText(/1 Phases/)).toBeTruthy()
    expect(screen.getByTestId('program-inner-unchaptered:10')).toBeTruthy()
    expect(screen.getByTestId('program-inner-chapter:10:100')).toBeTruthy()
  })

  it('renders ProgramInner for server phases', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByTestId('program-inner-chapter:10:100')).toBeTruthy()
    expect(screen.queryByTestId('program-inner-unchaptered:10')).toBeNull()
  })
})
