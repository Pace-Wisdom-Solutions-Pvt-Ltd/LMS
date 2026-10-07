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
  setStoredUser: vi.fn(),
  getStoredRefreshToken: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  logoutApi: vi.fn(),
}))

import { getStoredUser, clearStoredUser, setStoredUser, getStoredRefreshToken } from '@/lib/auth'
import { logoutApi } from '@/lib/api/auth'
import Header from './Header'

describe('layout Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStoredUser).mockReturnValue({
      email: 'a@test.com',
      name: 'Alice',
      role: 'institute_admin',
      roles: ['institute_admin', 'student'],
    })
    vi.mocked(getStoredRefreshToken).mockReturnValue('refresh-token')
    vi.mocked(logoutApi).mockResolvedValue(undefined)
  })

  it('opens dropdown, switches role, and closes', async () => {
    render(<Header title="Dashboard" />)

    fireEvent.click(screen.getByRole('button', { name: /Alice/i }))
    await waitFor(() => expect(screen.getByText('Switch role')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Student' }))
    expect(vi.mocked(setStoredUser)).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/student/home'))
  })

  it('signs out and navigates to login', async () => {
    render(<Header title="Dashboard" />)
    fireEvent.click(screen.getByRole('button', { name: /Alice/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    await waitFor(() => {
      expect(vi.mocked(logoutApi)).toHaveBeenCalledWith('refresh-token')
      expect(vi.mocked(clearStoredUser)).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('closes dropdown on outside click', async () => {
    render(<Header title="Dashboard" />)
    fireEvent.click(screen.getByRole('button', { name: /Alice/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy())
    fireEvent.mouseDown(document.body)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull())
  })
})

