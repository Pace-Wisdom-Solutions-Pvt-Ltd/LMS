// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'

afterEach(() => cleanup())

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue(null),
  setStoredUser: vi.fn(),
  setStoredToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
  setStoredOrganizations: vi.fn(),
  getStoredToken: vi.fn().mockReturnValue(null),
  getStoredRefreshToken: vi.fn().mockReturnValue(null),
  getStoredOrganizations: vi.fn().mockReturnValue([]),
  hasRole: vi.fn().mockReturnValue(false),
  clearStoredUser: vi.fn(),
  getStoredProfile: vi.fn().mockReturnValue(null),
  setStoredProfile: vi.fn(),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/lib/api/auth', () => ({
  loginApi: vi.fn(),
  acceptInviteApi: vi.fn(),
  resetPasswordApi: vi.fn(),
  refreshTokenApi: vi.fn(),
  logoutApi: vi.fn(),
}))

vi.mock('@/lib/constants', () => ({
  ROLE_PATHS: {
    institute_admin: '/org-admin',
    trainer: '/trainer',
    student: '/student',
  },
}))

vi.mock('@/lib/auditLog', () => ({
  appendLoginAudit: vi.fn(),
}))

vi.mock('@/components/ui/Modal', () => ({
  default: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog"><h2>{title}</h2>{children}</div> : null,
}))

vi.mock('@/components/ui/BackButton', () => ({
  default: ({ label }: { label: string }) => <span data-testid="back-button">{label}</span>,
}))

vi.mock('@/assets/pws_logo_new_text.png', () => ({ default: 'logo.png' }))

import * as authApi from '@/lib/api/auth'
import * as toastApi from '@/lib/toastApi'
import ResetPassword from './ResetPassword'

// Login navigates with a full page load (window.location.replace); stub it
// since jsdom can't navigate.
const replaceMock = vi.fn()
const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockClear()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, replace: replaceMock },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
})

