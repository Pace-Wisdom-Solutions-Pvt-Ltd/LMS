// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getCourses } from '../store'
import MyCourses from '../courses/MyCourses'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../store', () => ({
  getCourses: vi.fn(),
}))

vi.mock('../modals/CreateCourseModal', () => ({
  default: ({ onCreated, onClose }: { onCreated: (id: string) => void; onClose: () => void }) => (
    <div>
      <button type="button" onClick={() => { onCreated('c2'); onClose() }}>
        Create Now
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderMyCourses() {
  return render(
    <MemoryRouter>
      <MyCourses />
    </MemoryRouter>,
  )
}

describe('InstructorMyCourses', () => {
  it('shows empty state when no projects', () => {
    vi.mocked(getCourses).mockReturnValue([])
    renderMyCourses()
    expect(screen.getByText(/No projects yet/i)).toBeTruthy()
  })

  it('opens a project when its card is clicked', () => {
    vi.mocked(getCourses).mockReturnValue([
      { id: 'c1', name: 'P1', code: 'P1-CODE', summary: 'Sum', assessments: [{ id: 'a', title: 'T', description: '', format: 'text_area' }] },
    ])
    renderMyCourses()
    expect(screen.getByText('P1-CODE')).toBeTruthy()
    expect(screen.getByText('1 task')).toBeTruthy()
    fireEvent.click(screen.getByText('P1'))
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/projects/c1')
  })

  it('opens create modal and navigates to created project', () => {
    vi.mocked(getCourses)
      .mockReturnValueOnce([
        { id: 'c1', name: 'P1', code: 'P1', summary: '', assessments: [] },
      ])
      .mockReturnValue([
        { id: 'c1', name: 'P1', code: 'P1', summary: '', assessments: [] },
        { id: 'c2', name: 'P2', code: 'P2', summary: 'S', assessments: [] },
      ])

    renderMyCourses()

    fireEvent.click(screen.getByRole('button', { name: /Create Project/i }))
    fireEvent.click(screen.getByRole('button', { name: /Create Now/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/projects/c2')
  })
})
