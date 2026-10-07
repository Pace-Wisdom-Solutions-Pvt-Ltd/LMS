// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import PageCard from '@/components/ui/PageCard'

export default function AccountSettings() {
  return (
    <PageCard title="Account Settings">
      <div className="space-y-4 max-w-md lg:max-w-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full px-4 py-2 rounded-lg border border-slate-300"
            defaultValue="user@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-slate-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-slate-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-slate-300"
          />
        </div>
        <button className="px-4 py-2 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90">
          Save changes
        </button>
      </div>
    </PageCard>
  )
}
