// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'

afterEach(() => { cleanup() })

vi.mock('@/features/institute-admin/layout/InstituteAdminSidebar', () => ({
  default: ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
    <div data-testid="institute-admin-sidebar" data-collapsed={String(collapsed)}>
      <button onClick={onToggle}>toggle</button>
    </div>
  ),
}))

vi.mock('@/features/instructor/layout/InstructorSidebar', () => ({
  default: ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
    <div data-testid="instructor-sidebar" data-collapsed={String(collapsed)}>
      <button onClick={onToggle}>toggle</button>
    </div>
  ),
}))

vi.mock('@/features/student/layout/StudentSidebar', () => ({
  default: () => <div data-testid="student-sidebar" />,
}))

vi.mock('@/components/layout/Header', () => ({
  default: ({ title, sidebarCollapsed, onToggleSidebar }: { title: string; sidebarCollapsed: boolean; onToggleSidebar: () => void }) => (
    <div data-testid="header" data-title={title} data-collapsed={String(sidebarCollapsed)}>
      <button onClick={onToggleSidebar}>toggle</button>
    </div>
  ),
}))

vi.mock('@/features/instructor/layout/InstructorHeader', () => ({
  default: ({ sidebarCollapsed, onToggleSidebar }: { sidebarCollapsed: boolean; onToggleSidebar: () => void }) => (
    <div data-testid="instructor-header" data-collapsed={String(sidebarCollapsed)}>
      <button onClick={onToggleSidebar}>toggle</button>
    </div>
  ),
}))

vi.mock('@/features/student/layout/StudentHeader', () => ({
  default: () => <div data-testid="student-header" />,
}))

vi.mock('@/features/institute-admin/nav', () => ({
  getInstituteAdminTitle: (path: string) => `IA: ${path}`,
}))

describe('InstituteAdminLayout', () => {
  it('renders sidebar, header and outlet', async () => {
    const { default: InstituteAdminLayout } = await import('./InstituteAdminLayout')
    render(
      <MemoryRouter initialEntries={['/institute-admin/home']}>
        <Routes>
          <Route path="/*" element={<InstituteAdminLayout />}>
            <Route path="*" element={<div>outlet content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('institute-admin-sidebar')).toBeTruthy()
    expect(screen.getByTestId('header')).toBeTruthy()
    expect(screen.getByText('outlet content')).toBeTruthy()
  })

  it('toggles sidebar on toggle button click', async () => {
    const { default: InstituteAdminLayout } = await import('./InstituteAdminLayout')
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/*" element={<InstituteAdminLayout />} />
        </Routes>
      </MemoryRouter>
    )
    const sidebar = screen.getByTestId('institute-admin-sidebar')
    expect(sidebar.getAttribute('data-collapsed')).toBe('false')
    // click the toggle in header
    const buttons = screen.getAllByRole('button', { name: 'toggle' })
    fireEvent.click(buttons[0])
    expect(sidebar.getAttribute('data-collapsed')).toBe('true')
  })

  it('shows overlay when not collapsed and clicking hides sidebar', async () => {
    const { default: InstituteAdminLayout } = await import('./InstituteAdminLayout')
    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route path="/*" element={<InstituteAdminLayout />} />
        </Routes>
      </MemoryRouter>
    )
    const overlay = container.querySelector('[aria-hidden="true"]')
    expect(overlay).toBeTruthy()
    fireEvent.click(overlay!)
    expect(screen.getByTestId('institute-admin-sidebar').getAttribute('data-collapsed')).toBe('true')
  })
})

describe('InstructorLayout', () => {
  it('renders instructor sidebar, header and outlet', async () => {
    const { default: InstructorLayout } = await import('./InstructorLayout')
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/*" element={<InstructorLayout />}>
            <Route path="*" element={<div>instructor outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('instructor-sidebar')).toBeTruthy()
    expect(screen.getByTestId('instructor-header')).toBeTruthy()
    expect(screen.getByText('instructor outlet')).toBeTruthy()
  })

  it('toggles sidebar', async () => {
    const { default: InstructorLayout } = await import('./InstructorLayout')
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/*" element={<InstructorLayout />} />
        </Routes>
      </MemoryRouter>
    )
    const sidebar = screen.getByTestId('instructor-sidebar')
    expect(sidebar.getAttribute('data-collapsed')).toBe('false')
    const buttons = screen.getAllByRole('button', { name: 'toggle' })
    fireEvent.click(buttons[0])
    expect(sidebar.getAttribute('data-collapsed')).toBe('true')
  })

  it('overlay click collapses sidebar', async () => {
    const { default: InstructorLayout } = await import('./InstructorLayout')
    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route path="/*" element={<InstructorLayout />} />
        </Routes>
      </MemoryRouter>
    )
    const overlay = container.querySelector('[aria-hidden="true"]')
    expect(overlay).toBeTruthy()
    fireEvent.click(overlay!)
    expect(screen.getByTestId('instructor-sidebar').getAttribute('data-collapsed')).toBe('true')
  })
})

describe('StudentLayout', () => {
  it('renders student sidebar, header and outlet', async () => {
    const { default: StudentLayout } = await import('./StudentLayout')
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/*" element={<StudentLayout />}>
            <Route path="*" element={<div>student outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('student-sidebar')).toBeTruthy()
    expect(screen.getByTestId('student-header')).toBeTruthy()
    expect(screen.getByText('student outlet')).toBeTruthy()
  })
})
