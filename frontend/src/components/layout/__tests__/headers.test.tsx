// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'
import InstructorHeader from '@/features/instructor/layout/InstructorHeader'
import StudentHeader from '@/features/student/layout/StudentHeader'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({
    email: 'admin@test.com',
    name: 'John Doe',
    role: 'institute_admin',
    roles: ['institute_admin'],
  }),
  getStoredToken: vi.fn().mockReturnValue('mock-token'),
  getStoredRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  setStoredToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
  clearStoredUser: vi.fn(),
  setStoredUser: vi.fn(),
  getStoredOrganizations: vi.fn().mockReturnValue([]),
  hasRole: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/api/auth', () => ({
  logoutApi: vi.fn().mockResolvedValue(undefined),
  refreshTokenApi: vi.fn(),
}))

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Header', () => {
  it('renders title', () => {
    renderInRouter(<Header title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders user avatar with initial and role label', () => {
    const { container } = renderInRouter(<Header title="Test" />)
    expect(container.querySelector('header')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.getByText('Organization Admin')).toBeInTheDocument()
  })

  it('renders toggle sidebar button when handler provided', () => {
    const onToggle = vi.fn()
    renderInRouter(<Header title="Test" onToggleSidebar={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})

describe('InstructorHeader', () => {
  it('renders without crashing', () => {
    const { container } = renderInRouter(<InstructorHeader />)
    expect(container.querySelector('header')).toBeInTheDocument()
  })
})

describe('StudentHeader', () => {
  it('renders without crashing', () => {
    const { container } = renderInRouter(<StudentHeader />)
    expect(container.querySelector('header')).toBeInTheDocument()
  })
})
