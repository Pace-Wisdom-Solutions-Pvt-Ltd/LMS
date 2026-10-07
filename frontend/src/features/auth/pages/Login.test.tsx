// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('@/lib/auth', () => ({
  setStoredUser: vi.fn(),
  setStoredToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
  setStoredOrganizations: vi.fn(),
  getStoredUser: vi.fn().mockReturnValue(null),
}))

vi.mock('@/lib/toastApi', () => ({ showToast: vi.fn() }))
vi.mock('@/lib/auditLog', () => ({ appendLoginAudit: vi.fn() }))
vi.mock('@/lib/api/auth', () => ({ loginApi: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/constants', () => ({
  ROLE_PATHS: { super_admin: '/super-admin', institute_admin: '/institute-admin', instructor: '/instructor', student: '/student' },
}))

import Login from './Login'

describe('Login', () => {
  it('renders login form with inputs', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByPlaceholderText('super@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders the page without crashing', () => {
    const { container } = render(<MemoryRouter><Login /></MemoryRouter>)
    expect(container.firstChild).toBeTruthy()
  })
})
