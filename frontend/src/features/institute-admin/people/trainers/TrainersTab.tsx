// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import TablePagination from '@/components/ui/TablePagination'
import Dropdown from '@/components/ui/Dropdown'
import UserStatusBadge from '@/components/ui/UserStatusBadge'
import { showToast } from '@/lib/toastApi'
import { toTitleCase } from '@/lib/format'
import { getStoredOrganizations } from '@/lib/auth'
import { useSortable } from '@/hooks/useSortable'
import {
  createStaffApi,
  deleteStaffApi,
  getBatchesApi,
  getStaffApi,
  getStaffByIdApi,
  updateStaffApi,
} from '@/lib/api/organizations'
import { reinviteUserApi } from '@/lib/api/users'
import { useStoreRefresh } from '../../useStoreRefresh'
import UsersTable, { type UserColumn } from '../components/UsersTable'
import UserRowActions from '../components/UserRowActions'
import ListToolbar from '../components/ListToolbar'
import type { BatchOption } from '../students/types'
import TrainerFormModal from './TrainerFormModal'
import TrainerDetailsModal from './TrainerDetailsModal'
import BulkUploadTrainersModal from './BulkUploadTrainersModal'
import { EMPTY_TRAINER_FORM, isOrgAdmin, type TrainerDetails, type TrainerForm, type TrainerRow } from './types'

const PAGE_SIZE = 10

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Colleagues' },
  { value: 'teacher', label: 'Trainers' },
  { value: 'org_admin', label: 'Organization Admin' },
] as const

