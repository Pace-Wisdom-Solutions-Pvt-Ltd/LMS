// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  Home, User, BookOpen,
  Users, MessageSquare, BarChart3,
} from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/components/layout/Sidebar'

const NAV_ITEMS: SidebarNavItem[] = [
  { to: '/home',           label: 'Dashboard',          icon: Home },
  { to: '/courses',        label: 'Assigned Courses',   icon: BookOpen },
  { to: '/learners',       label: 'Student Progress',   icon: Users },
  { to: '/engage',         label: 'Engage / Discussion',icon: MessageSquare, disabled: true },
  { to: '/reports',        label: 'Reports',            icon: BarChart3,     disabled: true },
  { to: '/profile',        label: 'Profile',            icon: User },
]

export default function InstructorSidebar({ collapsed, onToggle }: Readonly<{ collapsed: boolean; onToggle?: () => void }>) {
  return <Sidebar basePath="/trainer" navItems={NAV_ITEMS} collapsed={collapsed} onToggle={onToggle} />
}
