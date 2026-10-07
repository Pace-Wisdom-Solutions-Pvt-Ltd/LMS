// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { MOCK_PROGRAMS } from './data'

describe('student data', () => {
  it('exports mock programs', () => {
    expect(MOCK_PROGRAMS.length).toBeGreaterThan(0)
    expect(MOCK_PROGRAMS[0].courses?.[0]?.sections?.length).toBeGreaterThan(0)
  })
})
