// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/api/organizations', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/organizations')
  const m: Record<string, unknown> = {}
  for (const k of Object.keys(mod)) m[k] = typeof mod[k] === 'function' ? vi.fn().mockResolvedValue([]) : mod[k]
  return m
})
vi.mock('@/lib/api/client', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/client')
  const m: Record<string, unknown> = {}
  for (const k of Object.keys(mod)) m[k] = typeof mod[k] === 'function' ? vi.fn().mockResolvedValue([]) : mod[k]
  return m
})
vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({ email: 'stu@test.com', role: 'student', roles: ['student'] }),
  getStoredToken: vi.fn().mockReturnValue('mock-token'),
  getStoredRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
  hasRole: vi.fn().mockReturnValue(true),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
}))
vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '1' }),
  }
})

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Student Pages - Smoke Tests', () => {
  it('Home renders', async () => {
    const { default: Comp } = await import('../dashboard/Home')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('MyCourses renders', async () => {
    const { default: Comp } = await import('../courses/MyCourses')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('Progress renders', async () => {
    const { default: Comp } = await import('../progress/Progress')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('QuizProgress renders', async () => {
    const { default: Comp } = await import('../progress/QuizProgress')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })
})
