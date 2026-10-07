// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import StudentSidebar from '@/features/student/layout/StudentSidebar'
import StudentHeader from '@/features/student/layout/StudentHeader'

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="h-screen overflow-hidden flex bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 relative">
      {!collapsed && (
        <div
          aria-hidden
          onClick={() => setCollapsed(true)}
          className="max-md:fixed max-md:inset-0 max-md:bg-black/50 max-md:z-40 md:hidden"
        />
      )}
      <StudentSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full">
        <StudentHeader
          onToggleSidebar={() => setCollapsed(!collapsed)}
        />
        <main className="flex-1 min-h-0 overflow-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
