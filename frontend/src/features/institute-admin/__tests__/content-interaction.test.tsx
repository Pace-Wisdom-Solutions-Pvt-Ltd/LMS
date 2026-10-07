// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import InstituteAdminContent from '../content/Content'
import * as auth from '../../../lib/auth'
import * as orgApi from '../../../lib/api/organizations'
import type { ApiCourse } from '../../../lib/api/organizations'
import * as toastApi from '../../../lib/toastApi'

// Mock the dependencies
vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn(),
}))

vi.mock('@/lib/api/organizations', () => ({
  getCoursesPaginatedApi: vi.fn(),
  deleteCourseApi: vi.fn(),
  updateCourseApi: vi.fn(),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

type CoursesPage = Awaited<ReturnType<typeof orgApi.getCoursesPaginatedApi>>

function page(results: Partial<ApiCourse>[]): CoursesPage {
  return { count: results.length, next: null, previous: null, results: results as ApiCourse[] }
}

function renderContent() {
  return render(
    <MemoryRouter>
      <InstituteAdminContent />
    </MemoryRouter>,
  )
}

describe('InstituteAdminContent Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.getStoredOrganizations).mockReturnValue([{ id: 1, name: 'Test Org' }] as ReturnType<
      typeof auth.getStoredOrganizations
    >)
  })

  it('renders loading state initially and then shows courses (archived hidden)', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockResolvedValue(
      page([
        { id: 101, title: 'Data Science', description: 'desc 1', status: 'Published', created_at: '2026-03-20T10:00:00Z' },
        { id: 102, title: 'Machine Learning', description: 'desc 2', status: undefined, created_at: undefined },
        { id: 103, title: 'Old Course', status: 'Archived' },
      ]),
    )

    renderContent()

    // Initially should show loading
    expect(screen.getByText('Loading courses…')).toBeTruthy()

    // Then courses should appear
    await waitFor(() => {
      expect(screen.getByText('Data Science')).toBeTruthy()
    })
    expect(screen.getByText('Machine Learning')).toBeTruthy()
    expect(screen.getByText('Published')).toBeTruthy()
    expect(screen.queryByText('Old Course')).toBeNull()
    expect(orgApi.getCoursesPaginatedApi).toHaveBeenCalledWith('1', 1, undefined, undefined, undefined)
  })

  it('handles empty course list', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockResolvedValue(page([]))

    renderContent()

    await waitFor(() => {
      expect(screen.getByText('No courses found.')).toBeTruthy()
    })
  })

  it('shows error toast if API fails', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockRejectedValue(new Error('API failed'))

    renderContent()

    await waitFor(() => {
      expect(toastApi.showToast).toHaveBeenCalledWith('API failed', 'error')
    })
  })

  it('sends the search term to the API after debouncing', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockResolvedValue(
      page([
        { id: 101, title: 'Data Science', description: 'desc 1', status: 'Published' },
        { id: 102, title: 'Machine Learning', description: 'desc 2', status: 'Draft' },
      ]),
    )

    renderContent()

    await waitFor(() => {
      expect(screen.getByText('Data Science')).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText('Search course...')
    await userEvent.type(searchInput, 'machine')

    await waitFor(() => {
      expect(orgApi.getCoursesPaginatedApi).toHaveBeenCalledWith('1', 1, 'machine', undefined, undefined)
    })
  })

  it('navigates to create course page when Create Course is clicked', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockResolvedValue(page([]))

    renderContent()

    await waitFor(() => {
      expect(screen.getByText('Create Course')).toBeTruthy()
    })

    await userEvent.click(screen.getByText('Create Course'))
    expect(mockNavigate).toHaveBeenCalledWith('/org-admin/content/new')
  })

  it('navigates to manage course page when Manage is clicked', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockResolvedValue(
      page([{ id: 101, title: 'Data Science', status: 'Published' }]),
    )

    renderContent()

    await waitFor(() => {
      expect(screen.getByText('Manage')).toBeTruthy()
    })

    await userEvent.click(screen.getByText('Manage'))
    expect(mockNavigate).toHaveBeenCalledWith('/org-admin/content/101')
  })

  it('handles string error from API', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockRejectedValue('String Error')

    renderContent()

    await waitFor(() => {
      expect(toastApi.showToast).toHaveBeenCalledWith('Failed to load courses.', 'error')
    })
  })

  it('handles missing organization ID gracefully', async () => {
    vi.mocked(auth.getStoredOrganizations).mockReturnValue([])

    renderContent()

    // Ensure it doesn't call API
    expect(orgApi.getCoursesPaginatedApi).not.toHaveBeenCalled()
  })

  it('calls deleteCourseApi when Delete is clicked and confirmed via modal', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi)
      .mockResolvedValueOnce(page([{ id: 101, title: 'Data Science', status: 'Published' }]))
      .mockResolvedValueOnce(page([])) // for the refresh
    vi.mocked(orgApi.deleteCourseApi).mockResolvedValue()

    renderContent()

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy()
    })

    // Click the Delete button to open the ConfirmationModal
    await userEvent.click(screen.getByText('Delete'))

    // The ConfirmationModal should appear with confirm button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete Course' })).toBeTruthy()
    })

    // Click the confirm button ("Delete Course") inside the modal
    await userEvent.click(screen.getByRole('button', { name: 'Delete Course' }))

    await waitFor(() => {
      expect(orgApi.deleteCourseApi).toHaveBeenCalledWith('1', 101)
    })
    expect(toastApi.showToast).toHaveBeenCalledWith('Course deleted successfully', 'success')

    // It should refresh courses after delete
    await waitFor(() => {
      expect(orgApi.getCoursesPaginatedApi).toHaveBeenCalledTimes(2)
    })
  })

  it('archives a course via the Archive confirmation', async () => {
    vi.mocked(orgApi.getCoursesPaginatedApi).mockResolvedValue(
      page([{ id: 101, title: 'Data Science', status: 'Published' }]),
    )
    vi.mocked(orgApi.updateCourseApi).mockResolvedValue({ id: 101, title: 'Data Science', status: 'Archived' })

    renderContent()

    await waitFor(() => {
      expect(screen.getByText('Data Science')).toBeTruthy()
    })

    await userEvent.click(screen.getByRole('button', { name: /^archive$/i }))
    const confirmBtns = await screen.findAllByRole('button', { name: /^archive$/i })
    await userEvent.click(confirmBtns.at(-1) as HTMLElement)

    await waitFor(() => {
      expect(orgApi.updateCourseApi).toHaveBeenCalledWith('1', 101, { status: 'Archived' })
    })
    expect(toastApi.showToast).toHaveBeenCalledWith('Course archived successfully', 'success')
  })
})
