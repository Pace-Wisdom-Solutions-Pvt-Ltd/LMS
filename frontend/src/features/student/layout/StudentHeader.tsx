// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Menu, Search, UsersRound, Building2 } from 'lucide-react'
import { getStoredUser, clearStoredUser } from '@/lib/auth'
import { toTitleCase } from '@/lib/format'
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher'

interface StudentHeaderProps {
  onToggleSidebar?: () => void
}

export default function StudentHeader({ onToggleSidebar }: Readonly<StudentHeaderProps>) {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showSwitchToStaff, switchToStaff, staffRole, staffRoleLabel } = useRoleSwitcher()

  const handleLogout = () => {
    clearStoredUser()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return
      setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  if (!user) return null

  return (
    <header className="h-14 shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 flex items-center gap-4 px-5 shadow-sm">
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
      )}

      <div className="flex-1 flex items-center max-w-2xl">
        <div className="relative w-full">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search All... #course, #program, #News, #Events"
            className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none text-sm bg-slate-50/50 transition-all duration-200 placeholder:text-slate-400"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <div className="relative" ref={triggerRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            <div className="h-9 w-9 rounded-full bg-brand-blue flex items-center justify-center text-white shadow-md shadow-brand-blue/20">
              <span className="text-sm font-semibold">{(user.name ?? user.email)[0].toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">
              {toTitleCase(user.name ?? 'User')}
            </span>
          </button>
          {dropdownOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className="fixed right-5 top-14.5 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-9999 animate-slide-down"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {toTitleCase(user.name ?? 'User')}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full ring-1 ring-brand-teal/20 uppercase tracking-wider">
                    Student
                  </span>
                </div>
                {showSwitchToStaff && (
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); switchToStaff() }}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-teal hover:bg-brand-teal/5 transition-colors flex items-center gap-2 font-medium"
                  >
                    {staffRole === 'institute_admin' ? <Building2 className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}
                    Switch to {staffRoleLabel} View
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>,
              document.body
            )}
        </div>
      </div>
    </header>
  )
}
