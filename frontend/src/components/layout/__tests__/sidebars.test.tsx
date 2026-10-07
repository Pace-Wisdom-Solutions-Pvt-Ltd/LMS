// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InstituteAdminSidebar from '@/features/institute-admin/layout/InstituteAdminSidebar'
import InstructorSidebar from '@/features/instructor/layout/InstructorSidebar'
import StudentSidebar from '@/features/student/layout/StudentSidebar'

function renderInRouter(ui: React.ReactElement, path = '/') {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}

describe('InstituteAdminSidebar', () => {
  it('renders without crashing', () => {
    const { container } = renderInRouter(<InstituteAdminSidebar collapsed />, '/org-admin')
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('renders expanded with links under /org-admin', () => {
    const { container } = renderInRouter(<InstituteAdminSidebar collapsed={false} />, '/org-admin')
    expect(container.querySelector('aside')?.className).toContain('w-64')
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/org-admin/home')
  })
})

describe('InstructorSidebar', () => {
  it('renders without crashing', () => {
    const { container } = renderInRouter(<InstructorSidebar collapsed />, '/trainer')
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('renders expanded with links under /trainer', () => {
    const { container } = renderInRouter(<InstructorSidebar collapsed={false} />, '/trainer')
    expect(container.querySelector('aside')?.className).toContain('w-64')
    expect(screen.getByRole('link', { name: /assigned courses/i })).toHaveAttribute('href', '/trainer/courses')
  })
})

describe('StudentSidebar', () => {
  it('renders without crashing', () => {
    const { container } = renderInRouter(<StudentSidebar collapsed={false} />, '/student')
    expect(container.querySelector('aside')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /my courses/i })).toHaveAttribute('href', '/student/my-courses')
  })
})
