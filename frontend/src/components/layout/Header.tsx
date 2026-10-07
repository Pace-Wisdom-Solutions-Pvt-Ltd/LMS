// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Menu, GraduationCap, UsersRound, Building2 } from 'lucide-react'
import { getStoredUser, clearStoredUser, setStoredUser, getStoredRefreshToken } from '@/lib/auth'
import { ROLE_PATHS } from '@/lib/constants'
import type { UserRole } from '@/lib/auth'
import { logoutApi } from '@/lib/api/auth'
import { toTitleCase } from '@/lib/format'

interface HeaderProps {
  title: string
  onToggleSidebar?: () => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  institute_admin: 'Organization Admin',
  trainer: 'Trainer',
  student: 'Student',
}

const ROLE_ICONS: Record<UserRole, ReactNode> = {
  institute_admin: <Building2 className="h-4 w-4" />,
  trainer: <UsersRound className="h-4 w-4" />,
  student: <GraduationCap className="h-4 w-4" />,
}

export default function Header({ title, onToggleSidebar }: Readonly<HeaderProps>) {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return
      setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleLogout = async () => {
    const refreshToken = getStoredRefreshToken()
    if (refreshToken) {
      try {
        await logoutApi(refreshToken)
      } catch {
        // server-side blacklist failed — still log out locally
      }
    }
    clearStoredUser()
    navigate('/login', { replace: true })
  }

  const switchRole = (role: UserRole) => {
    setDropdownOpen(false)
    if (user) {
      setStoredUser({ ...user, role })
      navigate(`${ROLE_PATHS[role]}/home`)
    }
  }

  const availableRoles =
    user?.roles?.filter((r) => r !== user.role && ROLE_PATHS[r]) ?? []

  if (!user) return null

  return (
    <header className="h-14 shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm flex items-center justify-between px-5">
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle menu"
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100"
        >
          <div className="h-9 w-9 rounded-full bg-brand-teal flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-brand-teal/20">
            {(user.name ?? user.email)[0].toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-800">{toTitleCase(user.name ?? user.email)}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
        </button>
        {dropdownOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className="fixed right-5 top-[58px] w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-[9999] animate-slide-down"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
              </div>
              {availableRoles.length > 0 && (
                <div className="py-2 border-b border-slate-100">
                  <p className="px-4 text-xs text-slate-500 mb-2">
                    Switch role
                  </p>
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchRole(role)}
                      className="w-full px-4 py-2 text-left text-sm text-brand-teal hover:bg-brand-teal/5 transition-colors flex items-center gap-2 font-medium"
                    >
                      {ROLE_ICONS[role]}
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 font-medium"
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

