// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import TablePagination from '@/components/ui/TablePagination'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { showToast } from '@/lib/toastApi'
import { getStoredOrganizations } from '@/lib/auth'
import { isValidEmail } from '@/lib/validation'
import {
  addStudentApi,
  deleteOrgStudentApi,
  getBatchesApi,
  getOrgStudentByIdApi,
  getOrgStudentsApi,
  getStudentByIdApi,
  getStudentsApi,
  removeStudentApi,
  updateOrgStudentApi,
  updateStudentApi,
} from '@/lib/api/organizations'
import { reinviteUserApi } from '@/lib/api/users'
import { useStoreRefresh } from '../../useStoreRefresh'
import ListToolbar from '../components/ListToolbar'
import StudentsTable from './StudentsTable'
import StudentFormModal from './StudentFormModal'
import StudentDetailsModal, { type StudentDetails } from './StudentDetailsModal'
import BulkUploadStudentsModal from './BulkUploadStudentsModal'
import { getCourseTitle, mapStudentsData } from './studentsMap'
import { EMPTY_STUDENT_FORM, type BatchOption, type StudentForm, type StudentRow } from './types'

const PAGE_SIZE = 20

/** Loads the org's batches (with their courses) and tracks the active batch filter. */
function useOrgMeta(orgId: string) {
  const [batches, setBatches] = useState<BatchOption[]>([])
  // Org id whose batch request last settled; loading until it matches orgId.
  const [metaLoadedFor, setMetaLoadedFor] = useState<string | null>(null)
  const metaLoading = Boolean(orgId) && metaLoadedFor !== orgId
  const [selectedBatchId, setSelectedBatchId] = useState('')

  useEffect(() => {
    if (!orgId) return
    getBatchesApi(orgId)
      .then((b) => {
        const mapped: BatchOption[] = (Array.isArray(b) ? b : []).map((x) => ({
          id: String(x.id),
          name: x.name,
          courses: (x.courses_detail ?? []).map((c) => ({ id: String(c.id), name: c.title })),
        }))
        setBatches(mapped)
        const firstBatch = mapped[0]?.id
        setSelectedBatchId((prev) => prev || (firstBatch ?? ''))
      })
      .catch(() => showToast('Failed to load batches.', 'error'))
      .finally(() => setMetaLoadedFor(orgId))
  }, [orgId])

  return { batches, metaLoading, selectedBatchId, setSelectedBatchId }
}

/** Loads the paginated student list for the current view mode / batch / search. */
function useStudentsList(opts: { orgId: string; viewMode: 'org' | 'batch'; selectedBatchId: string; page: number; search?: string }) {
  const { orgId, viewMode, selectedBatchId, page, search } = opts
  const [students, setStudents] = useState<StudentRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [fetchKey, setFetchKey] = useState(0)
  // Key of the request that last settled; loading until it matches the current inputs.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const canFetch = Boolean(orgId) && !(viewMode === 'batch' && !selectedBatchId)
  const requestKey = [orgId, viewMode, selectedBatchId, page, search ?? '', fetchKey].join('|')
  const studentsLoading = canFetch && loadedKey !== requestKey

  useEffect(() => {
    if (!canFetch) return
    const req = viewMode === 'org'
      ? getOrgStudentsApi(orgId, page, search || undefined)
      : getStudentsApi(orgId, selectedBatchId, page, search || undefined)
    req
      .then((data) => {
        setStudents(viewMode === 'org' ? mapStudentsData(data.results) : mapStudentsData(data.results, selectedBatchId))
        setTotalCount(data.count)
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Failed to load students.', 'error')
        setStudents([])
        setTotalCount(0)
      })
      .finally(() => setLoadedKey(requestKey))
  }, [canFetch, requestKey, orgId, viewMode, selectedBatchId, page, search])

  return { students, studentsLoading, fetchStudents: () => setFetchKey((k) => k + 1), totalCount }
}

