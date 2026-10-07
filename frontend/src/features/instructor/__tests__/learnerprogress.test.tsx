// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

const mockGetLearnerProgressPaginatedApi = vi.fn()
const mockGetPublishedCoursesApi = vi.fn()
const mockExportAllLearnerProgressApi = vi.fn()
const mockGetPendingEvaluationsApi = vi.fn()
const mockReviewTaskSubmissionApi = vi.fn()

vi.mock('@/lib/api/organizations', () => ({
  getLearnerProgressPaginatedApi: (...args: unknown[]) => mockGetLearnerProgressPaginatedApi(...args),
  getPublishedCoursesApi: (...args: unknown[]) => mockGetPublishedCoursesApi(...args),
  exportAllLearnerProgressApi: (...args: unknown[]) => mockExportAllLearnerProgressApi(...args),
  getPendingEvaluationsApi: (...args: unknown[]) => mockGetPendingEvaluationsApi(...args),
  reviewTaskSubmissionApi: (...args: unknown[]) => mockReviewTaskSubmissionApi(...args),
}))

const mockSaveBlob = vi.fn()
vi.mock('@/lib/download', () => ({
  saveBlob: (...args: unknown[]) => mockSaveBlob(...args),
}))

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => [{ id: 1 }],
  getStoredUser: () => ({ id: 1, name: 'Test' }),
}))

import { showToast } from '@/lib/toastApi'

const paginated = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results })

