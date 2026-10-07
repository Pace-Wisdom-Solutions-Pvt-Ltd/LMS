// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { Users, GraduationCap, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getStoredOrganizations } from '@/lib/auth'
import OrganizationAnalytics from './analytics/OrganizationAnalytics'

export default function InstituteAdminDashboard() {
  const navigate = useNavigate()

  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Organization Dashboard</h1>
        <p className="text-slate-600 mt-1">Snapshot of organization training performance</p>
      </div>

      {/* Select Primary Task */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Select primary task</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Manage Users', sub: 'Trainers & Students', path: '/org-admin/users', icon: Users },
            { label: 'Courses & Content', sub: 'Course listing, content library', path: '/org-admin/content', icon: GraduationCap },
          ].map(({ label, sub, path, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{label}</p>
                <p className="text-sm text-slate-500">{sub}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* Detailed analytics — status breakdowns and distribution charts */}
      {orgId && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3">Analytics</h3>
          <OrganizationAnalytics orgId={orgId} />
        </div>
      )}
    </div>
  )
}
