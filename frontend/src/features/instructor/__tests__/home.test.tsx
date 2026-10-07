// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ApiTeacherDashboard } from '@/lib/api/organizations'
import Home from '../dashboard/Home'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => [{ id: 1 }],
  getStoredUser: () => ({ id: 'u1', name: 'Test Instructor' }),
}))

const mockGetTeacherDashboardApi = vi.fn<(orgId: string, teacherId: string) => Promise<ApiTeacherDashboard>>()

vi.mock('@/lib/api/organizations', () => ({
  getTeacherDashboardApi: (orgId: string, teacherId: string) => mockGetTeacherDashboardApi(orgId, teacherId),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('InstructorHome', () => {
  it('renders dashboard widgets and navigates via actions', async () => {
    mockGetTeacherDashboardApi.mockResolvedValue({
      student_count: 10,
      batch_count: 2,
      course_count: 3,
      pending_evaluations_count: 1,
      average_completion_percentage: 75,
      recent_submissions: [{ id: 1 }],
    })

    renderHome()

    expect(screen.getByText(/Trainer Dashboard/i)).toBeTruthy()

    // Wait for API data to load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeTruthy() // student_count
    })
    expect(mockGetTeacherDashboardApi).toHaveBeenCalledWith('1', 'u1')

    expect(screen.getByText('Student Count')).toBeTruthy()
    expect(screen.getByText('Batch Count')).toBeTruthy()
    expect(screen.getByText('Course Count')).toBeTruthy()
    expect(screen.getByText('Pending Evaluations Count')).toBeTruthy()
    expect(screen.getByText('Average Completion Percentage')).toBeTruthy()
    expect(screen.getByText('75%')).toBeTruthy()
    expect(screen.getByText('1 pending review')).toBeTruthy()

    // Primary task buttons
    fireEvent.click(screen.getByRole('button', { name: /Prepare \/ Update Content/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/courses')

    fireEvent.click(screen.getByRole('button', { name: /Student Interaction/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/learners')

    fireEvent.click(screen.getByRole('button', { name: /My Profile/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/profile')
  })

  it('renders zero values when the dashboard is empty', async () => {
    mockGetTeacherDashboardApi.mockResolvedValue({
      student_count: 0,
      batch_count: 0,
      course_count: 0,
      pending_evaluations_count: 0,
      average_completion_percentage: 0,
      recent_submissions: [],
    })

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeTruthy()
    })
    expect(screen.getByText('0 pending review')).toBeTruthy()
  })

  it('falls back to zeros when the dashboard request fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetTeacherDashboardApi.mockRejectedValue(new Error('boom'))

    renderHome()

    await waitFor(() => expect(screen.getByText('0%')).toBeTruthy())
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
