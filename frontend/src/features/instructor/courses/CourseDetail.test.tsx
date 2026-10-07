// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'

afterEach(() => cleanup())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: () => [{ id: 1 }],
  getStoredUser: () => ({ id: 1, name: 'Test' }),
}))

vi.mock('@/lib/api/organizations', () => ({
  getCourseByIdApi: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Introduction to Programming',
    description: 'Learn basics of programming',
    status: 'published',
  }),
  getCourseModulesApi: vi.fn().mockResolvedValue([
    { id: 1, title: 'Getting Started with JavaScript', sequence_order: 1 },
  ]),
  getModuleNodesApi: vi.fn().mockResolvedValue([]),
  createModuleNodeApi: vi.fn(),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

import CourseDetail from './CourseDetail'

describe('Instructor CourseDetail (API-based)', () => {
  it('renders course content from API', async () => {
    render(
      <MemoryRouter initialEntries={['/instructor/courses/1']}>
        <Routes>
          <Route path="/instructor/courses/:courseId" element={<CourseDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText(/Introduction to Programming/i)).toBeTruthy(), { timeout: 15000 })
  }, 60_000)

  it('lists module title from API', async () => {
    render(
      <MemoryRouter initialEntries={['/instructor/courses/1']}>
        <Routes>
          <Route path="/instructor/courses/:courseId" element={<CourseDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText(/Getting Started with JavaScript/i)).toBeTruthy(), { timeout: 15000 })
  }, 60_000)
})