describe('ResetPassword', () => {
  function renderReset() {
    return render(
      <MemoryRouter initialEntries={['/reset-password?token=reset-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders form', () => {
    const { container } = renderReset()
    expect(container.textContent).toContain('Set new password')
    expect(screen.getByRole('button', { name: /reset password/i })).toBeTruthy()
  })

  it('shows too-short warning when fields are empty', () => {
    renderReset()
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))
    expect(toastApi.showToast).toHaveBeenCalledWith('Password must be at least 8 characters.', 'warning')
  })

  it('shows error when passwords do not match', () => {
    renderReset()
    fireEvent.change(document.getElementById('password')!, { target: { value: 'Password1!' } })
    fireEvent.change(document.getElementById('confirm')!, { target: { value: 'Different1!' } })
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))
    expect(toastApi.showToast).toHaveBeenCalledWith('Passwords do not match.', 'warning')
  })

  it('shows error when password too short', () => {
    renderReset()
    fireEvent.change(document.getElementById('password')!, { target: { value: 'short' } })
    fireEvent.change(document.getElementById('confirm')!, { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))
    expect(toastApi.showToast).toHaveBeenCalledWith('Password must be at least 8 characters.', 'warning')
  })

  it('navigates to login when form is valid', async () => {
    vi.mocked(authApi.resetPasswordApi).mockResolvedValue(undefined)
    renderReset()
    fireEvent.change(document.getElementById('password')!, { target: { value: 'ValidPass1!' } })
    fireEvent.change(document.getElementById('confirm')!, { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    expect(authApi.resetPasswordApi).toHaveBeenCalledWith('reset-token', 'ValidPass1!')
  })
})

describe('SetPassword', () => {
  it('shows invalid link message when no token in URL', async () => {
    const { default: SetPassword } = await import('./SetPassword')
    const { container } = render(
      <MemoryRouter initialEntries={['/set-password']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    expect(container.textContent.toLowerCase()).toContain('invalid')
  })

  it('renders form when token is present', async () => {
    const { default: SetPassword } = await import('./SetPassword')
    const { container } = render(
      <MemoryRouter initialEntries={['/set-password?token=abc123']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    expect(container.textContent).toContain('password')
    expect(screen.getByRole('button', { name: /set password/i })).toBeTruthy()
  })

  it('shows error when fields are empty', async () => {
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter initialEntries={['/set-password?token=abc123']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))
    expect(screen.getByText('Please fill both fields.')).toBeTruthy()
  })

  it('shows error when passwords do not match', async () => {
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter initialEntries={['/set-password?token=abc123']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'Password1!' } })
    fireEvent.change(inputs[1], { target: { value: 'Different!' } })
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))
    expect(screen.getByText('Passwords do not match.')).toBeTruthy()
  })

  it('shows too short error', async () => {
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter initialEntries={['/set-password?token=abc123']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'short' } })
    fireEvent.change(inputs[1], { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy()
  })

  it('calls acceptInviteApi on valid submission', async () => {
    vi.mocked(authApi.acceptInviteApi).mockResolvedValue({
      access: 'token', refresh: 'refresh',
      user: { id: '1', email: 'test@test.com', username: 'test', first_name: 'Test', last_name: 'User', phone_number: null, profile_picture: null, is_active: true, is_superuser: false, date_joined: '2024-01-01', roles: [] },
    })
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter initialEntries={['/set-password?token=valid-token']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))
    await waitFor(() => {
      expect(authApi.acceptInviteApi).toHaveBeenCalledWith({ token: 'valid-token', password: 'ValidPass1!' })
    })
  })

  it('shows error when API fails', async () => {
    vi.mocked(authApi.acceptInviteApi).mockRejectedValue(new Error('Token expired'))
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter initialEntries={['/set-password?token=expired']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1!' } })
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /set password/i }))
    await waitFor(() => {
      expect(screen.getByText('Token expired')).toBeTruthy()
    })
  })

  it('has password inputs', async () => {
    const { default: SetPassword } = await import('./SetPassword')
    render(
      <MemoryRouter initialEntries={['/set-password?token=abc123']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
        </Routes>
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Login', () => {
  async function renderLogin() {
    const { default: Login } = await import('./Login')
    const result = render(<MemoryRouter><Login /></MemoryRouter>)
    return result
  }

  it('renders login form', async () => {
    const { container } = await renderLogin()
    expect(container.textContent).toContain('Sign in')
  })

  it('has email and password inputs', async () => {
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    expect(inputs[1].type).toBe('password')
  })

  it('shows warning when fields empty', async () => {
    const { container } = await renderLogin()
    const signInBtn = within(container).getByRole('button', { name: 'Sign in' })
    fireEvent.click(signInBtn)
    await waitFor(() => {
      expect(toastApi.showToast).toHaveBeenCalledWith('Please enter email and password.', 'warning')
    })
  })

  it('shows warning when only email is filled', async () => {
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: 'test@test.com' } })
    const signInBtn = within(container).getByRole('button', { name: 'Sign in' })
    fireEvent.click(signInBtn)
    await waitFor(() => {
      expect(toastApi.showToast).toHaveBeenCalledWith('Please enter email and password.', 'warning')
    })
  })

  it('calls loginApi with trimmed email', async () => {
    vi.mocked(authApi.loginApi).mockResolvedValue({
      access: 'access-token', refresh: 'refresh-token',
      user: { id: '1', email: 'admin@test.com', username: 'admin', first_name: 'Admin', last_name: 'User', phone_number: null, profile_picture: null, is_active: true, is_superuser: false, date_joined: '2024-01-01', roles: ['org_admin'], organizations: [] },
    })
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '  admin@test.com  ' } })
    fireEvent.change(inputs[1], { target: { value: 'password123' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(authApi.loginApi).toHaveBeenCalledWith({ email: 'admin@test.com', password: 'password123' })
    })
  })

  it('navigates to student home for student role', async () => {
    vi.mocked(authApi.loginApi).mockResolvedValue({
      access: 'access-token', refresh: 'refresh-token',
      user: { id: '2', email: 'student@test.com', username: 'student', first_name: 'Student', last_name: 'User', phone_number: null, profile_picture: null, is_active: true, is_superuser: false, date_joined: '2024-01-01', roles: ['student'], organizations: [] },
    })
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: 'student@test.com' } })
    fireEvent.change(inputs[1], { target: { value: 'password123' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/student/home')
    })
  })

  it('shows error toast when login fails', async () => {
    vi.mocked(authApi.loginApi).mockRejectedValue(new Error('Invalid credentials'))
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: 'bad@test.com' } })
    fireEvent.change(inputs[1], { target: { value: 'wrongpass' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(toastApi.showToast).toHaveBeenCalledWith(expect.stringContaining('Invalid'), 'error')
    })
  })

  it('handles trainer login', async () => {
    vi.mocked(authApi.loginApi).mockResolvedValue({
      access: 'access-token', refresh: 'refresh-token',
      user: { id: '3', email: 'instructor@test.com', username: 'instructor', first_name: 'Instructor', last_name: 'User', phone_number: null, profile_picture: null, is_active: true, is_superuser: false, date_joined: '2024-01-01', roles: ['teacher'], organizations: [] },
    })
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: 'instructor@test.com' } })
    fireEvent.change(inputs[1], { target: { value: 'password123' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/trainer/home')
    })
  })

  it('handles org_admin role mapping', async () => {
    vi.mocked(authApi.loginApi).mockResolvedValue({
      access: 'access-token', refresh: 'refresh-token',
      user: { id: '4', email: 'orgadmin@test.com', username: 'orgadmin', first_name: 'Org', last_name: 'Admin', phone_number: null, profile_picture: null, is_active: true, is_superuser: false, date_joined: '2024-01-01', roles: ['org_admin'], organizations: [{ id: 1, name: 'Test Org', role: 'admin' }] },
    })
    const { container } = await renderLogin()
    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: 'orgadmin@test.com' } })
    fireEvent.change(inputs[1], { target: { value: 'password123' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/org-admin/home')
    })
  })
})
