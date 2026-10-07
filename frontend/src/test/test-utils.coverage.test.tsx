// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'

import { renderWithRouter } from './test-utils'

describe('test utils', () => {
  it('renderWithRouter renders UI inside MemoryRouter', () => {
    renderWithRouter(<div>hello</div>)
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('renderWithRouter respects initialEntries', () => {
    renderWithRouter(<div>route ok</div>, { initialEntries: ['/x'] })
    expect(screen.getByText('route ok')).toBeTruthy()
  })
})

