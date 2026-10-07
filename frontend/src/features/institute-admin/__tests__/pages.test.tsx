// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock all external dependencies
vi.mock('@/lib/api/organizations', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/organizations')
  const mocked: Record<string, unknown> = {}
  for (const key of Object.keys(mod)) {
    mocked[key] = typeof mod[key] === 'function' ? vi.fn().mockResolvedValue([]) : mod[key]
  }
  return mocked
})
vi.mock('@/lib/api/client', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/client')
  const mocked: Record<string, unknown> = {}
  for (const key of Object.keys(mod)) {
    mocked[key] = typeof mod[key] === 'function' ? vi.fn().mockResolvedValue([]) : mod[key]
  }
  return mocked
})
vi.mock('@/lib/api/users', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/users')
  const mocked: Record<string, unknown> = {}
  for (const key of Object.keys(mod)) {
    mocked[key] = typeof mod[key] === 'function' ? vi.fn().mockResolvedValue([]) : mod[key]
  }
  return mocked
})
vi.mock('@/lib/api/assessments', async () => {
  const mod = await vi.importActual<Record<string, unknown>>('@/lib/api/assessments')
  const mocked: Record<string, unknown> = {}
  for (const key of Object.keys(mod)) {
    mocked[key] = typeof mod[key] === 'function' ? vi.fn().mockResolvedValue([]) : mod[key]
  }
  return mocked
})
vi.mock('@/lib/api/auth', () => ({ logoutApi: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({ email: 'test@test.com', role: 'institute_admin', roles: ['institute_admin'] }),
  getStoredToken: vi.fn().mockReturnValue('mock-token'),
  getStoredRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
  hasRole: vi.fn().mockReturnValue(true),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
  setStoredToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
  validateCredentials: vi.fn(),
  getStoredProfile: vi.fn().mockReturnValue(null),
  setStoredProfile: vi.fn(),
}))
vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))
vi.mock('@/lib/constants', () => ({
  ROLE_PATHS: { super_admin: '/super-admin', institute_admin: '/institute-admin', instructor: '/instructor', student: '/student' },
}))

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Institute Admin Pages - Smoke Tests', () => {
  it('Home renders', async () => {
    const { default: Comp } = await import('../dashboard/Home')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('Dashboard renders', async () => {
    const { default: Comp } = await import('../dashboard/Dashboard')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('Batches renders', async () => {
    const { default: Comp } = await import('../batches/Batches')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('Content renders', async () => {
    const { default: Comp } = await import('../content/Content')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('AcademicSetup renders', async () => {
    const { default: Comp } = await import('../settings/AcademicSetup')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('CourseBuilder renders', async () => {
    const { default: Comp } = await import('../course-builder/CourseBuilder')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('AdminPanel renders', async () => {
    const { default: Comp } = await import('../settings/AdminPanel')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('Instructors renders', async () => {
    const { default: Comp } = await import('../people/Instructors')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('CourseAllocation renders', async () => {
    const { default: Comp } = await import('../courses/CourseAllocation')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })
})
