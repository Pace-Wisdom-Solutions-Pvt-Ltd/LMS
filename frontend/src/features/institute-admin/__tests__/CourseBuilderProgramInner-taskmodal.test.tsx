// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

import { showToast } from '@/lib/toastApi'
import { ProgramInner } from '../course-builder/CourseBuilderProgramInner'

describe('CourseBuilderProgramInner task modal', () => {
  it('adds a task in non-API mode and can cancel', async () => {
    const user = userEvent.setup()
    render(
      <ProgramInner
        programId="program-1"
        refresh={vi.fn()}
        requestConfirm={vi.fn(async () => true)}
        nodeEditLoading={null}
        setNodeEditLoading={vi.fn()}
        setNodeEditModal={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /\+\s*task/i }))

    // Validation warning if missing title/formats
    const modal = screen.getByRole('dialog')
    const form1 = within(modal).getByRole('button', { name: /^add$/i }).closest('form')
    expect(form1).toBeTruthy()
    if (!form1) return
    fireEvent.submit(form1)
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Title and at least one format are required.', 'warning')

    await user.type(within(modal).getByLabelText(/title/i), 'Task 1')
    // pick first submission format checkbox
    const checkbox = within(modal).getAllByRole('checkbox').at(0)
    expect(checkbox).toBeTruthy()
    if (checkbox) await user.click(checkbox)

    // Submit creates task and closes modal
    const form2 = within(modal).getByRole('button', { name: /^add$/i }).closest('form')
    expect(form2).toBeTruthy()
    if (!form2) return
    fireEvent.submit(form2)
    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Task added.', 'success')
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Edit the created task (covers editingTaskId branch)
    const taskCard = screen.getByText('Task 1').closest('li')
    expect(taskCard).toBeTruthy()
    if (taskCard) {
      await user.click(within(taskCard).getByRole('button', { name: /^edit$/i }))
      const editModal = screen.getByRole('dialog')
      await user.clear(within(editModal).getByLabelText(/title/i))
      await user.type(within(editModal).getByLabelText(/title/i), 'Task 1 updated')
      const formEdit = within(editModal).getByRole('button', { name: /^save$/i }).closest('form')
      expect(formEdit).toBeTruthy()
      if (formEdit) fireEvent.submit(formEdit)
      await waitFor(() => {
        expect(vi.mocked(showToast)).toHaveBeenCalledWith('Task updated.', 'success')
      })
    }

    // Open again and cancel (covers cancel button branch)
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /\+\s*task/i }))
    const modal2 = screen.getByRole('dialog')
    await user.click(within(modal2).getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

