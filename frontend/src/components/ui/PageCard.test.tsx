// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageCard from './PageCard'

describe('PageCard', () => {
  it('renders title', () => {
    render(<PageCard title="My Card" />)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<PageCard title="Card"><span>Child content</span></PageCard>)
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders default placeholder when no children', () => {
    const { container } = render(<PageCard title="Empty" />)
    expect(container.textContent).toContain('under construction')
  })
})
