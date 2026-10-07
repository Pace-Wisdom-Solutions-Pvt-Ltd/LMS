// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import InstituteAdminCourseBuilder from '../course-builder/CourseBuilder'
import * as orgApi from '../../../lib/api/organizations'
import type { ApiCourseModule, ApiModuleNode } from '../../../lib/api/organizations'
import * as storeModule from '../store'
import { showToast } from '../../../lib/toastApi'

// Mock dependencies
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ orgId: 'org-123', courseId: 'course-456' }),
  }
})

vi.mock('@/lib/api/organizations', () => ({
  createCourseApi: vi.fn(),
  createCourseModuleApi: vi.fn(),
  createModuleNodeApi: vi.fn(),
  deleteCourseModuleApi: vi.fn(),
  deleteModuleNodeApi: vi.fn(),
  getCoursesApi: vi.fn().mockResolvedValue([]),
  getCourseModulesApi: vi.fn(),
  getModuleNodesApi: vi.fn(),
  getModuleNodeApi: vi.fn(),
  updateCourseModuleApi: vi.fn(),
  updateModuleNodeApi: vi.fn(),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 'org-123', name: 'Test Org' }]),
  getStoredUser: vi.fn().mockReturnValue({ email: 'admin@test.com', role: 'institute_admin', roles: ['institute_admin'] }),
  hasRole: vi.fn().mockReturnValue(true),
}))

vi.mock('@/features/institute-admin/useStoreRefresh', () => ({
  useStoreRefresh: vi.fn().mockReturnValue(vi.fn()),
}))

// Mock store with default return values
vi.mock('@/features/institute-admin/store', async () => {
  const actual = await vi.importActual('@/features/institute-admin/store')
  return {
    ...actual,
    getCourseTracks: vi.fn().mockReturnValue([]),
    getCourseLevels: vi.fn().mockReturnValue([]),
    getProgramResources: vi.fn().mockReturnValue([]),
    getProgramTasks: vi.fn().mockReturnValue([]),
    getProgramAssessments: vi.fn().mockReturnValue([]),
    getQuestions: vi.fn().mockReturnValue([]),
    addProgramResource: vi.fn().mockReturnValue({ id: 'res-new' }),
    addProgramTask: vi.fn().mockReturnValue({ id: 'task-new' }),
    addProgramAssessment: vi.fn().mockReturnValue({ id: 'quiz-new' }),
    addQuestion: vi.fn(),
  }
})

