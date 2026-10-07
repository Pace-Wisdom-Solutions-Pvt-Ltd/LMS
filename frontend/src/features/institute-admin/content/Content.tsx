// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import { PlusCircle, Archive, ArchiveRestore } from 'lucide-react'
import { getStoredOrganizations } from '@/lib/auth'
import { getCoursesPaginatedApi, deleteCourseApi, updateCourseApi, type ApiCourse } from '@/lib/api/organizations'
import { showToast } from '@/lib/toastApi'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { useSortable } from '@/hooks/useSortable'
import SortableHeader from '@/components/ui/SortableHeader'
import Dropdown from '@/components/ui/Dropdown'
import TablePagination from '@/components/ui/TablePagination'

export default function InstituteAdminContent() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<ApiCourse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<ApiCourse | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PAGE_SIZE = 20

  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])

  const { sorted: sortedCourses, sortKey, sortDir, handleSort } = useSortable(courses)
  const orderingPrefix = sortDir === 'desc' ? '-' : ''
  const ordering = sortKey ? `${orderingPrefix}${String(sortKey)}` : undefined

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 400)
  }

  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, showArchived, ordering])

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const apiStatus = showArchived ? 'Archived' : (statusFilter || undefined)
    getCoursesPaginatedApi(orgId, page, debouncedSearch || undefined, ordering, apiStatus)
      .then((data) => {
        const filtered = showArchived
          ? data.results
          : data.results.filter((c) => c.status !== 'Archived')
        setCourses(filtered)
        setTotal(data.count)
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load courses.', 'error'))
      .finally(() => setLoading(false))
  }, [orgId, page, debouncedSearch, ordering, statusFilter, showArchived])

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Courses & Content</h1>
          <p className="text-slate-600 mt-1">Main courses only. Use Manage to configure levels, programs, and content.</p>
        </div>
        <button
          onClick={() => navigate('/org-admin/content/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg transition-all shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          Create Course
        </button>
      </div>

      <PageCard title={showArchived ? 'Archived Courses' : 'Courses'}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search course..."
            className="flex-1 min-w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
          />
          <div className="flex items-center gap-3 ml-auto shrink-0">
          {!showArchived && (
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All Active' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Published', label: 'Published' },
              ]}
            />
          )}
          <button
            type="button"
            onClick={() => { setShowArchived((v) => !v); setStatusFilter('') }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              showArchived
                ? 'bg-slate-700 border-slate-700 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Viewing Archived' : 'Archived'}
          </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <SortableHeader label="Course Name" sortKey="title" activeSortKey={sortKey as string | null} sortDir={sortDir} onSort={handleSort as (k: string) => void} />
                <SortableHeader label="Status" sortKey="status" activeSortKey={sortKey as string | null} sortDir={sortDir} onSort={handleSort as (k: string) => void} />
                <SortableHeader label="Created" sortKey="created_at" activeSortKey={sortKey as string | null} sortDir={sortDir} onSort={handleSort as (k: string) => void} />
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
                    Loading courses…
                  </td>
                </tr>
              )}
              {!loading && courses.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
                    No courses found.
                  </td>
                </tr>
              )}
              {!loading && courses.length > 0 && (
                sortedCourses.map((c) => {
                  const isArchived = c.status === 'Archived'
                  return (
                    <tr key={c.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 ${isArchived ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isArchived && <Archive className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <div>
                            <p className={`font-medium ${isArchived ? 'text-slate-500' : 'text-slate-800'}`}>{c.title}</p>
                            {c.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.status === 'Archived'
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.status ?? '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {!isArchived && (
                            <button
                              type="button"
                              onClick={() => navigate(`/org-admin/content/${c.id}`)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-brand-teal/30 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-all cursor-pointer"
                            >
                              Manage
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setArchiveTarget(c)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isArchived
                                ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {isArchived ? <><ArchiveRestore className="w-3 h-3" /> Restore</> : <><Archive className="w-3 h-3" /> Archive</>}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCourseToDelete(c); setIsDeleteModalOpen(true) }}
                            className="px-3 py-1.5 rounded-lg border border-red-100/60 bg-red-50/50 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-100 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </PageCard>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setCourseToDelete(null) }}
        onConfirm={async () => {
          if (!courseToDelete) return
          setIsDeleting(true)
          try {
            await deleteCourseApi(orgId, courseToDelete.id)
            showToast('Course deleted successfully', 'success')
            const data = await getCoursesPaginatedApi(orgId, page, debouncedSearch || undefined, ordering, statusFilter || undefined)
            setCourses(data.results)
            setTotal(data.count)
            setIsDeleteModalOpen(false)
            setCourseToDelete(null)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete course.', 'error')
          } finally {
            setIsDeleting(false)
          }
        }}
        isLoading={isDeleting}
        title="Delete Course"
        message={
          <>Are you sure you want to delete <span className="font-semibold text-slate-900">"{courseToDelete?.title}"</span>? This action cannot be undone.</>
        }
        confirmText="Delete Course"
        type="danger"
      />

      <ConfirmationModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return
          setIsArchiving(true)
          const isRestoring = archiveTarget.status === 'Archived'
          try {
            await updateCourseApi(orgId, archiveTarget.id, { status: isRestoring ? 'Draft' : 'Archived' })
            showToast(`Course ${isRestoring ? 'restored to Draft' : 'archived'} successfully`, 'success')
            const data = await getCoursesPaginatedApi(orgId, page, debouncedSearch || undefined, ordering, statusFilter || undefined)
            setCourses(data.results)
            setTotal(data.count)
            setArchiveTarget(null)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update course.', 'error')
          } finally {
            setIsArchiving(false)
          }
        }}
        isLoading={isArchiving}
        title={archiveTarget?.status === 'Archived' ? 'Restore Course' : 'Archive Course'}
        message={
          archiveTarget?.status === 'Archived'
            ? <>Restore <span className="font-semibold text-slate-900">"{archiveTarget?.title}"</span>? It will be moved back to Draft and become editable again.</>
            : <>Archive <span className="font-semibold text-slate-900">"{archiveTarget?.title}"</span>? Teachers and students will lose access. You can restore it later.</>
        }
        confirmText={archiveTarget?.status === 'Archived' ? 'Restore' : 'Archive'}
        type={archiveTarget?.status === 'Archived' ? 'info' : 'warning'}
      />
    </div>
  )
}
