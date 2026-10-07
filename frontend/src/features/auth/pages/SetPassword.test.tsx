// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
const mockUseSearchParams = vi.fn()
const mockAcceptInviteApi = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => mockUseSearchParams(),
  }
})

vi.mock('@/lib/api/auth', () => ({
  acceptInviteApi: (...args: unknown[]) => mockAcceptInviteApi(...args),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

import { showToast } from '@/lib/toastApi'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('SetPassword', () => {
  it('renders invalid/expired link when token is missing', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('')])
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter>
        <SetPassword />
      </MemoryRouter>
    )
    expect(screen.getByText(/Invalid or expired link/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Back to sign in/i })).toBeTruthy()
  })

  it('validates form inputs before calling API', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=abc')])
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter>
        <SetPassword />
      </MemoryRouter>
    )

    const form = document.querySelector('form') as HTMLFormElement

    fireEvent.submit(form)
    expect(screen.getByText('Please fill both fields.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i, { selector: 'input' }), { target: { value: '87654321' } })
    fireEvent.submit(form)
    expect(screen.getByText('Passwords do not match.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i, { selector: 'input' }), { target: { value: '123' } })
    fireEvent.submit(form)
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy()

    expect(mockAcceptInviteApi).not.toHaveBeenCalled()
  })

  it('submits token+password, shows success, and navigates to login', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=abc')])
    mockAcceptInviteApi.mockResolvedValueOnce({})

    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter>
        <SetPassword />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i, { selector: 'input' }), { target: { value: '12345678' } })
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockAcceptInviteApi).toHaveBeenCalledWith({ token: 'abc', password: '12345678' })
    })
    expect(showToast).toHaveBeenCalledWith('Password set successfully. You can now sign in.', 'success')

    await new Promise((r) => setTimeout(r, 850))
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  }, 10_000)

  it('shows API error message on failure', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=abc')])
    mockAcceptInviteApi.mockRejectedValueOnce(new Error('Bad token'))
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter>
        <SetPassword />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i, { selector: 'input' }), { target: { value: '12345678' } })
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Bad token')).toBeTruthy()
    })
  })
})

