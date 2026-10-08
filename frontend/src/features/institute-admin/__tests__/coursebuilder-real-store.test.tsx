// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

afterEach(() => cleanup())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ orgId: '1', courseId: 'trk1' }),
  }
})

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({ email: 'admin@test.com', role: 'institute_admin', roles: ['institute_admin'] }),
  getStoredToken: vi.fn().mockReturnValue('token'),
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
  getStoredRefreshToken: vi.fn().mockReturnValue('refresh'),
  hasRole: vi.fn().mockReturnValue(true),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/features/institute-admin/useStoreRefresh', () => ({
  useStoreRefresh: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('@/lib/api/organizations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/organizations')>('@/lib/api/organizations')
  return {
    ...actual,
    getCoursesApi: vi.fn().mockResolvedValue([
      {
        id: 'trk1',
        title: 'Data Science',
        description: 'End-to-end data science learning path.',
        status: 'Published',
      },
    ]),
    getCourseModulesApi: vi.fn().mockResolvedValue([
      { id: 101, title: 'Beginner', description: '', sequence_order: 1 },
      { id: 102, title: 'Intermediate', description: '', sequence_order: 2 },
      { id: 103, title: 'Advanced', description: '', sequence_order: 3 },
    ]),
    getModuleNodesApi: vi.fn().mockResolvedValue([
      {
        id: 201,
        title: 'Intro phase',
        description: 'Intro copy',
        sequence_order: 1,
        prerequisite_node: null,
        content_type: 'youtube',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ]),
    createCourseModuleApi: vi.fn().mockResolvedValue({ id: 999, title: 'ExtraLevel', sequence_order: 9 }),
    updateCourseModuleApi: vi.fn().mockResolvedValue({ id: 101, title: 'Beginner', sequence_order: 1 }),
    deleteCourseModuleApi: vi.fn().mockResolvedValue(undefined),
    createModuleNodeApi: vi.fn().mockResolvedValue({ id: 888, title: 'New node', sequence_order: 1, prerequisite_node: null }),
    updateModuleNodeApi: vi.fn().mockResolvedValue({ id: 201, title: 'Intro phase', sequence_order: 1 }),
    deleteModuleNodeApi: vi.fn().mockResolvedValue(undefined),
    getModuleChaptersApi: vi.fn().mockResolvedValue([]),
    createChapterApi: vi.fn().mockResolvedValue({ id: 501, title: 'New chapter' }),
    updateChapterApi: vi.fn().mockResolvedValue({ id: 501, title: 'Intro phase' }),
    deleteChapterApi: vi.fn().mockResolvedValue(undefined),
    getModuleNodeApi: vi.fn().mockResolvedValue({
      id: 201,
      title: 'Intro phase',
      description: '',
      sequence_order: 1,
      prerequisite_node: null,
    }),
    createCourseApi: vi.fn(),
  }
})

import {
  getCourseModulesApi,
  getModuleNodesApi,
  getModuleChaptersApi,
  deleteChapterApi,
  deleteModuleNodeApi,
  createModuleNodeApi,
} from '@/lib/api/organizations'
import InstituteAdminCourseBuilder from '../course-builder/CourseBuilder'

