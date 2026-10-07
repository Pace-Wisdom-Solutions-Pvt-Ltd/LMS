// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import InstituteAdminSidebar from '@/features/institute-admin/layout/InstituteAdminSidebar'
import { getInstituteAdminTitle } from '@/features/institute-admin/nav'
import Header from '@/components/layout/Header'

export default function InstituteAdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const title = getInstituteAdminTitle(pathname)

  return (
    <div className="h-screen overflow-hidden flex bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 relative">
      {!collapsed && (
        <div
          aria-hidden
          onClick={() => setCollapsed(true)}
          className="max-md:fixed max-md:inset-0 max-md:bg-black/50 max-md:z-40 md:hidden"
        />
      )}
      <InstituteAdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full">
        <Header
          title={title}
          onToggleSidebar={() => setCollapsed(!collapsed)}
        />
        <main className="flex-1 min-h-0 overflow-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
