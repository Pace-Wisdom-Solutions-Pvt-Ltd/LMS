// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import { getStoredUser, setStoredUser } from '@/lib/auth'
import { getRoleBasePath } from '@/lib/constants'
import { showToast } from '@/lib/toastApi'
import { toTitleCase } from '@/lib/format'
import { validateImageFile } from '@/lib/validation'
import { Loader2, KeyRound, Upload, X } from 'lucide-react'
import { getUserByIdApi, updateUserProfileApi } from '@/lib/api/users'
import type { ApiUser } from '@/lib/api/users'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/gif,image/webp'

export default function Profile() {
  const user = getStoredUser()

  const [profile, setProfile] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getUserByIdApi(user.id)
      .then((data) => {
        setProfile(data)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPhone(data.phone_number ?? '')
        setAvatarPreview(data.profile_picture ?? '')
      })
      .catch(() => showToast('Failed to load profile.', 'error'))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    try {
      const updated = await updateUserProfileApi(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        ...(avatarFile ? { profile_picture: avatarFile } : {}),
      })
      setProfile(updated)
      setAvatarPreview(updated.profile_picture ?? '')
      setAvatarFile(null)
      const displayName = [updated.first_name, updated.last_name].filter(Boolean).join(' ')
      if (user) setStoredUser({ ...user, name: displayName || user.name })
      showToast('Profile updated.', 'success')
    } catch {
      showToast('Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const imageError = validateImageFile(file)
    if (imageError) { showToast(imageError, 'warning'); e.target.value = ''; return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(profile?.profile_picture ?? '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const displayName = toTitleCase(
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.name || user?.email || '—'
  )
  const basePath = getRoleBasePath()

  if (loading) {
    return (
      <PageCard title="My Profile">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-brand-teal" />
        </div>
      </PageCard>
    )
  }

  return (
    <PageCard title="My Profile">
      <div className="max-w-xl space-y-6">

        {/* ── Avatar row ── */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = '' }}
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-brand-teal flex items-center justify-center text-white text-xl font-bold shrink-0">
              {(displayName === '—' ? '?' : displayName)[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{displayName}</p>
            <p className="text-sm text-slate-500 truncate">{profile?.email ?? user?.email ?? '—'}</p>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={profile?.email ?? user?.email ?? ''}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Email is read-only.</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="profile-photo" className="block text-sm font-medium text-slate-700 mb-1">Profile photo</label>
            <input
              id="profile-photo"
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_IMAGES}
              onChange={handleAvatarFileChange}
              className="hidden"
              tabIndex={-1}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-brand-teal/50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {avatarFile ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarFile && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">JPEG, PNG, GIF or WebP. Max 2 MB.</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 disabled:opacity-70 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
            <Link
              to={`${basePath}/change-password`}
              className="inline-flex items-center gap-2 text-sm text-brand-teal font-medium hover:underline"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
          </div>
        </form>

      </div>
    </PageCard>
  )
}