function renderWithRealStore() {
  return render(
    <MemoryRouter initialEntries={['/institute-admin/content/trk1']}>
      <Routes>
        <Route path="/institute-admin/content/:courseId" element={<InstituteAdminCourseBuilder />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CourseBuilder — real institute-admin store + API fixtures', () => {
  // Heavy UI + async module/node hydration can exceed default 15s test timeout.
  beforeEach(() => {
    vi.mocked(getCourseModulesApi).mockResolvedValue([
      { id: 101, title: 'Beginner', description: '', sequence_order: 1 },
      { id: 102, title: 'Intermediate', description: '', sequence_order: 2 },
      { id: 103, title: 'Advanced', description: '', sequence_order: 3 },
    ])
    vi.mocked(getModuleNodesApi).mockResolvedValue([
      {
        id: 201,
        title: 'Intro phase',
        description: 'Intro copy',
        sequence_order: 1,
        prerequisite_node: null,
        content_type: 'youtube',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ])
    vi.mocked(deleteModuleNodeApi).mockResolvedValue(undefined as never)
  })

  it(
    'renders Levels & Programs from API aligned with seed track trk1',
    async () => {
      renderWithRealStore()
      await waitFor(() => expect(screen.getByText('Back to Courses')).toBeTruthy())
      await waitFor(() => expect(screen.getByText('Levels & Programs')).toBeTruthy(), { timeout: 20000 })
      expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0)
      await waitFor(() => expect(screen.getByText('Step 1')).toBeTruthy(), { timeout: 20000 })
      await waitFor(() => expect(vi.mocked(getModuleNodesApi).mock.calls.length).toBeGreaterThan(0), {
        timeout: 20000,
      })
      await waitFor(() => expect(screen.getAllByText('Intro phase').length).toBeGreaterThanOrEqual(1), {
        timeout: 20000,
      })
    },
    90_000,
  )

  it(
    'opens Add Chapter modal (real store + ProgramInner wiring)',
    async () => {
      renderWithRealStore()
      await waitFor(() => expect(screen.getByText('Levels & Programs')).toBeTruthy(), { timeout: 20000 })
      await waitFor(() => expect(vi.mocked(getModuleNodesApi).mock.calls.length).toBeGreaterThan(0), {
        timeout: 20000,
      })
      await waitFor(() => expect(screen.getAllByRole('button', { name: 'Add Chapter' }).length).toBeGreaterThan(0), {
        timeout: 10000,
      })
      fireEvent.click(screen.getAllByRole('button', { name: 'Add Chapter' })[0])
      await waitFor(
        () => expect(screen.getAllByRole('heading', { name: 'Add Chapter' }).length).toBeGreaterThan(0),
        { timeout: 20000 },
      )
    },
    90_000,
  )

  it('cancelling delete phase confirm does not call delete API', async () => {
    // A chapter with one item: only chapters get Edit/Delete phase actions.
    vi.mocked(getModuleChaptersApi).mockResolvedValue([
      { id: 501, title: 'Intro phase', description: 'Intro copy', sequence_order: 1 },
    ])
    vi.mocked(getModuleNodesApi).mockResolvedValue([
      {
        id: 202,
        title: 'Intro video',
        sequence_order: 1,
        chapter: 501,
        content_type: 'youtube',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ])
    renderWithRealStore()
    await waitFor(() => expect(screen.getAllByLabelText('Delete phase').length).toBeGreaterThan(0), { timeout: 10000 })
    vi.mocked(deleteChapterApi).mockClear()
    fireEvent.click(screen.getAllByLabelText('Delete phase')[0])
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Confirm action' })).toBeTruthy())
    const cancels = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancels[cancels.length - 1])
    await waitFor(() => expect(vi.mocked(deleteChapterApi)).not.toHaveBeenCalled())
  })

  it(
    'adds a Resource draft via Add Item modal (api curriculum path)',
    async () => {
      renderWithRealStore()
      await waitFor(() => screen.getByText('Levels & Programs'), { timeout: 20000 })
      await waitFor(() => screen.getAllByText('Intro phase').length > 0, { timeout: 20000 })

      // Open Add Item menu under the first rendered phase card.
      await waitFor(() => screen.getAllByRole('button', { name: 'Add Item' }).length > 0, { timeout: 20000 })
      fireEvent.click(screen.getAllByRole('button', { name: 'Add Item' })[0])
      fireEvent.click(screen.getByText('+ Resource / Content'))

      const dialog = await screen.findByRole('dialog')
      // Title label isn't wired; first textbox is Title.
      const [titleInput] = within(dialog).getAllByRole('textbox')
      fireEvent.change(titleInput, { target: { value: 'Resource 1' } })
      fireEvent.change(within(dialog).getByPlaceholderText('https://...'), { target: { value: 'https://example.com' } })
      fireEvent.change(within(dialog).getByPlaceholderText(/Watch only chapters/i), { target: { value: 'Focus A' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
      })
    },
    90_000,
  )

  it(
    'adding a Task under an API phase creates the node immediately (calls createModuleNodeApi)',
    async () => {
      renderWithRealStore()
      await waitFor(() => screen.getByText('Levels & Programs'), { timeout: 20000 })
      await waitFor(() => screen.getAllByText('Intro phase').length > 0, { timeout: 20000 })

      await waitFor(() => expect(screen.getAllByRole('button', { name: 'Add Item' }).length).toBeGreaterThan(0), {
        timeout: 20000,
      })
      vi.mocked(createModuleNodeApi).mockClear()
      fireEvent.click(screen.getAllByRole('button', { name: 'Add Item' })[0])
      fireEvent.click(screen.getByText('+ Task'))

      const dialog = await screen.findByRole('dialog')
      const [titleInput] = within(dialog).getAllByRole('textbox')
      fireEvent.change(titleInput, { target: { value: 'Task Draft 1' } })
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^PDF$/i }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      // Items are POSTed right away now (no deferred "Save Curriculum" step).
      expect(vi.mocked(createModuleNodeApi)).toHaveBeenCalledWith(
        '1',
        'trk1',
        '101',
        expect.objectContaining({ task_title: 'Task Draft 1', task_allow_pdf: true }),
      )
    },
    90_000,
  )
})
