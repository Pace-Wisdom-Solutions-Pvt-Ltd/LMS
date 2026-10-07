// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const mockAddCourse = vi.fn()
const mockAddProgram = vi.fn()
const mockAddStudent = vi.fn()

vi.mock('../store', () => ({
  addCourse: (...args: unknown[]) => mockAddCourse(...args),
  addProgram: (...args: unknown[]) => mockAddProgram(...args),
  addStudent: (...args: unknown[]) => mockAddStudent(...args),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Instructor create modals', () => {
  it('CreateCourseModal: submits when required fields present', async () => {
    mockAddCourse.mockReturnValue({ id: 'c1' })
    const onClose = vi.fn()
    const onCreated = vi.fn()
    const { default: CreateCourseModal } = await import('../modals/CreateCourseModal')
    render(<CreateCourseModal onClose={onClose} onCreated={onCreated} />)

    // empty submit should not create
    fireEvent.submit(document.querySelector('form') as HTMLFormElement)
    expect(mockAddCourse).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Project name/i), { target: { value: '  My Project  ' } })
    fireEvent.change(screen.getByLabelText(/Project code/i), { target: { value: '  API-01 ' } })
    fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: '  Summary ' } })
    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    expect(mockAddCourse).toHaveBeenCalledWith({ name: 'My Project', code: 'API-01', summary: 'Summary' })
    expect(onCreated).toHaveBeenCalledWith('c1')
    expect(onClose).toHaveBeenCalled()
  })

  it('CreateProgramModal: requires name, calls onCreated and closes', async () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()
    const { default: CreateProgramModal } = await import('../modals/CreateProgramModal')
    render(<CreateProgramModal onClose={onClose} onCreated={onCreated} />)

    fireEvent.submit(document.querySelector('form') as HTMLFormElement)
    expect(mockAddProgram).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Program name/i), { target: { value: '  Advanced JS  ' } })
    fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: '  Desc  ' } })
    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    expect(mockAddProgram).toHaveBeenCalledWith({ name: 'Advanced JS', summary: 'Desc' })
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('CreateStudentModal: requires first/last/email and trims optional employeeId', async () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()
    const { default: CreateStudentModal } = await import('../modals/CreateStudentModal')
    render(<CreateStudentModal onClose={onClose} onCreated={onCreated} />)

    fireEvent.submit(document.querySelector('form') as HTMLFormElement)
    expect(mockAddStudent).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: '  John ' } })
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: '  Doe ' } })
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: '  john@example.com  ' } })
    fireEvent.change(screen.getByLabelText(/Employee ID/i), { target: { value: '  EMP001  ' } })
    fireEvent.submit(document.querySelector('form') as HTMLFormElement)

    expect(mockAddStudent).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employeeId: 'EMP001',
    })
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

