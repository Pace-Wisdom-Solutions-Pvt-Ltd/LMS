// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import PageCard from '@/components/ui/PageCard'

const MOCK_PROGRAMS = [
  { id: 1, name: 'Program A', summary: 'Introduction to program A' },
  { id: 2, name: 'Program B', summary: 'Advanced program B' },
]

export default function InstituteAdminHome() {
  return (
    <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Phases</h1>
        <p className="text-slate-600 mt-1">Manage and organize your phases.</p>
      </div>
      <PageCard title="">
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Search phases..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition placeholder:text-slate-400"
          />
          <button className="px-6 py-2.5 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg hover:shadow-brand-teal/25 transition-all active:scale-[0.98] shrink-0">
            Add Phase
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left py-4 px-4 font-semibold text-slate-700">ID</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Phase Name</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Summary</th>
                <th className="text-left py-4 px-4 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PROGRAMS.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 text-slate-600">{p.id}</td>
                  <td className="py-4 px-4 font-medium text-slate-800">{p.name}</td>
                  <td className="py-4 px-4 text-slate-600">{p.summary}</td>
                  <td className="py-4 px-4">
                    <button className="text-brand-teal hover:text-brand-green font-medium mr-3 transition-colors">
                      Update
                    </button>
                    <button className="text-brand-teal hover:text-brand-green font-medium mr-3 transition-colors">
                      Add Student
                    </button>
                    <button className="text-red-600 hover:text-red-700 font-medium transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </div>
  )
}
