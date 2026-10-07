// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/organizations', () => ({
  getStaffApi: vi.fn().mockResolvedValue([
    {
      id: '1',
      user_detail: { id: 'u1', first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com', status: 'active', is_active: true },
      role_detail: { name: 'teacher' },
      is_active: true,
      assigned_courses_detail: [{ id: 20, title: 'Math 101' }],
    },
  ]),
  getStaffByIdApi: vi.fn().mockResolvedValue({}),
  createStaffApi: vi.fn().mockResolvedValue({}),
  updateStaffApi: vi.fn().mockResolvedValue({}),
  deleteStaffApi: vi.fn().mockResolvedValue(undefined),
  bulkUploadStaffApi: vi.fn().mockResolvedValue({}),
  getBatchesApi: vi.fn().mockResolvedValue([{ id: '10', name: 'Batch A', courses_detail: [{ id: 20, title: 'Math 101' }] }]),
  getStudentsApi: vi.fn().mockResolvedValue({ results: [], count: 0 }),
  getOrgStudentsApi: vi.fn().mockResolvedValue({
    results: [
      {
        id: '42',
        student: 'uuid-1',
        student_detail: { first_name: 'Bob', last_name: 'Doe', email: 'bob@test.com', status: 'active' },
        batch: '10',
        is_active: true,
      },
    ],
    count: 1,
  }),
  getStudentByIdApi: vi.fn().mockResolvedValue({}),
  getOrgStudentByIdApi: vi.fn().mockResolvedValue({}),
  addStudentApi: vi.fn().mockResolvedValue({}),
  removeStudentApi: vi.fn().mockResolvedValue(undefined),
  deleteOrgStudentApi: vi.fn().mockResolvedValue(undefined),
  updateStudentApi: vi.fn().mockResolvedValue({}),
  updateOrgStudentApi: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/api/users', () => ({
  reinviteUserApi: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/features/institute-admin/useStoreRefresh', () => ({
  useStoreRefresh: vi.fn().mockReturnValue(vi.fn()),
}))

import ManageUsers from '../people/ManageUsers'

async function renderManageUsers() {
  return render(
    <MemoryRouter>
      <ManageUsers />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ManageUsers – shell', () => {
  it('renders the Manage Users heading and both tabs', async () => {
    await renderManageUsers()
    expect(screen.getByRole('heading', { name: /manage users/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /trainers/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /students/i })).toBeTruthy()
  })

  it('shows the trainers tab by default with its create action', async () => {
    await renderManageUsers()
    expect(screen.getByRole('button', { name: /create trainer/i })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeTruthy())
  })

  it('switches to the students tab and loads students', async () => {
    await renderManageUsers()
    fireEvent.click(screen.getByRole('button', { name: /^students$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create student/i })).toBeTruthy()
    })
    await waitFor(() => expect(screen.getByText('Bob Doe')).toBeTruthy())
  })
})
