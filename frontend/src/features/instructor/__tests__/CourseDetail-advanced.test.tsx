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

vi.mock('@/lib/api/organizations', () => ({
  getCourseByIdApi: (...args: unknown[]) => mockGetCourseById(...args),
  getCourseModulesApi: (...args: unknown[]) => mockGetCourseModules(...args),
  getModuleNodesApi: (...args: unknown[]) => mockGetModuleNodes(...args),
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
    mockGetModuleNodes.mockResolvedValue([
      { id: 100, title: 'Phase 1', description: 'Phase desc', sequence_order: 1, prerequisite_node: null },
    ])
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

  it('fills and submits the Add Phase modal to create a draft', async () => {
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
    fireEvent.click(screen.getByText('Add Phase Draft'))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Phase draft added.', 'success'),
    )
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
    fireEvent.click(screen.getByText('Add Phase Draft'))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Phase title is required.', 'warning'),
    )
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

  it('renders an added phase draft as a ProgramInner and counts it as a draft', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByText('1 Phases • 0 Drafts')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Add Phase/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Add New Phase/i })).toBeTruthy(),
    )
    fireEvent.change(screen.getByLabelText(/Phase Title/i), {
      target: { value: 'Draft Phase' },
    })
    fireEvent.click(screen.getByText('Add Phase Draft'))

    // Drafts are kept locally (and persisted when their first item is saved),
    // so the module now lists the server phase plus one draft.
    await waitFor(() => expect(screen.getByText('1 Phases • 1 Drafts')).toBeTruthy())
    expect(screen.getAllByTestId(/^program-inner-/)).toHaveLength(2)
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

  it('filters root nodes correctly - ignores non-root nodes', async () => {
    mockGetModuleNodes.mockResolvedValue([
      { id: 100, title: 'Root Phase', prerequisite_node: null, sequence_order: 1 },
      { id: 101, title: 'Child Phase', prerequisite_node: 100, sequence_order: 2 },
    ])
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    // Only root node counted in phase display
    expect(screen.getByText(/1 Phases/)).toBeTruthy()
  })

  it('renders ProgramInner for server nodes', async () => {
    renderComponent()
    expect(await screen.findByText('Module 1')).toBeTruthy()
    expect(screen.getByTestId('program-inner-100')).toBeTruthy()
  })
})
