// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import PageCard from '@/components/ui/PageCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import TablePagination from '@/components/ui/TablePagination'
import { showToast } from '@/lib/toastApi'
import { useSortable } from '@/hooks/useSortable'
import { getStoredOrganizations } from '@/lib/auth'
import {
  getBatchesApi,
  updateBatchApi,
  deleteBatchApi,
  type ApiBatch,
} from '@/lib/api/organizations'
import BatchModal from './BatchModal'
import BatchesTable from './BatchesTable'

const PAGE_SIZE = 10

export default function InstituteAdminBatches() {
  const navigate = useNavigate()
  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])

  const [batches, setBatches] = useState<ApiBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState<ApiBatch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiBatch | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [fetchKey, setFetchKey] = useState(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { sorted: sortableBatches, sortKey, sortDir, handleSort } = useSortable(batches)
  const ordering = sortKey ? `${sortDir === 'desc' ? '-' : ''}${String(sortKey)}` : undefined

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    getBatchesApi(orgId, debouncedSearch || undefined, ordering)
      .then(data => setBatches(Array.isArray(data) ? data : []))
      .catch(err => showToast(err instanceof Error ? err.message : 'Failed to load batches.', 'error'))
      .finally(() => setLoading(false))
  }, [orgId, debouncedSearch, fetchKey, ordering])

  const refetch = () => setFetchKey(k => k + 1)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }

  const openCreate = () => {
    setEditingBatch(null)
    setShowModal(true)
  }

  const openEdit = (batch: ApiBatch) => {
    setEditingBatch(batch)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingBatch(null)
  }

  const handleToggleActive = async (batch: ApiBatch) => {
    const id = String(batch.id)
    setTogglingIds(prev => new Set(prev).add(id))
    try {
      await updateBatchApi(orgId, id, { is_active: !batch.is_active })
      setBatches(prev => prev.map(x => (x.id === batch.id ? { ...x, is_active: !batch.is_active } : x)))
    } catch {
      showToast('Failed to update batch status.', 'error')
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !orgId) return
    setDeleting(true)
    try {
      await deleteBatchApi(orgId, String(deleteTarget.id))
      showToast('Batch deleted.', 'success')
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete batch.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const pagedBatches = useMemo(
    () => sortableBatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortableBatches, page],
  )

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Batch Listing</h1>
          <p className="text-slate-600 mt-1">
            Create and manage batches. Name, start/end dates, status.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          Create Batch
        </Button>
      </div>

      {!orgId && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Organization not found in session. Please log out and log in again.
        </div>
      )}

      <PageCard title="Batches">
        <div className="mb-4">
          <Input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search batches…"
            leftIcon={<Search className="h-4 w-4" />}
            containerClassName="w-full sm:w-64"
          />
        </div>

        <BatchesTable
          batches={pagedBatches}
          loading={loading}
          togglingIds={togglingIds}
          sortKey={sortKey as string | null}
          sortDir={sortDir}
          onSort={handleSort as (key: string) => void}
          onToggleActive={handleToggleActive}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onRowClick={(batch) => navigate(`/org-admin/batches/${batch.id}`)}
        />

        <TablePagination
          total={batches.length}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </PageCard>

      {showModal && (
        <BatchModal
          orgId={orgId}
          batch={editingBatch}
          onClose={closeModal}
          onDone={() => {
            closeModal()
            refetch()
          }}
        />
      )}

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        type="danger"
        title="Delete Batch"
        confirmText="Delete"
        message={
          <>Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.</>
        }
      />
    </div>
  )
}
