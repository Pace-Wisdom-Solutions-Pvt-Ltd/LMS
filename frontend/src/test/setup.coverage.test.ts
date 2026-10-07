// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'

// Importing setup directly ensures it is instrumented by coverage
// (some tooling ignores setupFiles from coverage computation).
import './setup'

describe('test setup', () => {
  it('installs expected browser/test polyfills', () => {
    expect(typeof globalThis.matchMedia).toBe('function')
    expect(typeof globalThis.IntersectionObserver).toBe('function')
    expect(typeof globalThis.scrollTo).toBe('function')

    // import.meta.env is used across the app
    expect(typeof import.meta.env).toBe('object')
    expect(typeof import.meta.env.VITE_API_BASE_URL).toBe('string')
  })
})

