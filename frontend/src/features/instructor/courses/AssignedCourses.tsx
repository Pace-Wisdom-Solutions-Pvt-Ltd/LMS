// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExpandableText from '@/components/ui/ExpandableText'
import PageCard from '@/components/ui/PageCard'
import { getStoredOrganizations } from '@/lib/auth'
import { getPublishedCoursesApi, type ApiCourse } from '@/lib/api/organizations'
import { showToast } from '@/lib/toastApi'

export default function AssignedCourses() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [courses, setCourses] = useState<ApiCourse[]>([])
  // Org id whose request last settled; loading until it matches the current org.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])
  const loading = Boolean(orgId) && loadedFor !== orgId

  useEffect(() => {
    if (!orgId) return
    getPublishedCoursesApi(orgId)
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load courses.', 'error'))
      .finally(() => setLoadedFor(orgId))
  }, [orgId])

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase().trim()),
  )

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Assigned Courses</h1>
        <p className="text-slate-600 mt-1">View courses assigned to you. Use Manage to configure levels, programs, and content.</p>
      </div>

      <PageCard title="Courses">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-sm text-slate-600">
            These are the main courses. Click Manage to configure levels and programs.
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course..."
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Course Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                    Loading courses…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                    No courses found.
                  </td>
                </tr>
              )}
              {!loading && filtered.length > 0 && (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium text-slate-800">{c.title}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {c.description ? (
                        <ExpandableText text={c.description} maxLength={200} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/trainer/courses/${c.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-brand-teal/30 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-all cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageCard>
    </div>
  )
}
