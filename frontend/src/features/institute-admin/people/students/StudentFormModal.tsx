// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import MultiCheckDropdown from '@/components/ui/MultiCheckDropdown'
import { isValidEmail } from '@/lib/validation'
import type { BatchOption, StudentForm } from './types'

type FieldErrors = Partial<Record<keyof StudentForm, string>>

function ActiveToggle({
  isActive,
  onToggle,
}: Readonly<{ isActive: boolean; onToggle: () => void }>) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
    >
      <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ml-0.5 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </button>
  )
}

/** Validate all fields and return a message per invalid field (empty = valid). */
function validateForm(form: StudentForm, isEditing: boolean): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required'
  if (!isEditing) {
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address'
  }
  return errors
}

export default function StudentFormModal({
  open,
  onClose,
  editingStudentId,
  editLoading,
  form,
  setForm,
  batches,
  metaLoading,
  onSubmit,
}: Readonly<{
  open: boolean
  onClose: () => void
  editingStudentId: string | null
  editLoading: boolean
  form: StudentForm
  setForm: Dispatch<SetStateAction<StudentForm>>
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

  const isEditing = Boolean(editingStudentId)
  let submitLabel = 'Create'
  if (editLoading) submitLabel = 'Loading…'
  else if (isEditing) submitLabel = 'Save'

  const setField = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
    // Clear a field's error as soon as the user edits it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    const nextErrors = validateForm(form, isEditing)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
    void onSubmit(e)
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4 pr-8">{isEditing ? 'Edit Student' : 'Create Student'}</h2>
      {/* noValidate: use the fields' own inline error feedback instead of the browser's default validation bubbles. */}
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
          disabled={isEditing}
          error={errors.email}
        />
        <Input
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={(e) => setField('phone', e.target.value)}
        />
        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1">Batch</span>
          <MultiCheckDropdown
            options={batches.map((b) => ({ id: b.id, name: b.name }))}
            selected={form.batchIds}
            onChange={(v) => setForm((p) => ({ ...p, batchIds: v, courseIds: [] }))}
            placeholder={metaLoading ? 'Loading…' : 'Select batch(es)...'}
            disabled={metaLoading}
          />
        </div>
        {isEditing && (
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">Status</span>
            <ActiveToggle isActive={form.isActive} onToggle={() => setField('isActive', !form.isActive)} />
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={editLoading} loadingText={submitLabel}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
