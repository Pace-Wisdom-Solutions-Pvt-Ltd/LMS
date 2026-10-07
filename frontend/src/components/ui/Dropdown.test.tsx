// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import Dropdown from './Dropdown'

afterEach(() => cleanup())

describe('Dropdown', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ]

  it('renders placeholder when no selection', () => {
    render(
      <Dropdown
        label="My Dropdown"
        value=""
        options={options}
        onChange={vi.fn()}
        placeholder="Pick one"
      />,
    )
    expect(screen.getByRole('button', { name: /my dropdown/i })).toBeTruthy()
    expect(screen.getByText('Pick one')).toBeTruthy()
  })

  it('opens menu, selects option, calls onChange, and closes', () => {
    const onChange = vi.fn()
    render(
      <Dropdown
        label="Select Item"
        value={'a'}
        options={options}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /select item/i }))
    expect(screen.getByText('Beta')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByText('Beta')).toBeNull()
  })

  it('closes on Escape and outside click', () => {
    render(
      <Dropdown
        label="Esc Close"
        value={'a'}
        options={options}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /esc close/i }))
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Alpha' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /esc close/i }))
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: 'Alpha' })).toBeNull()
  })

  it('respects disabled state', () => {
    const onChange = vi.fn()
    render(
      <Dropdown
        label="Disabled"
        value={'a'}
        options={options}
        onChange={onChange}
        disabled
      />,
    )
    const trigger = screen.getByRole('button', { name: /disabled/i })
    expect((trigger as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(trigger)
    // Trigger text still shows selected option, but menu should not open
    expect(screen.queryByRole('button', { name: 'Alpha' })).toBeNull()
  })

  it('renders required indicator', () => {
    render(<Dropdown label="Pick" value="" options={options} onChange={() => {}} required />)
    expect(screen.getByText('*')).toBeTruthy()
  })
})
