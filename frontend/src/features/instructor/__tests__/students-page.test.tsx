// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { getStudents, type InstructorStudent } from '../store'
import Students from '../students/Students'

vi.mock('../store', () => ({
  getStudents: vi.fn(),
}))

vi.mock('../modals/CreateStudentModal', () => ({
  default: ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => (
    <div>
      <button type="button" onClick={() => { onCreated(); onClose() }}>
        Add Now
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.mocked(getStudents).mockReset()
})

describe('Instructor Students page', () => {
  it('shows empty state and opens modal from empty CTA', () => {
    vi.mocked(getStudents).mockReturnValue([])
    render(<Students />)

    expect(screen.getByText(/No students yet/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Add your first student/i }))
    expect(screen.getByRole('button', { name: /Add Now/i })).toBeTruthy()
  })

  it('renders students list and refreshes after onCreated', () => {
    let current: InstructorStudent[] = [{ id: 's1', firstName: 'Alice', lastName: 'A', email: 'a@test.com', employeeId: '' }]
    vi.mocked(getStudents).mockImplementation(() => current)

    render(<Students />)

    expect(screen.getByText(/Alice A/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Add Student/i }))
    current = [
      { id: 's1', firstName: 'Alice', lastName: 'A', email: 'a@test.com', employeeId: '' },
      { id: 's2', firstName: 'Bob', lastName: 'B', email: 'b@test.com', employeeId: 'E2' },
    ]
    fireEvent.click(screen.getByRole('button', { name: /Add Now/i }))

    expect(screen.getByText(/Bob B/i)).toBeTruthy()
    expect(screen.getByText('E2')).toBeTruthy()
  })
})