export default function StudentsTab() {
  const refresh = useStoreRefresh()
  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])

  // Students are always listed org-wide; batch-scoped filtering was removed.
  const [viewMode] = useState<'org' | 'batch'>('org')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { batches, metaLoading, selectedBatchId, setSelectedBatchId } = useOrgMeta(orgId)
  const { students, studentsLoading, fetchStudents, totalCount } = useStudentsList({ orgId, viewMode, selectedBatchId, page, search: debouncedSearch })

  // Create / edit form
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT_FORM)
  const [editLoading, setEditLoading] = useState(false)

  // Bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Details drawer
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<StudentDetails | null>(null)
  const [detailReinviting, setDetailReinviting] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current)
    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }

  const openCreate = () => {
    setEditingStudentId(null)
    setForm(EMPTY_STUDENT_FORM)
    setShowFormModal(true)
  }

  const closeForm = () => {
    setShowFormModal(false)
    setEditingStudentId(null)
  }

  const buildStudentPayload = (batchId: string) => {
    const batchNum = Number(form.batchIds[0] || batchId || selectedBatchId)
    const batchNums = form.batchIds.map(Number).filter((n) => !Number.isNaN(n))
    return {
      batchNum,
      payload: {
        email: form.email.trim().toLowerCase(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone_number: form.phone.trim() || undefined,
        student_id: form.studentId.trim() || undefined,
        batch_ids: batchNums.length > 0 ? batchNums : undefined,
        course_id: form.courseIds.length > 0 ? Number(form.courseIds[0]) : undefined,
      },
    }
  }

  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      showToast('First name, last name, and email are required.', 'warning')
      return
    }
    if (!isValidEmail(form.email)) {
      showToast('Please enter a valid email address.', 'warning')
      return
    }
    if (!orgId) {
      showToast('No organization found for this user.', 'error')
      return
    }
    const targetBatchId = form.batchIds[0] || selectedBatchId
    if (!targetBatchId) {
      showToast('Please select a batch.', 'warning')
      return
    }

    const { batchNum, payload } = buildStudentPayload(targetBatchId)
    try {
      if (editingStudentId) {
        const updatePayload = { ...payload, is_active: form.isActive }
        if (viewMode === 'org') await updateOrgStudentApi(orgId, editingStudentId, updatePayload)
        else await updateStudentApi(orgId, String(batchNum), editingStudentId, updatePayload)
        showToast('Student updated.', 'success')
      } else {
        await addStudentApi(orgId, { students: [payload] })
        showToast('Student created.', 'success')
      }
      closeForm()
      setForm(EMPTY_STUDENT_FORM)
      if (viewMode === 'batch') setSelectedBatchId(String(batchNum))
      await fetchStudents()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Request failed.', 'error')
      return
    }
    refresh()
  }

  const openEdit = async (s: StudentRow) => {
    if (!orgId) return
    const studentUuid = s.studentUuid || s.id
    setEditingStudentId(studentUuid)
    setShowFormModal(true)
    setEditLoading(true)
    try {
      const full = viewMode === 'org'
        ? await getOrgStudentByIdApi(orgId, studentUuid)
        : await getStudentByIdApi(orgId, selectedBatchId, studentUuid)
      const d = full.student_detail
      const courseIdStr = String(full.course ?? s.courseId ?? '')
      setForm({
        firstName: (d?.first_name ?? full.first_name ?? s.firstName) || '',
        lastName: (d?.last_name ?? full.last_name ?? s.lastName) || '',
        email: (d?.email ?? full.email ?? s.email) || '',
        phone: (d?.phone_number ?? full.phone_number ?? s.phone ?? '') || '',
        batchIds: full.batch_ids ? full.batch_ids.map(String) : (full.batch != null ? [String(full.batch)] : s.batchIds.length ? s.batchIds : selectedBatchId ? [selectedBatchId] : []),
        studentId: (d?.student_id ?? full.student_id ?? s.studentId ?? '') || '',
        courseIds: courseIdStr ? [courseIdStr] : [],
        isActive: full.is_active !== false,
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load student.', 'error')
    } finally {
      setEditLoading(false)
    }
  }

  const openDetails = async (s: StudentRow) => {
    if (!orgId) return
    const studentUuid = s.studentUuid || s.id
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetails(null)
    try {
      const full = viewMode === 'org'
        ? await getOrgStudentByIdApi(orgId, studentUuid)
        : await getStudentByIdApi(orgId, selectedBatchId, studentUuid)
      const d = full.student_detail
      const firstName = (d?.first_name ?? full.first_name ?? s.firstName) || ''
      const lastName = (d?.last_name ?? full.last_name ?? s.lastName) || ''
      const detailBatchIds = full.batch_ids ? full.batch_ids.map(String) : (full.batch != null ? [String(full.batch)] : s.batchIds)
      setDetails({
        name: `${firstName} ${lastName}`.trim() || '—',
        email: (d?.email ?? full.email ?? s.email) || '—',
        phone: (d?.phone_number ?? full.phone_number ?? s.phone ?? '') || '—',
        studentId: (d?.student_id ?? full.student_id ?? s.studentId ?? '') || '—',
        batch: detailBatchIds.map((id) => batches.find((b) => b.id === id)?.name).filter(Boolean).join(', ') || '—',
        course: getCourseTitle(full.course_detail) ?? '—',
        enrolledAt: full.enrolled_at ? new Date(full.enrolled_at).toLocaleString() : '—',
        userStatus: d?.status ?? s.userStatus ?? '',
        studentUuid,
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load student details.', 'error')
      setDetailsOpen(false)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleDetailReinvite = async () => {
    if (!details) return
    setDetailReinviting(true)
    try {
      await reinviteUserApi(details.studentUuid || details.email)
      setDetails((d) => (d ? { ...d, userStatus: 'reinvited' } : d))
      showToast('Invitation resent successfully.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend invitation.', 'error')
    } finally {
      setDetailReinviting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const studentUuid = deleteTarget.studentUuid || deleteTarget.id
      if (viewMode === 'org') {
        await deleteOrgStudentApi(orgId, studentUuid)
      } else {
        if (!selectedBatchId) return
        await removeStudentApi(orgId, selectedBatchId, studentUuid)
      }
      await fetchStudents()
      setDeleteTarget(null)
      showToast('Student removed.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove student.', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleBulkUploaded = (batchNum: number) => {
    setShowBulkModal(false)
    setSelectedBatchId(String(batchNum))
    fetchStudents()
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search students…"
        onBulkUpload={() => setShowBulkModal(true)}
        onCreate={openCreate}
        createLabel="Create Student"
      />

      <StudentsTable
        students={students}
        batches={batches}
        loading={studentsLoading}
        onOpenDetails={openDetails}
        onOpenEdit={openEdit}
        onDelete={setDeleteTarget}
      />
      <TablePagination total={totalCount} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <StudentFormModal
        open={showFormModal}
        onClose={closeForm}
        editingStudentId={editingStudentId}
        editLoading={editLoading}
        form={form}
        setForm={setForm}
        batches={batches}
        metaLoading={metaLoading}
        onSubmit={handleFormSubmit}
      />

      <StudentDetailsModal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setDetails(null) }}
        loading={detailsLoading}
        details={details}
        reinviting={detailReinviting}
        onReinvite={handleDetailReinvite}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleteLoading}
        type="danger"
        title="Delete Student"
        confirmText="Delete"
        message={`Are you sure you want to delete ${deleteTarget?.firstName ?? ''} ${deleteTarget?.lastName ?? ''}?`}
      />

      <BulkUploadStudentsModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        orgId={orgId}
        batches={batches}
        fallbackBatchId={selectedBatchId}
        onUploaded={handleBulkUploaded}
      />
    </div>
  )
}
