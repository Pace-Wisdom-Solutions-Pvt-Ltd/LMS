// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from './Input'

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Course Name" />)
    expect(screen.getByLabelText('Course Name')).toBeInTheDocument()
  })

  it('forwards typing to onChange', async () => {
    const onChange = vi.fn()
    render(<Input label="Name" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Name'), 'hi')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders an error message and marks the field invalid', () => {
    render(<Input label="Email" error="Required" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('shows a hint when there is no error', () => {
    render(<Input label="Slug" hint="lowercase only" />)
    expect(screen.getByText('lowercase only')).toBeInTheDocument()
  })

  it('hides the hint when an error is present', () => {
    render(<Input label="Slug" hint="lowercase only" error="Bad slug" />)
    expect(screen.queryByText('lowercase only')).not.toBeInTheDocument()
    expect(screen.getByText('Bad slug')).toBeInTheDocument()
  })

  it('exposes the input via ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input label="Focusable" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
