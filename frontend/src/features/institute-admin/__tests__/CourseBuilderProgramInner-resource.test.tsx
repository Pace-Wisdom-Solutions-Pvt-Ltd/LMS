// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

import { ProgramInner } from '../course-builder/CourseBuilderProgramInner'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => cleanup())

describe('CourseBuilderProgramInner resource modal', () => {
  it('switches resource type, edits URL and outline, then cancels', async () => {
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
    await user.click(screen.getByRole('menuitem', { name: /\+\s*resource/i }))

    const modal = screen.getByRole('dialog')
    expect(within(modal).getByText(/add resource/i)).toBeTruthy()

    // Switch type Link -> PDF via the type dropdown (menu renders in a portal)
    fireEvent.click(within(modal).getByRole('button', { name: /^link$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^pdf$/i }))
    expect(within(modal).getByRole('button', { name: /^pdf$/i })).toBeTruthy()

    const urlInput = within(modal).getByLabelText(/^url$/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/a.pdf' } })
    expect((urlInput as HTMLInputElement).value).toBe('https://example.com/a.pdf')

    const outline = within(modal).getByLabelText(/quick outline/i)
    fireEvent.change(outline, { target: { value: 'outline x' } })
    expect((outline as HTMLInputElement).value).toBe('outline x')

    // Cancel closes (covers cancel handler)
    fireEvent.click(within(modal).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('task modal can be closed via X (onClose handler)', async () => {
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
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByRole('button', { name: /^close$/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