/** The evaluate drawer fetches pending and completed lists separately; only serve `items` as pending. */
const pendingOnly = <T,>(items: T[]) => (_orgId: string, params: { status?: string }) =>
  Promise.resolve(paginated(params.status === 'pending' ? items : []))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('LearnerProgress', () => {
  it('filters by course and learner name/id', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([
      { id: 1, title: 'Course 1' },
      { id: 2, title: 'Course 2' },
    ])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([
      { student_id: 'l1', learner_name: 'Alice', course_id: 1, course_title: 'Course 1', completion_percentage: 80, modules_progress: '4/5', last_activity: '2026-03-30T10:00:00Z' },
      { student_id: 'l2', learner_name: 'Bob', course_id: 2, course_title: 'Course 2', completion_percentage: 20, modules_progress: '1/5', last_activity: '2026-03-29T10:00:00Z' },
    ]))

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText(/Student Progress Tracking/i)).toBeTruthy())
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText(/Search by student name/i), { target: { value: 'ali' } })
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.queryByText('Bob')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText(/Search by student name/i), { target: { value: 'l2' } })
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.queryByText('Alice')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText(/Search by student name/i), { target: { value: '' } })
    // The course filter is a custom Dropdown: open it, then pick "Course 1".
    fireEvent.click(screen.getByText('All courses'))
    fireEvent.click(screen.getByRole('button', { name: 'Course 1' }))
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  it('exports the learner progress Excel file and shows toast', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([{ id: 1, title: 'Course 1' }])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([
      { student_id: 'l1', learner_name: 'Alice', course_id: 1, course_title: 'Course 1', completion_percentage: 80, modules_progress: '4/5', last_activity: '2026-03-30T10:00:00Z' },
    ]))
    const blob = new Blob(['xlsx'])
    mockExportAllLearnerProgressApi.mockResolvedValue(blob)

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }))

    await waitFor(() => expect(mockExportAllLearnerProgressApi).toHaveBeenCalled())
    expect(mockExportAllLearnerProgressApi).toHaveBeenCalledWith('1', expect.objectContaining({ teacherId: '1' }))
    await waitFor(() => expect(mockSaveBlob).toHaveBeenCalled())
    expect(mockSaveBlob.mock.calls[0][0]).toBe(blob)
    expect(mockSaveBlob.mock.calls[0][1]).toMatch(/\.xlsx$/)
    expect(showToast).toHaveBeenCalledWith('Export started.', 'success')
  })

  it('shows an error toast when the export fails', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([{ id: 1, title: 'Course 1' }])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([
      { student_id: 'l1', learner_name: 'Alice', course_id: 1, course_title: 'Course 1', completion_percentage: 80, modules_progress: '4/5', last_activity: '2026-03-30T10:00:00Z' },
    ]))
    mockExportAllLearnerProgressApi.mockRejectedValue(new Error('export fail'))

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('export fail', 'error'))
    expect(mockSaveBlob).not.toHaveBeenCalled()
  })

  it('Export CSV button is disabled when there is no data', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([]))

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText(/No student progress data/i)).toBeTruthy())
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled()
  })

  it('shows No activity when last_activity is null', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([
      { student_id: 'l1', learner_name: 'Alice', course_id: 1, course_title: 'Course 1', completion_percentage: 50, modules_progress: '2/4', last_activity: null },
    ]))

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText(/No activity/i)).toBeTruthy())
  })

  it('Evaluate opens the drawer and fetches that student/course submissions', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([{ id: 1, title: 'Course 1' }])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([
      { student_id: 'stu-uuid', learner_name: 'Alice', course_id: 10, course_title: 'Course 1', completion_percentage: 80, modules_progress: '4/5', last_activity: null },
    ]))
    mockGetPendingEvaluationsApi.mockImplementation(pendingOnly([
      {
        id: 55, student_id: 'stu-uuid', student_name: 'Alice', student_email: 'a@x.com',
        task_title: 'Build a REST API', node_id: 3, node_title: 'Node 3', module_id: 2,
        module_title: 'Module 2', submitted_at: '2026-07-01T10:00:00Z', status: 'Pending',
        payload: 'https://github.com/alice/api',
      },
    ]))

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Evaluate/i }))

    await waitFor(() => expect(mockGetPendingEvaluationsApi).toHaveBeenCalledWith('1', {
      type: 'assessment',
      status: 'pending',
      student_id: 'stu-uuid',
      course_id: 10,
    }))
    expect(mockGetPendingEvaluationsApi).toHaveBeenCalledWith('1', {
      type: 'assessment',
      status: 'completed',
      student_id: 'stu-uuid',
      course_id: 10,
    })
    await waitFor(() => expect(screen.getByText('Build a REST API')).toBeTruthy())
  })

  it('grades a submission from the drawer and refetches the list', async () => {
    mockGetPublishedCoursesApi.mockResolvedValue([{ id: 1, title: 'Course 1' }])
    mockGetLearnerProgressPaginatedApi.mockResolvedValue(paginated([
      { student_id: 'stu-uuid', learner_name: 'Alice', course_id: 10, course_title: 'Course 1', completion_percentage: 80, modules_progress: '4/5', last_activity: null },
    ]))
    mockGetPendingEvaluationsApi.mockImplementation(pendingOnly([
      {
        id: 55, student_id: 'stu-uuid', student_name: 'Alice', student_email: 'a@x.com',
        task_title: 'Build a REST API', node_id: 3, node_title: 'Node 3', module_id: 2,
        module_title: 'Module 2', submitted_at: '2026-07-01T10:00:00Z', status: 'Pending',
      },
    ]))
    mockReviewTaskSubmissionApi.mockResolvedValue({ id: 55, status: 'Approved', submitted_at: '2026-07-01T10:00:00Z' })

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Evaluate/i }))
    await waitFor(() => expect(screen.getByText('Build a REST API')).toBeTruthy())

    // Expand the submission to reveal the review form.
    fireEvent.click(screen.getByText('Build a REST API'))
    await waitFor(() => expect(screen.getByPlaceholderText(/e\.g\. 85/i)).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 85/i), { target: { value: '85' } })
    fireEvent.change(screen.getByPlaceholderText(/Write feedback/i), { target: { value: 'Great work!' } })
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

    await waitFor(() => expect(mockReviewTaskSubmissionApi).toHaveBeenCalledWith('1', 55, {
      decision: 'Approved',
      awarded_score: 85,
      feedback: 'Great work!',
    }))
    expect(showToast).toHaveBeenCalledWith('Submission approved successfully.', 'success')
    // The list is refreshed so the graded submission drops out of "pending".
    // (pending + completed are fetched on open, then both again after grading).
    await waitFor(() => expect(mockGetPendingEvaluationsApi).toHaveBeenCalledTimes(4))
  })

  it('shows error toast when API fails', async () => {
    mockGetPublishedCoursesApi.mockRejectedValue(new Error('courses fail'))
    mockGetLearnerProgressPaginatedApi.mockRejectedValue(new Error('courses fail'))

    const { default: LearnerProgress } = await import('../progress/LearnerProgress')
    render(<LearnerProgress />)

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('courses fail', 'error')
    )
  })
})
