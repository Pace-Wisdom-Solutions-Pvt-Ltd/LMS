// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(),
}))

vi.mock('@/lib/constants', () => ({
  ROLE_PATHS: {
    super_admin: '/super-admin',
    institute_admin: '/institute-admin',
    instructor: '/instructor',
    student: '/student',
  },
}))

import * as auth from '@/lib/auth'
import ProtectedRoute from './ProtectedRoute'

const mockGetStoredUser = vi.mocked(auth.getStoredUser)

beforeEach(() => vi.clearAllMocks())

function renderRoute(user: ReturnType<typeof auth.getStoredUser>, allowedRoles: string[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/super-admin/home" element={<div>Super Admin Home</div>} />
        <Route path="/institute-admin/home" element={<div>Institute Admin Home</div>} />
        <Route path="/instructor/home" element={<div>Instructor Home</div>} />
        <Route path="/student/home" element={<div>Student Home</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles as import('@/lib/auth').UserRole[]}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when no user stored', () => {
    mockGetStoredUser.mockReturnValue(null)
    renderRoute(null, ['student'])
    expect(screen.getByText('Login Page')).toBeTruthy()
    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders children when user has the allowed role via roles array', () => {
    mockGetStoredUser.mockReturnValue({ email: 'test@test.com', role: 'student', roles: ['student'] } as ReturnType<typeof auth.getStoredUser>)
    renderRoute({ email: 'test@test.com', role: 'student', roles: ['student'] } as ReturnType<typeof auth.getStoredUser>, ['student'])
    expect(screen.getByText('Protected Content')).toBeTruthy()
  })

  it('renders children when user has role via roles array match', () => {
    mockGetStoredUser.mockReturnValue({ email: 'test@test.com', role: 'instructor', roles: ['instructor'] } as ReturnType<typeof auth.getStoredUser>)
    const { container } = renderRoute({ email: 'test@test.com', role: 'instructor', roles: ['instructor'] } as ReturnType<typeof auth.getStoredUser>, ['instructor'])
    expect(container.querySelector('[data-protected]') ?? container.textContent).toContain('Protected Content')
  })

  it('redirects to institute_admin home when user lacks access', () => {
    mockGetStoredUser.mockReturnValue({ email: 'test@test.com', role: 'institute_admin', roles: ['institute_admin'] } as ReturnType<typeof auth.getStoredUser>)
    const { container } = renderRoute({ email: 'test@test.com', role: 'institute_admin', roles: ['institute_admin'] } as ReturnType<typeof auth.getStoredUser>, ['super_admin'])
    expect(container.textContent).toContain('Institute Admin Home')
    expect(container.textContent).not.toContain('Protected Content')
  })

  it('redirects to student home when student lacks access', () => {
    mockGetStoredUser.mockReturnValue({ email: 'test@test.com', role: 'student', roles: ['student'] } as ReturnType<typeof auth.getStoredUser>)
    const { container } = renderRoute({ email: 'test@test.com', role: 'student', roles: ['student'] } as ReturnType<typeof auth.getStoredUser>, ['instructor'])
    expect(container.textContent).toContain('Student Home')
    expect(container.textContent).not.toContain('Protected Content')
  })

  it('allows access for any of multiple allowed roles', () => {
    mockGetStoredUser.mockReturnValue({ email: 'test@test.com', role: 'super_admin', roles: ['super_admin'] } as ReturnType<typeof auth.getStoredUser>)
    const { container } = renderRoute({ email: 'test@test.com', role: 'super_admin', roles: ['super_admin'] } as ReturnType<typeof auth.getStoredUser>, ['super_admin', 'institute_admin'])
    expect(container.textContent).toContain('Protected Content')
  })
})
