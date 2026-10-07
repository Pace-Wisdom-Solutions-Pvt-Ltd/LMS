// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 10, name: 'Org' }]),
}))

// The analytics panel fetches paginated data; it has its own coverage, so stub it here.
vi.mock('../dashboard/analytics/OrganizationAnalytics', () => ({
  default: ({ orgId }: { orgId: string }) => <div data-testid="org-analytics">analytics:{orgId}</div>,
}))

import { getStoredOrganizations } from '@/lib/auth'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getStoredOrganizations).mockReturnValue([{ id: 10, name: 'Org' }] as ReturnType<typeof getStoredOrganizations>)
})

afterEach(() => {
  cleanup()
})

async function renderDashboard() {
  const { default: Dashboard } = await import('../dashboard/Dashboard')
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('InstituteAdminDashboard', () => {
  it('renders the header and the analytics panel for the stored organization', async () => {
    await renderDashboard()

    expect(screen.getByText('Organization Dashboard')).toBeTruthy()
    expect(screen.getByText('Select primary task')).toBeTruthy()
    expect(screen.getByTestId('org-analytics').textContent).toBe('analytics:10')
  })

  it('hides the analytics panel when there is no stored organization', async () => {
    vi.mocked(getStoredOrganizations).mockReturnValue([])
    await renderDashboard()

    expect(screen.getByText('Organization Dashboard')).toBeTruthy()
    expect(screen.queryByTestId('org-analytics')).toBeNull()
    expect(screen.queryByText('Analytics')).toBeNull()
  })

  it('primary task buttons navigate to their paths', async () => {
    await renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: /manage users/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/org-admin/users')

    fireEvent.click(screen.getByRole('button', { name: /courses & content/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/org-admin/content')
  })

  // Assessments are not part of the open-source edition, so there is no tile for them.
  it('does not offer an Assessments task that links to a removed route', async () => {
    await renderDashboard()
    expect(screen.queryByRole('button', { name: /assessments/i })).toBeNull()
  })
})
