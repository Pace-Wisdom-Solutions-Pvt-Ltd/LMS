// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

afterEach(() => cleanup())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
}))

vi.mock('@/hooks/useRoleSwitcher', () => ({
  useRoleSwitcher: vi.fn(),
}))

import { getStoredUser, clearStoredUser } from '@/lib/auth'
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher'
import StudentHeader from './StudentHeader'

type RoleSwitcher = ReturnType<typeof useRoleSwitcher>

const mockSwitchToStaff = vi.fn()

function mockSwitcher(overrides: Partial<RoleSwitcher> = {}) {
  const value: RoleSwitcher = {
    showSwitchToStudent: false,
    showSwitchToStaff: false,
    staffRole: null,
    staffRoleLabel: '',
    switchToStudent: vi.fn(),
    switchToStaff: mockSwitchToStaff,
    ...overrides,
  }
  vi.mocked(useRoleSwitcher).mockReturnValue(value)
}

describe('layout StudentHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStoredUser).mockReturnValue({ email: 's@test.com', name: 'Student', role: 'student' })
    mockSwitcher()
  })

  it('calls menu click, updates search, and signs out', async () => {
    const onToggleSidebar = vi.fn()
    render(<StudentHeader onToggleSidebar={onToggleSidebar} />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(onToggleSidebar).toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText(/Search All/i), { target: { value: '#course' } })
    expect((screen.getByPlaceholderText(/Search All/i) as HTMLInputElement).value).toBe('#course')

    fireEvent.click(screen.getByRole('button', { name: /Student/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(vi.mocked(clearStoredUser)).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('hides the menu toggle when no handler is given', () => {
    render(<StudentHeader />)
    expect(screen.queryByRole('button', { name: 'Toggle menu' })).toBeNull()
  })

  it('renders nothing when no user is stored', () => {
    vi.mocked(getStoredUser).mockReturnValue(null)
    const { container } = render(<StudentHeader />)
    expect(container.firstChild).toBeNull()
  })

  it('offers switching to the staff view when available', () => {
    mockSwitcher({ showSwitchToStaff: true, staffRole: 'trainer', staffRoleLabel: 'Trainer' })
    render(<StudentHeader />)
    fireEvent.click(screen.getByRole('button', { name: /Student/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Trainer View' }))
    expect(mockSwitchToStaff).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
  })

  it('closes the dropdown on outside click', () => {
    render(<StudentHeader />)
    fireEvent.click(screen.getByRole('button', { name: /Student/i }))
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
  })
})
