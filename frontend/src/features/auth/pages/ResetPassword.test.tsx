// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockShowToast = vi.fn()
vi.mock('@/lib/toastApi', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const mockResetPasswordApi = vi.fn()
vi.mock('@/lib/api/auth', () => ({
  resetPasswordApi: (...args: unknown[]) => mockResetPasswordApi(...args),
}))

import ResetPassword from './ResetPassword'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage(url = '/reset-password?token=abc123') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ResetPassword />
    </MemoryRouter>
  )
  return document.querySelector('form') as HTMLFormElement
}

function fill(password: string, confirm: string) {
  fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: password } })
  fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: confirm } })
}

describe('ResetPassword', () => {
  it('validates password fields', () => {
    const form = renderPage()

    fireEvent.submit(form)
    expect(mockShowToast).toHaveBeenLastCalledWith('Password must be at least 8 characters.', 'warning')

    fill('12345678', '87654321')
    fireEvent.submit(form)
    expect(mockShowToast).toHaveBeenLastCalledWith('Passwords do not match.', 'warning')

    fill('123', '123')
    fireEvent.submit(form)
    expect(mockShowToast).toHaveBeenLastCalledWith('Password must be at least 8 characters.', 'warning')

    expect(mockResetPasswordApi).not.toHaveBeenCalled()
  })

  it('shows error when the reset token is missing', () => {
    const form = renderPage('/reset-password')
    fill('12345678', '12345678')
    fireEvent.submit(form)
    expect(mockShowToast).toHaveBeenCalledWith('Invalid or missing reset token.', 'error')
    expect(mockResetPasswordApi).not.toHaveBeenCalled()
  })

  it('navigates to login when valid', async () => {
    mockResetPasswordApi.mockResolvedValue(undefined)
    const form = renderPage()
    fill('12345678', '12345678')
    fireEvent.submit(form)

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    expect(mockResetPasswordApi).toHaveBeenCalledWith('abc123', '12345678')
    expect(mockShowToast).toHaveBeenCalledWith('Password reset successfully. Please sign in.', 'success')
  })

  it('shows error toast when the API call fails', async () => {
    mockResetPasswordApi.mockRejectedValue(new Error('Token expired'))
    const form = renderPage()
    fill('12345678', '12345678')
    fireEvent.submit(form)

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Token expired', 'error'))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('toggles password visibility', () => {
    renderPage()
    const input = screen.getByLabelText(/New password/i) as HTMLInputElement
    expect(input.type).toBe('password')
    const toggles = document.querySelectorAll('button[type="button"]')
    fireEvent.click(toggles[0])
    expect(input.type).toBe('text')
    const confirm = screen.getByLabelText(/Confirm password/i) as HTMLInputElement
    fireEvent.click(toggles[1])
    expect(confirm.type).toBe('text')
  })
})
