// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import SearchableMultiSelect from '@/components/ui/SearchableMultiSelect'
import { showToast } from '@/lib/toastApi'
import {
  createBatchApi,
  updateBatchApi,
  getPublishedCoursesApi,
  type ApiBatch,
  type ApiCourse,
} from '@/lib/api/organizations'

interface BatchModalProps {
  readonly orgId: string
  readonly batch: ApiBatch | null
  readonly onClose: () => void
  readonly onDone: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export default function BatchModal({ orgId, batch, onClose, onDone }: BatchModalProps) {
  const [name, setName] = useState(batch?.name ?? '')
  const [startDate, setStartDate] = useState(batch?.start_date ?? '')
  const [endDate, setEndDate] = useState(batch?.end_date ?? '')
  const [isActive, setIsActive] = useState(batch?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>(batch?.courses ?? [])

  useEffect(() => {
    getPublishedCoursesApi(orgId)
      .then(setCourses)
      .catch(() => { /* silent — course assignment is optional */ })
  }, [orgId])

  const courseOptions = useMemo(
    () => courses.map(c => ({ id: c.id, label: c.title })),
    [courses],
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return
    // On create, a new batch can't start in the past. In edit mode the batch may
    // already have started, so past/present/future start dates are all allowed.
    if (!batch && startDate && startDate < today()) {
      showToast('Start date must be today or a future date.', 'warning')
      return
    }
    if (startDate && endDate && endDate < startDate) {
      showToast('End date must be on or after start date.', 'warning')
      return
    }
    setSaving(true)
    // On edit, only send dates that actually changed so an already-past batch
    // isn't re-validated (and rejected) by the server for an untouched date.
    const startChanged = !batch || startDate !== (batch.start_date ?? '')
    const endChanged = !batch || endDate !== (batch.end_date ?? '')
    const payload = {
      name: name.trim(),
      ...(startChanged ? { start_date: startDate || undefined } : {}),
      ...(endChanged ? { end_date: endDate || undefined } : {}),
      is_active: isActive,
      courses: selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
    }
    const request = batch
      ? updateBatchApi(orgId, String(batch.id), payload)
      : createBatchApi(orgId, payload)
    request
      .then(() => {
        showToast(batch ? 'Batch updated.' : 'Batch created.', 'success')
        onDone()
      })
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : 'Failed to save batch.', 'error')
      })
      .finally(() => setSaving(false))
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4">
        {batch ? 'Edit Batch' : 'Create Batch'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Batch Name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Batch 2026"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            min={batch ? undefined : today()}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Assign Courses</label>
          <SearchableMultiSelect
            options={courseOptions}
            selectedIds={selectedCourseIds}
            onChange={setSelectedCourseIds}
            placeholder="Select courses…"
            searchPlaceholder="Search courses…"
            emptyText="No courses found."
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Active</span>
          <ToggleSwitch checked={isActive} onChange={setIsActive} aria-label="Batch active" />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} loadingText="Saving…">
            {batch ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
