// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  Home, BookOpen, TrendingUp, MessageSquare, User,
} from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/components/layout/Sidebar'

const NAV_ITEMS: SidebarNavItem[] = [
  { to: '/home',        label: 'Dashboard',              icon: Home },
  { to: '/my-courses',  label: 'My Courses',             icon: BookOpen },
  { to: '/progress',    label: 'Progress',                icon: TrendingUp },
  { to: '/engage',      label: 'Interaction & Support',  icon: MessageSquare, disabled: true },
  { to: '/profile',     label: 'Profile',                icon: User },
]

interface StudentSidebarProps {
  readonly collapsed: boolean
  readonly onToggle?: () => void
}

export default function StudentSidebar({ collapsed, onToggle }: StudentSidebarProps) {
  return <Sidebar basePath="/student" navItems={NAV_ITEMS} collapsed={collapsed} onToggle={onToggle} />
}
