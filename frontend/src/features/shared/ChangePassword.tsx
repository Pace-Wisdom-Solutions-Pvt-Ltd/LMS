// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import { changePasswordApi } from '@/lib/api/auth'
import { showToast } from '@/lib/toastApi'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'

const MIN_PASSWORD_LENGTH = 8

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}

function PasswordField({ id, label, value, onChange, autoComplete }: Readonly<PasswordFieldProps>) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePassword() {
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields.', 'warning')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`, 'warning')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.', 'warning')
      return
    }
    if (newPassword === currentPassword) {
      showToast('New password cannot be the same as current password.', 'warning')
      return
    }
    setLoading(true)
    try {
      await changePasswordApi({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      showToast('Password changed successfully.', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change password. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageCard title="Change Password">
      <div className="max-w-md space-y-6">
        <p className="text-sm text-slate-600">
          Enter your current password and choose a new one. Your new password must be at least{' '}
          {MIN_PASSWORD_LENGTH} characters long.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="cp-current"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            id="cp-new"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="cp-confirm"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-teal text-white text-sm font-medium hover:opacity-90 disabled:opacity-70 transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </PageCard>
  )
}
