// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { GraduationCap, UserCog, Users } from 'lucide-react'
import type { ElementType } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import TrainersTab from './trainers/TrainersTab'
import StudentsTab from './students/StudentsTab'

type TabKey = 'trainers' | 'students'

const TABS: { key: TabKey; label: string; icon: ElementType }[] = [
  { key: 'trainers', label: 'Trainers', icon: UserCog },
  { key: 'students', label: 'Students', icon: GraduationCap },
]

/**
 * Unified "Manage Users" screen for the org admin: a tabbed shell over the
 * Trainers and Students management surfaces. The active tab is
 * reflected in the `?tab=` query param so it can be linked to and survives reloads.
 */
export default function ManageUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: TabKey = tabParam === 'students' ? tabParam : 'trainers'

  const selectTab = (key: TabKey) => {
    setSearchParams(key === 'trainers' ? {} : { tab: key }, { replace: true })
  }

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-brand-teal/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manage Users</h1>
          <p className="text-sm text-slate-500">Trainers &amp; students in your organization</p>
        </div>
      </div>

      <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectTab(key)}
              aria-pressed={active}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          )
        })}
      </div>

      <PageCard title="">
        {activeTab === 'trainers' && <TrainersTab />}
        {activeTab === 'students' && <StudentsTab />}
      </PageCard>
    </div>
  )
}
