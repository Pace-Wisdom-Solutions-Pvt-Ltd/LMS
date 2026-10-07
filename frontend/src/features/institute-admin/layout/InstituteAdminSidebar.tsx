// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  LayoutDashboard, GraduationCap, Users, GitBranch,
  BarChart3, BookOpen, History, User, Settings,
  ClipboardCheck,
} from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/components/layout/Sidebar'

const MAIN_NAV: SidebarNavItem[] = [
  { to: '/home',                 label: 'Dashboard',                    icon: LayoutDashboard },
  { to: '/batches',              label: 'Batches',                      icon: GitBranch },
  { to: '/users',                label: 'Manage Users',                 icon: Users },
  { to: '/content',              label: 'Courses & Content',            icon: BookOpen },
  { to: '/course-progress',      label: 'Course Progress & Review',     icon: ClipboardCheck },
  { to: '/academic-setup',       label: 'Training Structure',           icon: GraduationCap, disabled: true },
  { to: '/reporting',            label: 'Reporting',                    icon: BarChart3,     disabled: true },
  { to: '/audit-logs',           label: 'Audit Logs',                   icon: History,       disabled: true },
]

const SETTINGS_NAV: SidebarNavItem[] = [
  { to: '/profile',           label: 'Profile',           icon: User },
  { to: '/account-settings',  label: 'Account Settings',  icon: Settings, disabled: true },
]

interface InstituteAdminSidebarProps {
  readonly collapsed: boolean
  readonly onToggle?: () => void
}

export default function InstituteAdminSidebar({ collapsed, onToggle }: InstituteAdminSidebarProps) {
  return (
    <Sidebar
      basePath="/org-admin"
      navItems={MAIN_NAV}
      settingsItems={SETTINGS_NAV}
      settingsLabel="Account"
      collapsed={collapsed}
      onToggle={onToggle}
    />
  )
}
