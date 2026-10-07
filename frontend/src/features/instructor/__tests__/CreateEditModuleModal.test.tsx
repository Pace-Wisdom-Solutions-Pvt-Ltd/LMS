// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

import CreateEditModuleModal from '../modals/CreateEditModuleModal'
import type { ContentSection, CreateModulePayload } from '../store'

describe('CreateEditModuleModal', () => {
  let onClose: Mock<() => void>
  let onSubmit: Mock<(payload: CreateModulePayload) => void>

  beforeEach(() => {
    onClose = vi.fn()
    onSubmit = vi.fn()
  })

  afterEach(() => cleanup())

  const renderModal = (props: Partial<Parameters<typeof CreateEditModuleModal>[0]> = {}) =>
    render(
      <CreateEditModuleModal
        open={true}
        onClose={onClose}
        onSubmit={onSubmit}
        {...props}
      />,
    )

  it('renders nothing when open is false', () => {
    render(
      <CreateEditModuleModal
        open={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.queryByRole('heading', { name: 'Create Module' })).toBeNull()
  })

  it('renders the Create Module heading when no editingSection', () => {
    renderModal()
    expect(screen.getByRole('heading', { name: 'Create Module' })).toBeTruthy()
  })

  it('renders the Edit Module heading when editingSection is provided', async () => {
    const section: ContentSection = {
      id: 's1',
      title: 'Existing Module',
      description: 'Desc',
      contentType: 'Video',
      duration: 30,
      order: 2,
      status: 'published',
      items: [],
    }
    renderModal({ editingSection: section })
    // queueMicrotask is used, so wait for it
    await waitFor(() => {
      expect(screen.getByText('Edit Module')).toBeTruthy()
    })
  })

  it('populates fields from editingSection', async () => {
    const section: ContentSection = {
      id: 's1',
      title: 'Existing Module',
      description: 'Some description',
      contentType: 'PDF',
      duration: 45,
      order: 3,
      status: 'published',
      items: [],
    }
    renderModal({ editingSection: section })
    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('e.g. Introduction to JavaScript') as HTMLInputElement
      expect(titleInput.value).toBe('Existing Module')
    })
    const descInput = screen.getByPlaceholderText('Describe the module content...') as HTMLTextAreaElement
    expect(descInput.value).toBe('Some description')
    const durationInput = screen.getByPlaceholderText('e.g. 30') as HTMLInputElement
    expect(durationInput.value).toBe('45')
  })

  it('resets fields when opening without editingSection', async () => {
    renderModal({ nextOrder: 5 })
    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('e.g. Introduction to JavaScript') as HTMLInputElement
      expect(titleInput.value).toBe('')
    })
  })

  it('calls onSubmit with correct payload when form is filled and submitted', async () => {
    renderModal({ nextOrder: 2 })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('e.g. Introduction to JavaScript'), {
      target: { value: 'My New Module' },
    })
    fireEvent.change(screen.getByPlaceholderText('Describe the module content...'), {
      target: { value: 'A description' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. 30'), {
      target: { value: '60' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create Module' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'My New Module',
      description: 'A description',
      contentType: undefined,
      duration: 60,
      order: 2,
      status: 'draft',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not submit when title is empty', async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })

    // Leave title empty, click submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Module' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not submit when title is only whitespace', async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('e.g. Introduction to JavaScript'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Module' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel button is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders status radio buttons defaulting to draft', async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })
    const draftRadio = screen.getByLabelText('Draft') as HTMLInputElement
    const publishedRadio = screen.getByLabelText('Published') as HTMLInputElement
    expect(draftRadio.checked).toBe(true)
    expect(publishedRadio.checked).toBe(false)
  })

  it('can switch status to published', async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })
    const publishedRadio = screen.getByLabelText('Published') as HTMLInputElement
    fireEvent.click(publishedRadio)
    expect(publishedRadio.checked).toBe(true)
  })

  it('submits with published status when switched', async () => {
    renderModal({ nextOrder: 1 })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('e.g. Introduction to JavaScript'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByLabelText('Published'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Module' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    )
  })

  it('renders description label text', () => {
    renderModal()
    expect(screen.getByText('Description (rich text)')).toBeTruthy()
  })

  it('renders Content Type label', () => {
    renderModal()
    expect(screen.getByText('Content Type')).toBeTruthy()
  })

  it('renders Duration and Order labels', () => {
    renderModal()
    expect(screen.getByText('Duration (minutes)')).toBeTruthy()
    expect(screen.getByText('Order Number')).toBeTruthy()
  })

  it('updates order field', async () => {
    renderModal({ nextOrder: 3 })
    await waitFor(() => {
      const orderInput = screen.getAllByRole('spinbutton').find(
        (el) => (el as HTMLInputElement).value === '3',
      ) as HTMLInputElement
      expect(orderInput).toBeTruthy()
    })
  })

  it('submits with description trimmed and empty description as undefined', async () => {
    renderModal({ nextOrder: 1 })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('e.g. Introduction to JavaScript'), {
      target: { value: 'Module X' },
    })
    // Leave description empty
    fireEvent.click(screen.getByRole('button', { name: 'Create Module' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: undefined }),
    )
  })

  it('handles editingSection with null duration', async () => {
    const section: ContentSection = {
      id: 's2',
      title: 'No Duration',
      order: 1,
      items: [],
    }
    renderModal({ editingSection: section })
    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('e.g. Introduction to JavaScript') as HTMLInputElement
      expect(titleInput.value).toBe('No Duration')
    })
    const durationInput = screen.getByPlaceholderText('e.g. 30') as HTMLInputElement
    expect(durationInput.value).toBe('')
  })

  it('shows Update Module button text when editing', async () => {
    const section: ContentSection = {
      id: 's1',
      title: 'Edit Me',
      order: 1,
      items: [],
    }
    renderModal({ editingSection: section })
    await waitFor(() => {
      expect(screen.getByText('Update Module')).toBeTruthy()
    })
  })

  it('submits with no duration when field is empty', async () => {
    renderModal({ nextOrder: 1 })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Introduction to JavaScript')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('e.g. Introduction to JavaScript'), {
      target: { value: 'No Duration Module' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Module' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ duration: undefined }),
    )
  })

  it('renders helper text about module fields', () => {
    renderModal()
    expect(
      screen.getByText(/Module Title, Description, Content Type/),
    ).toBeTruthy()
  })
})
