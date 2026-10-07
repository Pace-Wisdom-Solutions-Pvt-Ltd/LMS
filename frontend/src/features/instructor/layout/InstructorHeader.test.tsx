// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

afterEach(() => cleanup())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
}))

import { getStoredUser, clearStoredUser } from '@/lib/auth'
import InstructorHeader from './InstructorHeader'

describe('layout InstructorHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStoredUser).mockReturnValue({ email: 'i@test.com', name: 'Inst', role: 'trainer' })
  })

  it('updates search and signs out via dropdown', async () => {
    render(<InstructorHeader />)

    fireEvent.change(screen.getByPlaceholderText(/Search programs/i), { target: { value: 'abc' } })
    expect(screen.getByPlaceholderText(/Search programs/i)).toHaveValue('abc')

    fireEvent.click(screen.getByRole('button', { name: /Inst/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(vi.mocked(clearStoredUser)).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})

