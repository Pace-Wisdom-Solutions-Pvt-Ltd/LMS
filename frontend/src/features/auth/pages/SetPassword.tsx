// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import BackButton from '@/components/ui/BackButton'
import logo from '@/assets/pws_logo_new_text.png'
import { acceptInviteApi } from '@/lib/api/auth'
import { showToast } from '@/lib/toastApi'
import { Eye, EyeOff } from 'lucide-react'

export default function SetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password || !confirm) {
      setError('Please fill both fields.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!token) {
      setError('This invite link is invalid or has expired.')
      return
    }

    setLoading(true)
    try {
      await acceptInviteApi({ token, password })
      setSuccess(true)
      showToast('Password set successfully. You can now sign in.', 'success')
      // small delay so user can see success, then go to login
      setTimeout(() => navigate('/login', { replace: true }), 800)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to set password. Please try again or request a new invite.'
      )
    } finally {
      setLoading(false)
    }
  }

  // No token in URL â€“ show invalid/expired link message
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Logo" className="h-10 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Invalid or expired link</h1>
          <p className="text-slate-600 text-sm mb-6">
            This set-password link is missing a token or has expired. Please request a new invite or link from your administrator.
          </p>
          <BackButton label="Back to sign in" to="/login" />
        </div>
      </div>
    )
  }

  // Success state after setting password
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Logo" className="h-10 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Password set successfully</h1>
          <p className="text-slate-600 text-sm mb-6">
            You can now sign in with your email and the password you just set.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 px-4 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 transition text-center"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-10 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Set your password</h1>
        <p className="text-slate-600 text-sm text-center mb-6">
          You were invited to join. Create a password to complete your account setup.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting passwordâ€¦' : 'Set password'}
          </button>
          <div className="flex justify-center pt-2">
            <BackButton label="Back to sign in" to="/login" />
          </div>
        </form>
      </div>
    </div>
  )
}
