// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { LoginResponse } from '@/lib/api/auth'

vi.mock('@/assets/pws_logo_new_text.png', () => ({ default: 'logo' }))

vi.mock('@/lib/constants', () => ({
  ROLE_PATHS: {
    institute_admin: '/org-admin',
    trainer: '/trainer',
    student: '/student',
  },
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/lib/auditLog', () => ({
  appendLoginAudit: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  loginApi: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  setStoredOrganizations: vi.fn(),
  setStoredUser: vi.fn(),
  setStoredToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
}))

import { showToast } from '@/lib/toastApi'
import { loginApi } from '@/lib/api/auth'
import * as auth from '@/lib/auth'
import Login from '@/features/auth/pages/Login'

// Login navigates with a full page load (window.location.replace) so the app
// re-bootstraps with the new session; stub it since jsdom can't navigate.
const replaceMock = vi.fn()
const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, replace: replaceMock },
  })
})

afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  vi.restoreAllMocks()
})

function makeLoginResponse(user: Partial<LoginResponse['user']>): LoginResponse {
  return {
    access: 'a',
    refresh: 'r',
    user: {
      id: 'u1',
      email: 'x@test.com',
      username: 'x',
      first_name: 'X',
      last_name: 'Y',
      phone_number: null,
      profile_picture: null,
      is_active: true,
      is_superuser: false,
      date_joined: '2024-01-01',
      roles: ['student'],
      organizations: [{ id: 1, name: 'Org', role: 'student' }],
      ...user,
    },
  }
}

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

function submit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
}

describe('Login', () => {
  it('validates missing email/password', () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Please enter email and password.', 'warning')
  })

  it('toggles password visibility', () => {
    renderLogin()
    const pwdEl = screen.getByLabelText(/password/i)
    expect(pwdEl instanceof HTMLInputElement).toBe(true)
    if (!(pwdEl instanceof HTMLInputElement)) return
    const pwd = pwdEl
    expect(pwd.type).toBe('password')
    const wrapper = pwd.closest('div')
    expect(wrapper).toBeTruthy()
    const toggleEl = wrapper?.querySelector('button[type="button"]') ?? null
    const toggle = toggleEl instanceof HTMLButtonElement ? toggleEl : null
    expect(toggle).toBeTruthy()
    if (toggle) fireEvent.click(toggle)
    const pwdEl2 = screen.getByLabelText(/password/i)
    expect(pwdEl2 instanceof HTMLInputElement).toBe(true)
    if (pwdEl2 instanceof HTMLInputElement) expect(pwdEl2.type).toBe('text')
  })

  it('handles login error and shows toast', async () => {
    vi.mocked(loginApi).mockRejectedValueOnce(new Error('bad creds'))
    renderLogin()
    submit('a@test.com', 'p')
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith('bad creds', 'error'))
  })

  it('navigates immediately for single-role login', async () => {
    vi.mocked(loginApi).mockResolvedValueOnce(makeLoginResponse({}))
    renderLogin()
    submit('x@test.com', 'p')

    await waitFor(() => {
      expect(vi.mocked(auth.setStoredToken)).toHaveBeenCalledWith('a')
      expect(replaceMock).toHaveBeenCalledWith('/student/home')
    })
  })

  it('opens role chooser for multi-role login and navigates on selection', async () => {
    vi.mocked(loginApi).mockResolvedValueOnce(
      makeLoginResponse({
        email: 'm@test.com',
        username: 'm',
        first_name: 'M',
        last_name: 'R',
        roles: ['org_admin', 'student'],
      }),
    )
    renderLogin()
    submit('m@test.com', 'p')

    await waitFor(() => expect(screen.getByText(/continue as/i)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /organization admin/i }))
    expect(replaceMock).toHaveBeenCalledWith('/org-admin/home')
  })
})
