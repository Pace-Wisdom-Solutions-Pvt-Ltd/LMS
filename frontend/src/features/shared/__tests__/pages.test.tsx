// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/api/client', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/client')
  const m: Record<string, unknown> = {}
  for (const k of Object.keys(mod)) m[k] = typeof mod[k] === 'function' ? vi.fn().mockResolvedValue([]) : mod[k]
  return m
})
vi.mock('@/lib/api/organizations', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/organizations')
  const m: Record<string, unknown> = {}
  for (const k of Object.keys(mod)) m[k] = typeof mod[k] === 'function' ? vi.fn().mockResolvedValue([]) : mod[k]
  return m
})
vi.mock('@/lib/api/auth', () => ({ logoutApi: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({ email: 'test@test.com', role: 'instructor', roles: ['instructor'] }),
  getStoredToken: vi.fn().mockReturnValue('mock-token'),
  getStoredRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
  getStoredProfile: vi.fn().mockReturnValue({ first_name: 'Test', last_name: 'User', email: 'test@test.com' }),
  hasRole: vi.fn().mockReturnValue(true),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
  setStoredProfile: vi.fn(),
}))
vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Shared Pages - Smoke Tests', () => {
  it('Profile renders', async () => {
    const { default: Comp } = await import('../Profile')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('AccountSettings renders', async () => {
    const { default: Comp } = await import('../AccountSettings')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('ChangePassword renders', async () => {
    const { default: Comp } = await import('../ChangePassword')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })
})
