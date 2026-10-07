// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LayoutDashboard, Users } from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '../Sidebar'

vi.mock('@/context/TenantContext', () => ({
  useTenant: () => ({ tenant: null }),
}))

const NAV_ITEMS: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users',     label: 'Users',     icon: Users },
]

function renderSidebar(collapsed = false) {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Sidebar basePath="/admin" navItems={NAV_ITEMS} collapsed={collapsed} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders logo', () => {
    renderSidebar()
    expect(screen.getByAltText('LMS')).toBeInTheDocument()
  })

  it('renders nav items as links', () => {
    renderSidebar()
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('renders collapsed state with narrow width', () => {
    const { container } = renderSidebar(true)
    expect(container.querySelector('aside')?.className).toContain('w-[72px]')
  })

  it('renders expanded state with wide width', () => {
    const { container } = renderSidebar(false)
    expect(container.querySelector('aside')?.className).toContain('w-64')
  })

  it('renders disabled item as span, not link', () => {
    const disabledItems: SidebarNavItem[] = [
      { to: '/locked', label: 'Locked', icon: LayoutDashboard, disabled: true },
    ]
    const { container } = render(
      <MemoryRouter>
        <Sidebar basePath="/admin" navItems={disabledItems} collapsed={false} />
      </MemoryRouter>
    )
    expect(container.querySelector('a[href="/admin/locked"]')).toBeNull()
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('renders settings section when settingsItems provided', () => {
    const settingsItems: SidebarNavItem[] = [
      { to: '/profile', label: 'Profile', icon: Users },
    ]
    render(
      <MemoryRouter>
        <Sidebar basePath="/admin" navItems={NAV_ITEMS} settingsItems={settingsItems} settingsLabel="Account" collapsed={false} />
      </MemoryRouter>
    )
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })
})
