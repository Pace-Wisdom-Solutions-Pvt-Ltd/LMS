// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ProgramInner } from '../course-builder/CourseBuilderProgramInner'

vi.mock('@/lib/api/organizations', () => ({
  deleteModuleNodeApi: vi.fn().mockResolvedValue(undefined),
  getModuleNodeApi: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
}))

describe('CourseBuilderProgramInner quiz drawer', () => {
  it('can open quiz drawer, edit draft questions, create quiz, and close', async () => {
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
    await user.click(screen.getByRole('menuitem', { name: /\+\s*quiz/i }))

    expect(screen.getByText(/add quiz/i)).toBeTruthy()

    // Add second question, then remove one (covers removeDraft branch)
    await user.click(screen.getByRole('button', { name: /add another question/i }))
    const removeQuestionBtn = screen.getAllByRole('button', { name: /remove/i }).at(0)
    expect(removeQuestionBtn).toBeTruthy()
    if (removeQuestionBtn) await user.click(removeQuestionBtn)

    // Fill draft question + options and select correct option (covers radio onChange branch)
    const questionText = screen.getByPlaceholderText(/enter the question text/i)
    await user.type(questionText, 'What is 2+2?')
    const opt1 = screen.getByPlaceholderText(/option 1/i)
    const opt2 = screen.getByPlaceholderText(/option 2/i)
    await user.type(opt1, '4')
    await user.type(opt2, '5')
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThanOrEqual(2)
    await user.click(radios[0])
    expect((radios[0] as HTMLInputElement).checked).toBe(true)

    // Add a third option then remove it (covers remove option branch while keeping >= 2 options)
    await user.click(screen.getByRole('button', { name: /add option/i }))
    const opt3 = screen.getByPlaceholderText(/option 3/i)
    await user.type(opt3, '6')
    const removeButtons = screen.getAllByLabelText(/remove option/i)
    expect(removeButtons.length).toBeGreaterThanOrEqual(1)
    const removeBtn = removeButtons.at(-1)
    expect(removeBtn).toBeTruthy()
    if (removeBtn) await user.click(removeBtn)

    // Create quiz: in local mode the drawer stays open and switches to "Edit Quiz"
    await user.type(screen.getByPlaceholderText(/js basics quiz/i), 'Quick quiz')
    await user.click(screen.getByRole('button', { name: /create quiz/i }))
    expect(await screen.findByText(/edit quiz/i)).toBeTruthy()

    // Questions panel + option rendering
    expect(screen.getByText(/^Questions$/)).toBeTruthy()
    expect(screen.getByText(/^q1$/i)).toBeTruthy()
    expect(screen.getByText(/what is 2\+2\?/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /quiz created/i })).toHaveProperty('disabled', true)

    // Close drawer via X button (covers close handler while editing)
    await user.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/edit quiz/i)).toBeNull()

    // Open edit drawer for the created quiz from the curriculum list
    const quizCard = screen.getByText('Quick quiz').closest('li')
    expect(quizCard).toBeTruthy()
    if (!quizCard) return
    await user.click(within(quizCard).getByRole('button', { name: /^edit$/i }))
    expect(await screen.findByText(/edit quiz/i)).toBeTruthy()
    expect(screen.getByText(/what is 2\+2\?/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/edit quiz/i)).toBeNull()
  })
})

