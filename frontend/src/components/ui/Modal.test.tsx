// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Modal open={false}>Content</Modal>)
    expect(container.innerHTML).toBe('')
  })

  it('renders children when open', () => {
    render(<Modal open>Hello Modal</Modal>)
    expect(screen.getByText('Hello Modal')).toBeInTheDocument()
  })

  it('shows close button when onClose provided', () => {
    render(<Modal open onClose={() => {}}>Content</Modal>)
    const closeButtons = screen.getAllByLabelText('Close')
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders with aria-modal', () => {
    const { container } = render(<Modal open>Content</Modal>)
    expect(container.querySelector('[aria-modal]')).toBeTruthy()
  })
})
