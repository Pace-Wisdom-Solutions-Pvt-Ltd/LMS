// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ApiMyProgress, ApiStudentDashboard } from '@/lib/api/organizations'
import type { StoredOrganization } from '@/lib/auth'

afterEach(() => cleanup())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) }
})

const mockOrgs: StoredOrganization[] = [{ id: 1, name: 'Org', role: 'student' }]

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn(() => mockOrgs),
  getStoredUser: vi.fn(() => ({ email: 'stu@test.com', role: 'student' })),
}))

const mockDashboard: ApiStudentDashboard = {
  cards: {
    enrolled_courses: 5,
    upcoming_mandatory_due_dates: 2,
    overall_completion_percentage: 45,
    pending_assessments: 3,
    certificates_earned: 1,
    learning_hours_this_month: 12,
  },
  upcoming_mandatory_due_dates: [],
  progress: [],
  resume_learning_node_id: null,
  gamification: { points: 1500, level: '', badges: [] },
  certificates: [],
}

const mockProgress: ApiMyProgress = {
  overall_completion_percentage: 40,
  total_nodes: 40,
  completed_nodes: 12,
  batches: [
    {
      id: 1,
      name: 'Batch A',
      courses: [
        { id: 11, title: 'React Basics', completed_nodes: 6, total_nodes: 10, completion_percentage: 60.4 },
        { id: 12, title: 'SQL Fundamentals', completed_nodes: 10, total_nodes: 10, completion_percentage: 100 },
        { id: 13, title: 'DevOps', completed_nodes: 0, total_nodes: 20, completion_percentage: 0 },
      ],
    },
  ],
}

vi.mock('@/lib/api/organizations', () => ({
  getStudentDashboardApi: vi.fn(),
  getMyProgressApi: vi.fn(),
}))

import { getStudentDashboardApi, getMyProgressApi } from '@/lib/api/organizations'
import { getStoredOrganizations } from '@/lib/auth'
import StudentHome from '../dashboard/Home'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getStoredOrganizations).mockReturnValue(mockOrgs)
  vi.mocked(getStudentDashboardApi).mockResolvedValue(mockDashboard)
  vi.mocked(getMyProgressApi).mockResolvedValue(mockProgress)
})

function renderHome() {
  return render(<MemoryRouter><StudentHome /></MemoryRouter>)
}

async function renderLoaded() {
  const result = renderHome()
  await screen.findByText('At a Glance')
  return result
}

describe('StudentHome', () => {
  it('renders without crashing', () => {
    const { container } = renderHome()
    expect(container.firstChild).toBeTruthy()
  })

  it('shows My Learning Dashboard heading', () => {
    const { container } = renderHome()
    expect(container.textContent).toContain('My Learning Dashboard')
  })

  it('fetches dashboard and progress for the active org', async () => {
    await renderLoaded()
    expect(getStudentDashboardApi).toHaveBeenCalledWith('1')
    expect(getMyProgressApi).toHaveBeenCalledWith('1')
  })

  it('shows metric labels and values', async () => {
    const { container } = await renderLoaded()
    const text = container.textContent ?? ''
    expect(text).toContain('Enrolled Courses')
    expect(text).toContain('Pending Assessments')
    expect(text).toContain('Certificates')
    expect(text).toContain('Learning Hours (Mo.)')
    expect(text).toContain('Upcoming Due')
    expect(text).toContain('Points')
    expect(text).toContain((1500).toLocaleString())
  })

  it('prefers the dashboard overall completion over the progress payload', async () => {
    await renderLoaded()
    expect(screen.getByRole('img', { name: /45% Complete/ })).toBeTruthy()
    expect(screen.getByText('12/40 lessons')).toBeTruthy()
  })

  it('falls back to progress overall completion when dashboard fails', async () => {
    vi.mocked(getStudentDashboardApi).mockRejectedValue(new Error('down'))
    await renderLoaded()
    expect(screen.getByRole('img', { name: /40% Complete/ })).toBeTruthy()
  })

  it('renders course progress rows with rounded percentages', async () => {
    const { container } = await renderLoaded()
    expect(container.textContent).toContain('React Basics')
    expect(container.textContent).toContain('SQL Fundamentals')
    expect(container.textContent).toContain('60%')
  })

  it('shows empty states when progress is unavailable', async () => {
    vi.mocked(getMyProgressApi).mockRejectedValue(new Error('down'))
    const { container } = await renderLoaded()
    expect(container.textContent).toContain("You're not enrolled in any courses yet.")
    expect(container.textContent).toContain('No course data available.')
  })

  it('navigates to my-courses when enrolled courses metric clicked', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: /Enrolled Courses/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/student/my-courses')
  })

  it('navigates to assessments and progress from their metrics', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: /Pending Assessments/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/student/assessments')
    fireEvent.click(screen.getByRole('button', { name: /Certificates/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/student/progress')
  })

  it('disables metrics without a destination', async () => {
    await renderLoaded()
    const hours = screen.getByRole('button', { name: /Learning Hours/ })
    expect(hours).toBeDisabled()
    fireEvent.click(hours)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('skips fetching when there is no organization', () => {
    vi.mocked(getStoredOrganizations).mockReturnValue([])
    const { container } = renderHome()
    expect(getStudentDashboardApi).not.toHaveBeenCalled()
    expect(container.textContent).toContain('At a Glance')
  })
})
