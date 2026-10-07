// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

afterEach(() => cleanup())
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(changePasswordApi).mockResolvedValue(undefined)
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/lib/api/auth', () => ({
  changePasswordApi: vi.fn(),
}))

vi.mock('@/components/ui/PageCard', () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <div><h2>{title}</h2>{children}</div>
  ),
}))

import { showToast } from '@/lib/toastApi'
import { changePasswordApi } from '@/lib/api/auth'
import ChangePassword from '../ChangePassword'

function renderPage() {
  return render(<MemoryRouter><ChangePassword /></MemoryRouter>)
}

function fields() {
  return {
    current: screen.getByLabelText('Current password') as HTMLInputElement,
    next: screen.getByLabelText('New password') as HTMLInputElement,
    confirm: screen.getByLabelText('Confirm password') as HTMLInputElement,
  }
}

function fillAndSubmit(container: HTMLElement, current: string, next: string, confirm: string) {
  const f = fields()
  fireEvent.change(f.current, { target: { value: current } })
  fireEvent.change(f.next, { target: { value: next } })
  fireEvent.change(f.confirm, { target: { value: confirm } })
  fireEvent.submit(container.querySelector('form')!)
}

describe('ChangePassword', () => {
  it('shows Change Password heading', () => {
    const { container } = renderPage()
    expect(container.textContent).toContain('Change Password')
  })

  it('renders current, new and confirm password inputs as password fields', () => {
    renderPage()
    const f = fields()
    expect(f.current.type).toBe('password')
    expect(f.next.type).toBe('password')
    expect(f.confirm.type).toBe('password')
  })

  it('toggles visibility of a password field', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Show new password' }))
    expect(fields().next.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide new password' }))
    expect(fields().next.type).toBe('password')
  })

  it('warns when any field is empty', () => {
    const { container } = renderPage()
    fillAndSubmit(container, 'oldpass123', '', '')
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Please fill in all password fields.', 'warning')
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('warns when the new password is too short', () => {
    const { container } = renderPage()
    fillAndSubmit(container, 'oldpass123', 'short', 'short')
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('New password must be at least 8 characters long.', 'warning')
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('warns when new and confirm passwords do not match', () => {
    const { container } = renderPage()
    fillAndSubmit(container, 'oldpass123', 'newpass123', 'newpass124')
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('New password and confirm password do not match.', 'warning')
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('warns when the new password equals the current password', () => {
    const { container } = renderPage()
    fillAndSubmit(container, 'samepass123', 'samepass123', 'samepass123')
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('New password cannot be the same as current password.', 'warning')
    expect(changePasswordApi).not.toHaveBeenCalled()
  })

  it('submits the payload, shows success and clears the form', async () => {
    const { container } = renderPage()
    fillAndSubmit(container, 'oldpass123', 'newpass123', 'newpass123')
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Password changed successfully.', 'success'),
    )
    expect(changePasswordApi).toHaveBeenCalledWith({
      current_password: 'oldpass123',
      new_password: 'newpass123',
      confirm_password: 'newpass123',
    })
    const f = fields()
    expect(f.current.value).toBe('')
    expect(f.next.value).toBe('')
    expect(f.confirm.value).toBe('')
  })

  it('shows the API error message and keeps the form values on failure', async () => {
    vi.mocked(changePasswordApi).mockRejectedValue(new Error('Current password is incorrect.'))
    const { container } = renderPage()
    fillAndSubmit(container, 'wrongpass1', 'newpass123', 'newpass123')
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Current password is incorrect.', 'error'),
    )
    expect(fields().current.value).toBe('wrongpass1')
  })

  it('shows fallback error toast for non-Error rejections', async () => {
    vi.mocked(changePasswordApi).mockRejectedValue('boom')
    const { container } = renderPage()
    fillAndSubmit(container, 'oldpass123', 'newpass123', 'newpass123')
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Failed to change password. Please try again.', 'error'),
    )
  })

  it('navigates back when Back is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })
})
