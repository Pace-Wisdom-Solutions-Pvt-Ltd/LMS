// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '@/components/ui/BackButton'
import { showToast } from '@/lib/toastApi'
import { isValidEmail } from '@/lib/validation'
import { forgotPasswordApi } from '@/lib/api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (!isValidEmail(email)) {
      showToast('Enter a valid email address.', 'warning')
      return
    }
    setLoading(true)
    try {
      await forgotPasswordApi(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send reset link. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Check your email</h1>
          <p className="text-slate-600 mb-6">
            If an account exists for <span className="font-medium text-slate-800">{email}</span>,
            a password reset link has been sent. Please check your inbox.
          </p>

          <div className="mt-4 flex justify-center">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">Forgot password</h1>
        <p className="text-slate-600 text-center mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <div className="flex justify-center">
            <BackButton label="Back to sign in" to="/login" />
          </div>
        </form>
      </div>
    </div>
  )
}
