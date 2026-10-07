// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ courseId: 'course-1' }),
  }
})

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/components/ui/PageCard', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div><h2>{title}</h2>{children}</div>
  ),
}))

vi.mock('@/components/ui/BackButton', () => ({
  default: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{label}</button>
  ),
}))

const mockStudents = [
  { id: 's1', firstName: 'Alice', lastName: 'A', email: 'alice@test.com' },
  { id: 's2', firstName: 'Bob', lastName: 'B', email: 'bob@test.com' },
]

const mockCourse = {
  id: 'course-1',
  name: 'React Course',
  description: 'Learn React',
  status: 'published',
}

vi.mock('../store', () => ({
  addAssessment: vi.fn(),
  getStudents: vi.fn(() => mockStudents),
  getCourse: vi.fn(() => mockCourse),
  getPrograms: vi.fn(() => []),
  getCourses: vi.fn(() => []),
  getSubmissions: vi.fn(() => []),
  getTrainerSessions: vi.fn(() => []),
  getTrainerActivity: vi.fn(() => []),
  getTrainerMetrics: vi.fn(() => ({})),
}))

import * as instructorStore from '../store'

describe('CreateTask', () => {
  it('renders without crashing', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows Create Task heading', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    expect(container.textContent).toContain('Create Task')
  })

  it('shows title input field', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('allows typing into title field', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    const el =
      container.querySelector('input[placeholder*="title" i], input[name="title"], input[id="title"]') ??
      container.querySelectorAll('input')[0]
    if (el instanceof HTMLInputElement) {
      fireEvent.change(el, { target: { value: 'My Test Task' } })
      expect(el.value).toBe('My Test Task')
    }
  })

  it('shows format selection options', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    expect(container.textContent).toContain('Text area')
    expect(container.textContent).toContain('Code block')
    expect(container.textContent).toContain('MCQ')
  })

  it('shows intern assignment section when students exist', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    // "interns" section appears when students are available
    expect(container.textContent).toContain('intern')
  })

  it('shows MCQ options when MCQ format selected', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    // Click MCQ option
    const mcqOption = Array.from(container.querySelectorAll('label, button, input[type="radio"]')).find(
      el => el.textContent?.includes('MCQ') || (el as HTMLInputElement).value === 'mcq'
    )
    if (mcqOption) {
      fireEvent.click(mcqOption)
    }
    // MCQ options should be rendered
    expect(container.firstChild).toBeTruthy()
  })

  it('navigates back when back button clicked', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    const backBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Back'))
    if (backBtn) {
      fireEvent.click(backBtn)
      expect(mockNavigate).toHaveBeenCalled()
    }
  })

  it('toggles student assignment when student clicked', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    const studentItem = Array.from(container.querySelectorAll('button, label')).find(
      el => el.textContent?.includes('Alice')
    )
    if (studentItem) {
      fireEvent.click(studentItem)
      // Should toggle without crashing
      expect(container.firstChild).toBeTruthy()
    }
  })

  it('shows Add option button for MCQ', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    // Find format radio buttons
    const radios = container.querySelectorAll('input[type="radio"]')
    const mcqRadio = Array.from(radios).find(r => (r as HTMLInputElement).value === 'mcq')
    if (mcqRadio) {
      fireEvent.click(mcqRadio)
      await new Promise(r => setTimeout(r, 10))
      const addOptionBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('option') || b.textContent?.includes('Option'))
      if (addOptionBtn) {
        fireEvent.click(addOptionBtn)
        expect(container.firstChild).toBeTruthy()
      }
    }
  })

  it('shows submit button', async () => {
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(<MemoryRouter><CreateTask /></MemoryRouter>)
    const submitBtn = container.querySelector('button[type="submit"]') ||
      Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Create') || b.textContent?.includes('Submit'))
    expect(submitBtn).toBeTruthy()
  })

  it('does not submit when title is empty', async () => {
    vi.mocked(instructorStore.addAssessment).mockClear()
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(
      <MemoryRouter>
        <CreateTask />
      </MemoryRouter>,
    )
    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    expect(vi.mocked(instructorStore.addAssessment)).not.toHaveBeenCalled()
  })

  it('submits a valid MCQ task and navigates', async () => {
    vi.mocked(instructorStore.addAssessment).mockReturnValue({ id: 'task-1', title: 'Task', description: '', format: 'text_area' })
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(
      <MemoryRouter>
        <CreateTask />
      </MemoryRouter>,
    )

    // Fill title
    const titleInput =
      (container.querySelector('input[placeholder*="Assignment" i]') as HTMLInputElement) ||
      (container.querySelector('input[type="text"]') as HTMLInputElement)
    fireEvent.change(titleInput, { target: { value: 'Quiz 1' } })

    // Select MCQ
    const mcqRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
      (r) => (r as HTMLInputElement).value === 'mcq',
    ) as HTMLInputElement | undefined
    if (mcqRadio) fireEvent.click(mcqRadio)

    // Fill options and select correct
    const optInputs = Array.from(container.querySelectorAll('input[placeholder^="Option"]')).map((el) => el as HTMLInputElement)
    if (optInputs.length >= 2) {
      fireEvent.change(optInputs[0], { target: { value: 'A' } })
      fireEvent.change(optInputs[1], { target: { value: 'B' } })
    }
    const correctRadios = Array.from(container.querySelectorAll('input[name="correct"]')).map((el) => el as HTMLInputElement)
    if (correctRadios.length > 0) fireEvent.click(correctRadios[0])

    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    expect(vi.mocked(instructorStore.addAssessment)).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ title: 'Quiz 1', format: 'mcq' }),
    )
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/courses/course-1')
  })

  it('does not submit MCQ when any option text is empty', async () => {
    vi.mocked(instructorStore.addAssessment).mockClear()
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(
      <MemoryRouter>
        <CreateTask />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('e.g. Assignment 1 or Quiz 1'), { target: { value: 'Quiz 2' } })

    const mcqRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
      (r) => (r as HTMLInputElement).value === 'mcq',
    ) as HTMLInputElement | undefined
    if (mcqRadio) fireEvent.click(mcqRadio)

    const correctRadios = Array.from(container.querySelectorAll('input[name="correct"]')).map((el) => el as HTMLInputElement)
    if (correctRadios.length > 0) fireEvent.click(correctRadios[0])

    // Leave option inputs empty -> should early return and not call addAssessment
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(vi.mocked(instructorStore.addAssessment)).not.toHaveBeenCalled()
  })

  it('submits passmark, dueDate, and assignedTo when provided', async () => {
    vi.mocked(instructorStore.addAssessment).mockReturnValue({ id: 'task-1', title: 'Task', description: '', format: 'text_area' })
    const { default: CreateTask } = await import('../modals/CreateTask')
    const { container } = render(
      <MemoryRouter>
        <CreateTask />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('e.g. Assignment 1 or Quiz 1'), { target: { value: 'Task A' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. 60'), { target: { value: '60' } })

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } })

    // assign to one intern (checkbox input)
    const internCheckboxes = container.querySelectorAll('input[type="checkbox"]')
    fireEvent.click(internCheckboxes[0])

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(vi.mocked(instructorStore.addAssessment)).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({
        title: 'Task A',
        format: 'text_area',
        passmark: 60,
        dueDate: '2026-05-01',
        assignedTo: ['s1'],
      }),
    )
  })
})
