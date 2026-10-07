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
vi.mock('@/lib/api/auth', () => ({ logoutApi: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({ id: 'u1', email: 'inst@test.com', role: 'trainer', roles: ['trainer'] }),
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
vi.mock('@/lib/constants', () => ({
  ROLE_PATHS: { institute_admin: '/org-admin', trainer: '/trainer', student: '/student' },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '1', courseId: '1' }),
  }
})

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Instructor Pages - Smoke Tests', () => {
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

  it('AssignedCourses renders', async () => {
    const { default: Comp } = await import('../courses/AssignedCourses')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('CourseDetail renders', async () => {
    const { default: Comp } = await import('../courses/CourseDetail')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })

  it('Students renders', async () => {
    const { default: Comp } = await import('../students/Students')
    const { container } = wrap(<Comp />)
    expect(container.firstChild).toBeTruthy()
  })



  it('CreateCourseModal renders', async () => {
    const { default: Comp } = await import('../modals/CreateCourseModal')
    const { container } = wrap(<Comp onClose={() => {}} onCreated={() => {}} />)
    expect(container).toBeTruthy()
  })

  it('CreateProgramModal renders', async () => {
    const { default: Comp } = await import('../modals/CreateProgramModal')
    const { container } = wrap(<Comp onClose={() => {}} onCreated={() => {}} />)
    expect(container).toBeTruthy()
  })

  it('CreateStudentModal renders', async () => {
    const { default: Comp } = await import('../modals/CreateStudentModal')
    const { container } = wrap(<Comp onClose={() => {}} onCreated={() => {}} />)
    expect(container).toBeTruthy()
  })
})
