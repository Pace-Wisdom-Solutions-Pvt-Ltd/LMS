// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/lib/auth'
import type { ApiUser } from '@/lib/api/users'

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/components/ui/PageCard', () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <div><h2>{title}</h2>{children}</div>
  ),
}))

const mockUser: User = { id: 'u1', email: 'user@test.com', role: 'institute_admin', roles: ['institute_admin'], name: 'John Doe' }

const mockApiUser: ApiUser = {
  id: 'u1',
  email: 'user@test.com',
  username: 'john',
  first_name: 'John',
  last_name: 'Doe',
  phone_number: '1234567890',
  profile_picture: null,
  is_active: true,
  is_superuser: false,
  date_joined: '2024-01-01',
  roles: ['org_admin'],
}

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(),
  setStoredUser: vi.fn(),
}))

vi.mock('@/lib/api/users', () => ({
  getUserByIdApi: vi.fn(),
  updateUserProfileApi: vi.fn(),
}))

import { showToast } from '@/lib/toastApi'
import * as auth from '@/lib/auth'
import { getUserByIdApi, updateUserProfileApi } from '@/lib/api/users'
import Profile from '../Profile'

const originalCreateObjectURL = URL.createObjectURL

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth.getStoredUser).mockReturnValue(mockUser)
  vi.mocked(getUserByIdApi).mockResolvedValue(mockApiUser)
  vi.mocked(updateUserProfileApi).mockResolvedValue({ ...mockApiUser, first_name: 'Jane' })
  URL.createObjectURL = vi.fn(() => 'blob:preview')
})

afterEach(() => {
  cleanup()
  URL.createObjectURL = originalCreateObjectURL
})

async function renderProfile() {
  const result = render(<MemoryRouter><Profile /></MemoryRouter>)
  await screen.findByRole('button', { name: /save changes/i })
  return result
}

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

describe('Profile', () => {
  it('renders without crashing', async () => {
    const { container } = await renderProfile()
    expect(container.firstChild).toBeTruthy()
  })

  it('shows Profile heading', async () => {
    const { container } = await renderProfile()
    expect(container.textContent).toContain('My Profile')
  })

  it('loads the profile for the stored user id', async () => {
    await renderProfile()
    expect(getUserByIdApi).toHaveBeenCalledWith('u1')
  })

  it('pre-fills fields from the loaded profile', async () => {
    await renderProfile()
    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('John')
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Doe')
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('1234567890')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('user@test.com')
  })

  it('shows error toast when the profile fails to load', async () => {
    vi.mocked(getUserByIdApi).mockRejectedValue(new Error('nope'))
    await renderProfile()
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Failed to load profile.', 'error')
  })

  it('allows typing in name fields', async () => {
    await renderProfile()
    const first = screen.getByLabelText('First Name') as HTMLInputElement
    fireEvent.change(first, { target: { value: 'Jane' } })
    expect(first.value).toBe('Jane')
  })

  it('calls showToast on successful profile save', async () => {
    await renderProfile()
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: '  Jane ' } })
    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!)
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith('Profile updated.', 'success'))
    expect(updateUserProfileApi).toHaveBeenCalledWith('u1', {
      first_name: 'Jane',
      last_name: 'Doe',
      phone_number: '1234567890',
    })
    expect(auth.setStoredUser).toHaveBeenCalledWith({ ...mockUser, name: 'Jane Doe' })
  })

  it('shows warning for non-image avatar file', async () => {
    const { container } = await renderProfile()
    const badFile = new File(['x'], 'x.txt', { type: 'text/plain' })
    fireEvent.change(fileInput(container), { target: { files: [badFile] } })

    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      'Only JPEG, PNG, or WebP images are allowed.',
      'warning',
    )
  })

  it('shows warning for too-large avatar file', async () => {
    const user = userEvent.setup()
    const { container } = await renderProfile()
    const big = new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await user.upload(fileInput(container), big)

    expect(vi.mocked(showToast)).toHaveBeenCalledWith(expect.stringMatching(/under 2 mb/i), 'warning')
  })

  it('previews a selected avatar, uploads it on save, and allows removing it', async () => {
    const user = userEvent.setup()
    const { container } = await renderProfile()
    const ok = new File([new Uint8Array([1, 2, 3])], 'ok.png', { type: 'image/png' })
    await user.upload(fileInput(container), ok)

    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveAttribute('src', 'blob:preview')
    expect(screen.getByRole('button', { name: /change photo/i })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /remove/i }))
    expect(screen.queryByRole('img', { name: 'Avatar' })).toBeNull()
    expect(screen.getByRole('button', { name: /upload photo/i })).toBeTruthy()

    await user.upload(fileInput(container), ok)
    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!)
    await waitFor(() =>
      expect(updateUserProfileApi).toHaveBeenCalledWith('u1', expect.objectContaining({ profile_picture: ok })),
    )
  })

  it('handles save error and shows error toast', async () => {
    vi.mocked(updateUserProfileApi).mockRejectedValue(new Error('fail'))
    await renderProfile()

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!)
    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledWith('Failed to save profile.', 'error'))
  })

  it('shows phone number field', async () => {
    const { container } = await renderProfile()
    expect(container.textContent?.toLowerCase()).toContain('phone')
  })

  it('handles missing stored user gracefully', async () => {
    vi.mocked(auth.getStoredUser).mockReturnValue(null)
    const { container } = await renderProfile()
    expect(getUserByIdApi).not.toHaveBeenCalled()
    expect(container.textContent).toContain('—')
  })

  it('shows change password link under the role base path', async () => {
    await renderProfile()
    expect(screen.getByRole('link', { name: /change password/i })).toHaveAttribute('href', '/org-admin/change-password')
  })
})