describe('CourseBuilder Advanced Interactions', () => {
  const mockModules = [
    { id: 'mod-1', title: 'Module 1', sequence_order: 1 },
  ]
  const mockNodes = [
    { id: 'node-1', title: 'Phase One', prerequisite_node: null, sequence_order: 1 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(orgApi.getCourseModulesApi).mockResolvedValue(mockModules as unknown as ApiCourseModule[])
    vi.mocked(orgApi.getModuleNodesApi).mockResolvedValue(mockNodes as unknown as ApiModuleNode[])
  })

  afterEach(() => cleanup())

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/institute-admin/course/course-456']}>
      <Routes>
        <Route path="/institute-admin/course/:courseId" element={<InstituteAdminCourseBuilder />} />
      </Routes>
    </MemoryRouter>
  )

  it('renders and shows the Phase section', async () => {
    renderComponent()
    await waitFor(() => {
      expect(screen.getByText('Phase One')).toBeTruthy()
    })
    expect(screen.getByText('Add Item')).toBeTruthy()
  })

  it('adds a Link resource via modal', async () => {
    renderComponent()
    await waitFor(() => screen.getByText('Add Item'))
    
    // Open menu
    fireEvent.click(screen.getByText('Add Item'))
    
    // Click Add Resource
    fireEvent.click(screen.getByText('+ Resource / Content'))
    
    // Scoped within Modal
    const modal = screen.getByRole('dialog')
    // Label isn't wired via htmlFor, so target the first textbox (Title input).
    const [titleInput] = within(modal).getAllByRole('textbox')
    fireEvent.change(titleInput, { target: { value: 'Resource 1' } })
    fireEvent.change(within(modal).getByPlaceholderText('https://...'), { target: { value: 'https://youtube.com/watch?v=123' } })
    fireEvent.change(within(modal).getByPlaceholderText(/Watch only chapters/i), { target: { value: 'Focus here' } })
    
    fireEvent.click(within(modal).getByRole('button', { name: 'Add' }))

    // API-backed course: the resource is POSTed immediately instead of queued in the local store
    await waitFor(() => {
      expect(orgApi.createModuleNodeApi).toHaveBeenCalledWith(
        'org-123',
        'course-456',
        'mod-1',
        expect.objectContaining({
          title: 'Resource 1',
          learning_material_content_type: 'Link',
          learning_material_content_url: 'https://youtube.com/watch?v=123',
          focus_areas: 'Focus here',
        }),
      )
    })
    expect(storeModule.addProgramResource).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/^Resource added\./), 'success')
    })
  })

  it('adds a Task via modal', async () => {
    renderComponent()
    await waitFor(() => screen.getByText('Add Item'))
    
    fireEvent.click(screen.getByText('Add Item'))
    fireEvent.click(screen.getByText('+ Task'))
    
    const modal = screen.getByRole('dialog')
    // Label isn't wired via htmlFor, so target the first textbox (Title input).
    const [titleInput] = within(modal).getAllByRole('textbox')
    fireEvent.change(titleInput, { target: { value: 'New Task' } })
    fireEvent.click(within(modal).getByRole('checkbox', { name: /^PDF$/i }))
    
    fireEvent.click(within(modal).getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(orgApi.createModuleNodeApi).toHaveBeenCalledWith(
        'org-123',
        'course-456',
        'mod-1',
        expect.objectContaining({ task_title: 'New Task', task_allow_pdf: true }),
      )
    })
    expect(storeModule.addProgramTask).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/^Task added\./), 'success')
    })
  })

  it('manages Quiz via the full-page quiz builder', async () => {
    renderComponent()
    await waitFor(() => screen.getByText('Add Item'))

    fireEvent.click(screen.getByText('Add Item'))
    fireEvent.click(screen.getByText('+ Quiz'))

    // Quiz creation now opens as an inline page instead of a drawer
    expect(screen.getByText('Add Quiz')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('e.g. Python Basics Quiz'), { target: { value: 'Midterm Quiz' } })

    // Draft question
    fireEvent.change(screen.getByPlaceholderText(/Enter the question text/), { target: { value: 'What is React?' } })

    // Options (4 blank options by default); mark the first as correct
    const optInputs = screen.getAllByPlaceholderText(/^Option [A-Z]$/)
    fireEvent.change(optInputs[0], { target: { value: 'Library' } })
    fireEvent.change(optInputs[1], { target: { value: 'Framework' } })
    const firstOptionBtn = optInputs[0].closest('button')
    expect(firstOptionBtn).toBeTruthy()
    if (firstOptionBtn) fireEvent.click(firstOptionBtn)

    // Add option
    fireEvent.click(screen.getByText('+ Add option'))
    expect(screen.getAllByPlaceholderText(/^Option [A-Z]$/)).toHaveLength(5)

    fireEvent.click(screen.getByRole('button', { name: /^Create Quiz$/i }))

    // API-backed course: quiz node is created on the server right away
    await waitFor(() => {
      expect(orgApi.createModuleNodeApi).toHaveBeenCalledWith(
        'org-123',
        'course-456',
        'mod-1',
        expect.objectContaining({ quiz_name: 'Midterm Quiz' }),
      )
    })
    const payload = vi.mocked(orgApi.createModuleNodeApi).mock.calls.at(-1)?.[3]
    const questions = JSON.parse(String(payload?.questions_input)) as Array<{ question_text: string; correct_option: string }>
    expect(questions[0]).toMatchObject({ question_text: 'What is React?', correct_option: 'a' })
    expect(storeModule.addProgramAssessment).not.toHaveBeenCalled()
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Quiz added.', 'success'))
  })

  it('handles edit node error mapping safely', async () => {
    const mockNodeData = {
      id: 'node-1',
      title: 'Existing Node',
      learning_material: {
        content_type: 'Video',
        content_url: 'https://vid.com'
      }
    }
    vi.mocked(orgApi.getModuleNodeApi).mockResolvedValue(mockNodeData as unknown as ApiModuleNode)
    
    renderComponent()
    await waitFor(() => screen.getByText('Phase One'))
    
    // Note: If there are multiple Edit buttons, we might need to specify
    const editBtns = screen.getAllByRole('button', { name: /^Edit phase$/i })
    fireEvent.click(editBtns[0])
    
    await waitFor(() => {
      // Edit flow refreshes nodes before opening the modal.
      expect(orgApi.getModuleNodesApi).toHaveBeenCalled()
    })
  })

  it('edits an API item via Edit item modal (validates + handles API error)', async () => {
    const nodesWithChild = [
      { id: 1, title: 'Phase One', prerequisite_node: null, sequence_order: 1 },
      {
        id: 2,
        title: 'Lesson 1',
        prerequisite_node: 1,
        sequence_order: 2,
        description: 'desc',
        content_type: 'link',
        content_url: 'https://example.com',
      },
    ]
    vi.mocked(orgApi.getModuleNodesApi).mockResolvedValue(nodesWithChild as ApiModuleNode[])

    vi.mocked(orgApi.getModuleNodeApi).mockResolvedValue({
      id: 2,
      title: 'Lesson 1',
      description: 'desc',
      learning_material: {
        content_type: 'link',
        content_url: 'https://example.com',
        focus_areas: 'focus',
        quick_outline: 'outline',
      },
    } as ApiModuleNode)

    vi.mocked(orgApi.updateModuleNodeApi).mockRejectedValueOnce(new Error('boom'))

    renderComponent()
    await waitFor(() => screen.getByText('Lesson 1'))

    const itemRow = screen.getByText('Lesson 1').closest('li') ?? screen.getByText('Lesson 1').parentElement
    expect(itemRow).toBeTruthy()
    if (!itemRow) return

    const editBtn = within(itemRow).getByRole('button', { name: /^edit$/i })
    fireEvent.click(editBtn)

    await waitFor(() => {
      expect(orgApi.getModuleNodeApi).toHaveBeenCalled()
    })

    const modal = screen.getByRole('dialog')
    expect(within(modal).getByText(/edit item/i)).toBeTruthy()

    // Close via modal X (covers Modal onClose handler)
    fireEvent.click(within(modal).getByRole('button', { name: /^close$/i }))
    await waitFor(() => expect(screen.queryByText(/edit item/i)).toBeNull())

    // Re-open edit modal for remaining assertions
    fireEvent.click(within(itemRow).getByRole('button', { name: /^edit$/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    const modal2 = screen.getByRole('dialog')
    expect(within(modal2).getByText(/edit item/i)).toBeTruthy()

    // Cover Type dropdown onChange branch
    fireEvent.click(within(modal2).getByRole('button', { name: /^link$/i }))
    fireEvent.click(within(modal2).getByRole('button', { name: /^video$/i }))

    // Cover focus areas + quick outline onChange branches
    fireEvent.change(within(modal2).getByLabelText(/what should learners focus on/i), { target: { value: 'focus updated' } })
    fireEvent.change(within(modal2).getByLabelText(/quick outline/i), { target: { value: 'outline updated' } })

    // validate required title
    fireEvent.change(within(modal2).getByLabelText(/title/i), { target: { value: '   ' } })
    fireEvent.click(within(modal2).getByRole('button', { name: /^save$/i }))
    expect(showToast).toHaveBeenCalledWith('Title is required.', 'warning')

    // submit and hit API error path
    fireEvent.change(within(modal2).getByLabelText(/title/i), { target: { value: 'Lesson 1 updated' } })
    fireEvent.change(within(modal2).getByLabelText(/url|file url/i), { target: { value: 'https://example.com/new' } })
    fireEvent.click(within(modal2).getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(orgApi.updateModuleNodeApi).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('boom', 'error')
    })

    // Cancel closes modal (covers cancel handler)
    fireEvent.click(within(modal2).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByText(/edit item/i)).toBeNull())
  })

  it('saves API item with empty URL (omits url fields) and closes modal on success', async () => {
    const nodesWithChild = [
      { id: 1, title: 'Phase One', prerequisite_node: null, sequence_order: 1 },
      {
        id: 2,
        title: 'Lesson 2',
        prerequisite_node: 1,
        sequence_order: 2,
        description: 'desc',
        content_type: 'link',
        content_url: 'https://example.com',
      },
    ]
    vi.mocked(orgApi.getModuleNodesApi).mockResolvedValue(nodesWithChild as ApiModuleNode[])
    vi.mocked(orgApi.getModuleNodeApi).mockResolvedValue({
      id: 2,
      title: 'Lesson 2',
      description: 'desc',
      learning_material: {
        content_type: 'link',
        content_url: 'https://example.com',
        focus_areas: '',
        quick_outline: '',
      },
    } as ApiModuleNode)
    vi.mocked(orgApi.updateModuleNodeApi).mockResolvedValueOnce({ id: 2, title: 'Lesson 2' })

    renderComponent()
    await waitFor(() => screen.getByText('Lesson 2'))

    const itemRow = screen.getByText('Lesson 2').closest('li') ?? screen.getByText('Lesson 2').parentElement
    expect(itemRow).toBeTruthy()
    if (!itemRow) return

    fireEvent.click(within(itemRow).getByRole('button', { name: /^edit$/i }))

    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText(/edit item/i)).toBeTruthy()

    // Clear URL so urlProvided=false branch is used
    fireEvent.change(within(modal).getByLabelText(/url|file url/i), { target: { value: '' } })
    fireEvent.click(within(modal).getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(orgApi.updateModuleNodeApi).toHaveBeenCalled()
    })

    const payload = vi.mocked(orgApi.updateModuleNodeApi).mock.calls.at(-1)?.[4]
    expect(payload).toBeTruthy()
    expect(payload?.learning_material_content_url).toBeUndefined()
  })

  it('does not delete phase when confirm is cancelled', async () => {
    renderComponent()
    await waitFor(() => screen.getByText('Phase One'))

    const phaseCard = screen.getByText('Phase One').closest('div') ?? screen.getByText('Phase One').parentElement
    expect(phaseCard).toBeTruthy()
    if (!phaseCard) return

    const deleteBtns = screen.getAllByRole('button', { name: /delete phase/i })
    expect(deleteBtns.length).toBeGreaterThan(0)
    fireEvent.click(deleteBtns[0])

    const confirmDialog = await screen.findByRole('dialog')
    expect(within(confirmDialog).getByText(/delete this phase and its items\\?/i)).toBeTruthy()

    // Close via modal X (covers confirm modal onClose handler)
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /^close$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Open again and cancel via cancel button for branch coverage
    fireEvent.click(deleteBtns[0])
    const confirmDialog2 = await screen.findByRole('dialog')
    fireEvent.click(within(confirmDialog2).getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(orgApi.deleteModuleNodeApi).not.toHaveBeenCalled()
    })
  })

  it('deletes API phase when confirmed (success path)', async () => {
    vi.mocked(orgApi.deleteModuleNodeApi).mockResolvedValueOnce(undefined)

    renderComponent()
    await waitFor(() => screen.getByText('Phase One'))

    const deleteBtns = screen.getAllByRole('button', { name: /delete phase/i })
    fireEvent.click(deleteBtns[0])

    const confirmDialog = await screen.findByRole('dialog')
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => {
      expect(orgApi.deleteModuleNodeApi).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('Phase deleted.', 'success')
    })
  })

  it('shows error toast when API phase delete fails', async () => {
    vi.mocked(orgApi.deleteModuleNodeApi).mockRejectedValueOnce(new Error('delete failed'))

    renderComponent()
    await waitFor(() => screen.getByText('Phase One'))

    const deleteBtns = screen.getAllByRole('button', { name: /delete phase/i })
    fireEvent.click(deleteBtns[0])

    const confirmDialog = await screen.findByRole('dialog')
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => {
      expect(orgApi.deleteModuleNodeApi).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('delete failed', 'error')
    })
  })
})