export default function TrainersTab() {
  const refresh = useStoreRefresh()
  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])

  const [staff, setStaff] = useState<TrainerRow[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'org_admin'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [batches, setBatches] = useState<BatchOption[]>([])
  const [metaLoading, setMetaLoading] = useState(false)

  // Create / edit form
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TrainerForm>(EMPTY_TRAINER_FORM)
  const [formLoading, setFormLoading] = useState(false)

  // Bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Details
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<TrainerDetails | null>(null)
  const [reinviting, setReinviting] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TrainerRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { sorted, sortKey, sortDir, handleSort } = useSortable(staff)

  const fetchStaff = async () => {
    if (!orgId) return
    setStaffLoading(true)
    try {
      const data = await getStaffApi(orgId, roleFilter === 'all' ? undefined : roleFilter, debouncedSearch || undefined)
      setStaff(
        (Array.isArray(data) ? data : []).map((s) => ({
          id: String(s.id),
          userUuid: s.user_detail?.id ?? '',
          firstName: s.user_detail?.first_name ?? '',
          lastName: s.user_detail?.last_name ?? '',
          email: s.user_detail?.email ?? '',
          role: s.role_detail?.name ?? '',
          status: (s.is_active ?? s.user_detail?.is_active) ? 'active' : 'inactive',
          userStatus: s.user_detail?.status ?? '',
          assignedCourseTitles: (s.assigned_courses_detail ?? []).map((c) => c.title),
        })),
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load trainers.', 'error')
    } finally {
      setStaffLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, roleFilter, debouncedSearch])

  // Load batches (with their courses) whenever a modal that needs them opens.
  useEffect(() => {
    if (!showFormModal && !showBulkModal) return
    if (!orgId) return
    setMetaLoading(true)
    getBatchesApi(orgId)
      .then((b) => {
        setBatches(
          (Array.isArray(b) ? b : []).map((x) => ({
            id: String(x.id),
            name: x.name,
            courses: (x.courses_detail ?? []).map((c) => ({ id: String(c.id), name: c.title })),
          })),
        )
      })
      .catch(() => showToast('Failed to load batches.', 'error'))
      .finally(() => setMetaLoading(false))
  }, [showFormModal, showBulkModal, orgId])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current)
    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_TRAINER_FORM)
    setShowFormModal(true)
  }

  const openEdit = (t: TrainerRow) => {
    if (isOrgAdmin(t.role)) {
      showToast('Organization Admin can only view details.', 'info')
      return
    }
    if (!orgId) return
    setEditingId(t.id)
    setForm({ ...EMPTY_TRAINER_FORM, firstName: t.firstName, lastName: t.lastName, email: t.email })
    setShowFormModal(true)
    setFormLoading(true)
    getStaffByIdApi(orgId, t.id)
      .then((s) => {
        setForm({
          firstName: s.user_detail?.first_name ?? t.firstName,
          lastName: s.user_detail?.last_name ?? t.lastName,
          email: s.user_detail?.email ?? t.email,
          phone: s.user_detail?.phone_number ?? s.phone_number ?? '',
          batches: (s.batches ?? []).map(String),
          courses: (s.assigned_courses ?? []).map(String),
        })
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load trainer.', 'error'))
      .finally(() => setFormLoading(false))
  }

  const closeForm = () => {
    setShowFormModal(false)
    setEditingId(null)
  }

  const handleFormSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!orgId) {
      showToast('No organization found for this user.', 'error')
      return
    }
    const batchNums = form.batches.map(Number).filter((n) => !Number.isNaN(n))
    const assignedCourseNums = form.courses.map(Number).filter((n) => !Number.isNaN(n))
    try {
      if (editingId) {
        await updateStaffApi(orgId, editingId, {
          user_email: form.email.trim().toLowerCase(),
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone_number: form.phone.trim() || undefined,
          role_name: 'teacher',
          batches: batchNums,
          assigned_courses: assignedCourseNums.length > 0 ? assignedCourseNums : null,
        })
        showToast('Trainer updated.', 'success')
      } else {
        await createStaffApi(orgId, {
          user_email: form.email.trim().toLowerCase(),
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone_number: form.phone.trim() || undefined,
          role_name: 'teacher',
          batches: batchNums.length > 0 ? batchNums : undefined,
          assigned_courses: assignedCourseNums.length > 0 ? assignedCourseNums : undefined,
          is_active: true,
        })
        showToast('Trainer created.', 'success')
      }
      await fetchStaff()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save trainer.', 'error')
      return
    }
    setForm(EMPTY_TRAINER_FORM)
    closeForm()
    refresh()
  }

  const openDetails = async (t: TrainerRow) => {
    if (!orgId) return
    setDetailsOpen(true)
    setDetailsLoading(true)
    setDetails(null)
    try {
      const s = await getStaffByIdApi(orgId, t.id)
      const first = s.user_detail?.first_name ?? ''
      const last = s.user_detail?.last_name ?? ''
      setDetails({
        id: String(s.id),
        userUuid: s.user_detail?.id ?? '',
        name: `${first} ${last}`.trim() || '—',
        email: s.user_detail?.email ?? '—',
        phone: s.user_detail?.phone_number ?? s.phone_number ?? '—',
        role: s.role_detail?.name ?? '—',
        batch: (s.batch_detail ?? []).map((d) => d.name).join(', ') || '—',
        assignedCourses: (s.assigned_courses_detail ?? []).map((c) => c.title),
        isActive: !!s.is_active,
        userStatus: s.user_detail?.status ?? '',
        joinedAt: s.joined_at ? new Date(s.joined_at).toLocaleString() : '—',
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load trainer details.', 'error')
      setDetailsOpen(false)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleReinvite = async () => {
    if (!details) return
    setReinviting(true)
    try {
      await reinviteUserApi(details.userUuid || details.email)
      showToast('Invitation resent successfully.', 'success')
      setDetails((d) => (d ? { ...d, userStatus: 'reinvited' } : d))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend invitation.', 'error')
    } finally {
      setReinviting(false)
    }
  }

  const handleToggleActive = async () => {
    if (!details || !orgId) return
    setTogglingActive(true)
    try {
      const newIsActive = !details.isActive
      await updateStaffApi(orgId, details.id, { is_active: newIsActive })
      setDetails((d) => (d ? { ...d, isActive: newIsActive } : d))
      showToast(newIsActive ? 'Trainer activated.' : 'Trainer deactivated.', 'success')
      await fetchStaff()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error')
    } finally {
      setTogglingActive(false)
    }
  }

  const handleDelete = (t: TrainerRow) => {
    if (isOrgAdmin(t.role)) {
      showToast('Organization Admin cannot be deleted from this page.', 'warning')
      return
    }
    setDeleteTarget(t)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !orgId) return
    setIsDeleting(true)
    try {
      await deleteStaffApi(orgId, deleteTarget.id)
      showToast('Trainer deleted.', 'success')
      setDeleteTarget(null)
      await fetchStaff()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete trainer.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const pagedStaff = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page])

  const columns: UserColumn<TrainerRow>[] = [
    {
      key: 'name',
      label: 'Name',
      sortKey: 'firstName',
      className: 'font-medium text-slate-800',
      render: (t) => toTitleCase(`${t.firstName} ${t.lastName}`.trim()),
    },
    { key: 'email', label: 'Email', sortKey: 'email', className: 'text-slate-600', render: (t) => t.email },
    {
      key: 'course',
      label: 'Course',
      className: 'text-slate-600',
      render: (t) => (t.assignedCourseTitles.length > 0 ? t.assignedCourseTitles.join(', ') : '—'),
    },
    { key: 'status', label: 'Status', sortKey: 'status', render: (t) => <UserStatusBadge status={t.userStatus} /> },
  ]

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search trainers…"
        onBulkUpload={() => setShowBulkModal(true)}
        onCreate={openCreate}
        createLabel="Create Trainer"
        filters={
          <div className="w-full sm:w-48">
            <Dropdown
              label=""
              value={roleFilter}
              options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => { setRoleFilter(v as typeof roleFilter); setPage(1) }}
              placeholder="Select role…"
              compact
            />
          </div>
        }
      />

      <UsersTable
        rows={pagedStaff}
        columns={columns}
        loading={staffLoading}
        loadingMessage="Loading trainers…"
        emptyMessage={debouncedSearch ? 'No trainers match your search.' : 'No trainers found.'}
        sort={{ sortKey: sortKey as string | null, sortDir, onSort: (k) => handleSort(k as keyof TrainerRow) }}
        renderActions={(t) => (
          <UserRowActions
            row={t}
            onView={openDetails}
            onEdit={openEdit}
            onDelete={handleDelete}
            canEdit={!isOrgAdmin(t.role)}
            canDelete={!isOrgAdmin(t.role)}
          />
        )}
      />
      <TablePagination total={staff.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <TrainerFormModal
        open={showFormModal}
        onClose={closeForm}
        editing={Boolean(editingId)}
        loading={formLoading}
        form={form}
        setForm={setForm}
        batches={batches}
        metaLoading={metaLoading}
        onSubmit={handleFormSubmit}
      />

      <TrainerDetailsModal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setDetails(null) }}
        loading={detailsLoading}
        details={details}
        togglingActive={togglingActive}
        onToggleActive={handleToggleActive}
        reinviting={reinviting}
        onReinvite={handleReinvite}
      />

      <BulkUploadTrainersModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        orgId={orgId}
        batches={batches}
        onUploaded={() => { setShowBulkModal(false); fetchStaff() }}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Trainer"
        message={`Are you sure you want to delete "${deleteTarget?.firstName ?? ''} ${deleteTarget?.lastName ?? ''}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}
