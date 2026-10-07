// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import BackButton from '@/components/ui/BackButton'
import TablePagination from '@/components/ui/TablePagination'
import { toTitleCase } from '@/lib/format'
import {
  GitBranch,
  GraduationCap,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Search,
  Upload,
} from 'lucide-react'
import BulkUploadBatchStudentsModal from './BulkUploadBatchStudentsModal'
import {
  getBatchByIdApi,
  getStudentsApi,
  addStudentApi,
  removeStudentApi,
  updateStudentApi,
} from '@/lib/api/organizations'
import type { ApiBatch, ApiStudent } from '@/lib/api/organizations'
import { getStoredOrganizations } from '@/lib/auth'
import { showToast } from '@/lib/toastApi'
import { newId } from '@/lib/ids'
import { useSortable } from '@/hooks/useSortable'
import SortableHeader from '@/components/ui/SortableHeader'

export default function BatchDetail() {
  const { orgId: paramOrgId, batchId } = useParams<{ orgId?: string; batchId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Super-admin reaches this page with an :orgId route param; org-admin mounts it
  // without one, so fall back to the acting org resolved from the session.
  const sessionOrgId = getStoredOrganizations()[0]?.id
  const orgId = paramOrgId ?? (sessionOrgId != null ? String(sessionOrgId) : undefined)

  const isOrgAdmin = location.pathname.startsWith('/org-admin')

  const PAGE_SIZE = 20
  const [batch, setBatch] = useState<ApiBatch | null>(null)
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApiStudent | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!orgId || !batchId) return
    getBatchByIdApi(orgId, batchId)
      .then(setBatch)
      .catch(() => {
        // In mock/offline mode, just fall back to a placeholder batch so students view still works.
        setBatch((prev) => prev ?? ({ id: batchId, name: `Batch ${batchId}`, is_active: true } as ApiBatch))
      })
      .finally(() => setLoading(false))
  }, [orgId, batchId])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current)
    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(value)
      setPage(1)
    }, 400)
  }

  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (!orgId || !batchId) return
    setLoadingStudents(true)
    getStudentsApi(orgId, batchId, page, debouncedSearchQuery || undefined)
      .then(result => { setStudents(result.results); setTotalCount(result.count) })
      .catch(() => { setStudents([]); setTotalCount(0) })
      .finally(() => setLoadingStudents(false))
  }, [orgId, batchId, page, debouncedSearchQuery, fetchKey])

  const fetchStudents = () => setFetchKey(k => k + 1)

  const handleToggleActive = async (s: ApiStudent) => {
    if (!orgId || !batchId) return
    const id = String(s.id)
    setTogglingIds(prev => new Set(prev).add(id))
    try {
      await updateStudentApi(orgId, batchId, getStudentApiId(s), { is_active: !s.is_active })
      setStudents(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x))
    } catch {
      showToast('Failed to update status.', 'error')
    } finally {
      setTogglingIds(prev => { const s2 = new Set(prev); s2.delete(id); return s2 })
    }
  }

  const { sorted: sortedStudents, sortKey, sortDir, handleSort } = useSortable(students)

  const getStudentName = (s: ApiStudent) => {
    const d = s.student_detail
    const name = d
      ? [d.first_name, d.last_name].filter(Boolean).join(' ')
      : [s.first_name, s.last_name].filter(Boolean).join(' ')
    return toTitleCase(name || (d?.email ?? s.email) || String(s.student ?? s.user ?? s.id))
  }

  const getStudentEmail = (s: ApiStudent) => s.student_detail?.email ?? s.email

  // The API expects the student's UUID (`student_id`/`student`) in this URL segment,
  // not the batch-enrollment row id (`id`) — the two only coincide by accident in some responses.
  const getStudentApiId = (s: ApiStudent) => String(s.student_id ?? s.student ?? s.id)

  const handleRemove = async () => {
    if (!deleteId || !orgId || !batchId) return
    setDeleting(true)
    try {
      await removeStudentApi(orgId, batchId, deleteId)
      showToast('Student removed.', 'success')
      fetchStudents()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove student.', 'error')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleSaveEdit = async (payload: {
    email: string
    first_name: string
    last_name: string
    phone_number?: string
    student_id?: string
    batch_id?: number
    is_active: boolean
  }) => {
    if (!orgId || !batchId || !editTarget) return
    try {
      await updateStudentApi(orgId, batchId, getStudentApiId(editTarget), payload)
      showToast('Student updated.', 'success')
      setEditTarget(null)
      fetchStudents()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update student.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton
          label={isOrgAdmin ? 'Back to Batches' : 'Back to Organization'}
          onClick={() => navigate(isOrgAdmin ? '/org-admin/batches' : `/super-admin/organizations/${orgId}`)}
        />
        <div className="flex items-center gap-3 flex-1">
          <div className="h-12 w-12 rounded-xl bg-brand-teal/10 flex items-center justify-center">
            <GitBranch className="h-6 w-6 text-brand-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{batch?.name ?? 'Batch'}</h2>
            {(batch?.start_date || batch?.end_date) && <p className="text-sm text-slate-500">{batch?.start_date ?? '—'} → {batch?.end_date ?? '—'}</p>}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2 shrink-0">
          <GraduationCap className="h-5 w-5 text-brand-teal" />
          Students
          {totalCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">{totalCount}</span>
          )}
        </h3>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm bg-white"
          />
        </div>

        <button
          onClick={() => setBulkOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-all active:scale-[0.98] shrink-0"
        >
          <Upload className="h-4 w-4" /> Bulk Upload
        </button>

        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-teal text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-brand-teal/30 hover:opacity-90 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Student
        </button>
      </div>

      {/* ── Student List ── */}
      {loadingStudents && (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
          <p className="text-slate-400 mt-3 text-sm">Loading students…</p>
        </div>
      )}

      {!loadingStudents && totalCount === 0 && !debouncedSearchQuery && (
        <div className="py-20 text-center rounded-3xl border-2 border-slate-200 bg-white/60 shadow-sm flex flex-col items-center justify-center">
          <div className="h-16 w-16 bg-brand-teal/10 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-brand-teal" />
          </div>
          <p className="text-slate-500 font-medium mb-6">No students in this batch yet</p>
          <button
            onClick={() => setAddOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg hover:shadow-brand-teal/30 hover:opacity-90 transition-all active:scale-[0.98]"
          >
            Add your first student
          </button>
        </div>
      )}

      {!loadingStudents && students.length === 0 && debouncedSearchQuery && (
        <div className="py-16 text-center rounded-2xl border border-slate-200 bg-white">
          <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No students match "{searchQuery}"</p>
        </div>
      )}

      {!loadingStudents && students.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <SortableHeader label="Name" sortKey="id" activeSortKey={sortKey as string | null} sortDir={sortDir} onSort={handleSort as (k: string) => void} className="text-xs font-semibold text-slate-500 uppercase" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <SortableHeader label="Status" sortKey="is_active" activeSortKey={sortKey as string | null} sortDir={sortDir} onSort={handleSort as (k: string) => void} className="text-xs font-semibold text-slate-500 uppercase" />
                  <SortableHeader label="Enrolled" sortKey="enrolled_at" activeSortKey={sortKey as string | null} sortDir={sortDir} onSort={handleSort as (k: string) => void} className="text-xs font-semibold text-slate-500 uppercase" />
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                  {sortedStudents.map((s) => (
                    <tr key={String(s.id)} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{getStudentName(s)}</td>
                      <td className="py-3 px-4 text-slate-500 text-sm">{getStudentEmail(s) ?? '—'}</td>
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => handleToggleActive(s)} disabled={togglingIds.has(String(s.id))} className={`flex items-center gap-2 ${togglingIds.has(String(s.id)) ? 'opacity-50' : ''}`}>
                          <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${s.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ml-0.5 ${s.is_active !== false ? 'translate-x-4' : 'translate-x-0'}`} /></span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${s.is_active !== false ? 'text-emerald-600' : 'text-slate-400'}`}>{togglingIds.has(String(s.id)) ? '…' : s.is_active !== false ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm whitespace-nowrap">
                        {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditTarget(s)}
                            className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(getStudentApiId(s))}
                            className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TablePagination total={totalCount} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* ── Add Student Modal ── */}
      {addOpen && orgId && batchId && (
        <AddStudentModal
          orgId={orgId}
          batchId={batchId}
          onClose={() => setAddOpen(false)}
          onDone={() => { setAddOpen(false); fetchStudents() }}
        />
      )}

      {/* ── Bulk Upload Modal ── */}
      {orgId && batchId && (
        <BulkUploadBatchStudentsModal
          open={bulkOpen}
          orgId={orgId}
          batchId={batchId}
          onClose={() => setBulkOpen(false)}
          onUploaded={() => { setPage(1); fetchStudents() }}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <DeleteConfirm
          deleting={deleting}
          onConfirm={handleRemove}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {editTarget && (
        <EditStudentModal
          student={editTarget}
          batchId={batchId!}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

function EditStudentModal({
  student,
  batchId,
  onClose,
  onSave,
}: {
  student: ApiStudent
  batchId: string
  onClose: () => void
  onSave: (payload: {
    email: string
    first_name: string
    last_name: string
    phone_number?: string
    student_id?: string
    batch_id?: number
    is_active: boolean
  }) => void
}) {
  const [email, setEmail] = useState(student.student_detail?.email ?? student.email ?? '')
  const [firstName, setFirstName] = useState(student.student_detail?.first_name ?? student.first_name ?? '')
  const [lastName, setLastName] = useState(student.student_detail?.last_name ?? student.last_name ?? '')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [studentId, setStudentId] = useState('')
  const [isActive, setIsActive] = useState(student.is_active !== false)
  const [saving, setSaving] = useState(false)

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:ring-[3px] focus:ring-brand-teal/15 focus:border-brand-teal outline-none transition-all placeholder:text-slate-400 text-[13px] font-medium text-slate-700 shadow-sm'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 200))
    setSaving(false)
    onSave({
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber.trim() || undefined,
      student_id: studentId.trim() || undefined,
      batch_id: Number(batchId),
      is_active: isActive,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-brand-teal px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-[16px]">Edit Student</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="batch-phone" className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                id="batch-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="batch-student-id" className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Student ID
              </label>
              <input
                id="batch-student-id"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. ST001"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active</label>
            <button type="button" onClick={() => setIsActive((p) => !p)} className="flex items-center">
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-teal text-white text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Add Student Modal ── */

interface StudentEntry {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  studentId: string
}

function AddStudentModal({
  orgId,
  batchId,
  onClose,
  onDone,
}: {
  orgId: string
  batchId: string
  onClose: () => void
  onDone: () => void
}) {
  const [entries, setEntries] = useState<StudentEntry[]>([
    { id: `se-${Date.now()}`, email: '', firstName: '', lastName: '', phoneNumber: '', studentId: '' },
  ])
  const [saving, setSaving] = useState(false)

  const update = (i: number, field: keyof StudentEntry, value: string) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))
  }

  const addRow = () =>
    setEntries((prev) => [
      ...prev,
      {
        id: newId('se'),
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        studentId: '',
      },
    ])

  const removeRow = (i: number) => {
    if (entries.length <= 1) return
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    const valid = entries.filter((s) => s.email.trim())
    if (valid.length === 0) return
    setSaving(true)
    try {
      await addStudentApi(
        orgId,
        {
          students: valid.map((s) => ({
            email: s.email.trim(),
            first_name: s.firstName.trim(),
            last_name: s.lastName.trim(),
            phone_number: s.phoneNumber.trim() || undefined,
            student_id: s.studentId.trim() || undefined,
          })),
        },
        batchId,
      )
      showToast(`${valid.length} student${valid.length > 1 ? 's' : ''} added!`, 'success')
      onDone()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add student(s).', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:ring-[3px] focus:ring-brand-teal/15 focus:border-brand-teal outline-none transition-all placeholder:text-slate-400 text-[13px] font-medium text-slate-700 shadow-sm'

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
        <div className="bg-brand-teal px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold text-[16px]">Add Students</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {entries.map((entry, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 relative">
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student {entries.length > 1 ? i + 1 : ''}</p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={entry.email}
                  onChange={(e) => update(i, 'email', e.target.value)}
                  placeholder="student@example.com"
                  className={inputClass}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">First Name</label>
                  <input
                    value={entry.firstName}
                    onChange={(e) => update(i, 'firstName', e.target.value)}
                    placeholder="John"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Last Name</label>
                  <input
                    value={entry.lastName}
                    onChange={(e) => update(i, 'lastName', e.target.value)}
                    placeholder="Doe"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`batch-entry-phone-${entry.id}`}
                    className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide"
                  >
                    Phone Number
                  </label>
                  <input
                    id={`batch-entry-phone-${entry.id}`}
                    value={entry.phoneNumber}
                    onChange={(e) => update(i, 'phoneNumber', e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`batch-entry-student-${entry.id}`}
                    className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide"
                  >
                    Student ID
                  </label>
                  <input
                    id={`batch-entry-student-${entry.id}`}
                    value={entry.studentId}
                    onChange={(e) => update(i, 'studentId', e.target.value)}
                    placeholder="e.g. ST001"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-[13px] font-semibold hover:border-brand-teal/50 hover:text-brand-teal transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Another Student
          </button>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-teal text-white text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Adding…' : `Add ${entries.length > 1 ? `${entries.length} Students` : 'Student'}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Delete Confirmation ── */

function DeleteConfirm({
  deleting,
  onConfirm,
  onCancel,
}: {
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-[340px] w-full text-center animate-fade-in">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <Trash2 className="h-6 w-6 text-red-500" />
        </div>
        <h4 className="text-[16px] font-bold text-slate-800 mb-1">Remove Student</h4>
        <p className="text-[13px] text-slate-500 mb-5">
          Are you sure?<br /><span className="text-red-500 font-medium">This action cannot be undone.</span>
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition-colors disabled:opacity-60">
            {deleting ? 'Removing…' : 'Yes, Remove'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
