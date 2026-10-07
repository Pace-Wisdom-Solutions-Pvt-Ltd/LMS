// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import MultiCheckDropdown from '@/components/ui/MultiCheckDropdown'
import { isValidEmail } from '@/lib/validation'
import type { BatchOption, TrainerForm } from './types'

type FieldErrors = Partial<Record<keyof TrainerForm, string>>

function validateForm(form: TrainerForm, isEditing: boolean): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required'
  if (!isEditing) {
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address'
  }
  return errors
}

export default function TrainerFormModal({
  open,
  onClose,
  editing,
  loading,
  form,
  setForm,
  batches,
  metaLoading,
  onSubmit,
}: Readonly<{
  open: boolean
  onClose: () => void
  editing: boolean
  loading: boolean
  form: TrainerForm
  setForm: Dispatch<SetStateAction<TrainerForm>>
  batches: BatchOption[]
  metaLoading: boolean
  onSubmit: (e: SyntheticEvent) => Promise<void>
}>) {
  const [errors, setErrors] = useState<FieldErrors>({})

  // Clear any surfaced errors when the modal closes, so it reopens clean.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) setErrors({})
  }

  let submitLabel = 'Create'
  if (loading) submitLabel = 'Loading…'
  else if (editing) submitLabel = 'Save'

  const setField = <K extends keyof TrainerForm>(key: K, value: TrainerForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const coursesForSelectedBatch = useMemo(() => {
    const seen = new Set<string>()
    return batches
      .filter((b) => form.batches.includes(b.id))
      .flatMap((b) => b.courses)
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
  }, [batches, form.batches])

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    const nextErrors = validateForm(form, editing)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
    void onSubmit(e)
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4 pr-8">{editing ? 'Edit Trainer' : 'Create Trainer'}</h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            required
            error={errors.firstName}
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            required
            error={errors.lastName}
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          required
          disabled={editing}
          error={errors.email}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setField('phone', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">Primary Batch</span>
            <MultiCheckDropdown
              options={batches.map((b) => ({ id: b.id, name: b.name }))}
              selected={form.batches}
              onChange={(v) => setForm((p) => ({ ...p, batches: v, courses: [] }))}
              placeholder={metaLoading ? 'Loading…' : 'Select batch(es)...'}
              disabled={metaLoading}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">Courses</span>
            <MultiCheckDropdown
              options={coursesForSelectedBatch}
              selected={form.courses}
              onChange={(v) => setForm((p) => ({ ...p, courses: v }))}
              placeholder={metaLoading ? 'Loading…' : form.batches.length > 0 ? 'Select courses...' : 'Select a batch first'}
              disabled={metaLoading || form.batches.length === 0}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading} loadingText={submitLabel}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
