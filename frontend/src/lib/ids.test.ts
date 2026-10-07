// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'

import { newId, randomInt } from './ids'

describe('ids', () => {
  it('newId uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '123e4567-e89b-12d3-a456-426614174000')
    vi.stubGlobal('crypto', { randomUUID })

    expect(newId('x')).toBe('x-123e4567-e89b-12d3-a456-426614174000')
    expect(randomUUID).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('newId falls back to crypto.getRandomValues when randomUUID is missing', () => {
    const getRandomValues = vi.fn((buf: Uint32Array) => {
      buf[0] = 0x1
      buf[1] = 0x2
      buf[2] = 0x3
      buf[3] = 0x4
      return buf
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(newId('p')).toBe('p-00000001000000020000000300000004')
    expect(getRandomValues).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('randomInt returns 0 for invalid maxExclusive', () => {
    expect(randomInt(0)).toBe(0)
    expect(randomInt(-1)).toBe(0)
    expect(randomInt(Number.NaN)).toBe(0)
  })

  it('randomInt uses crypto.getRandomValues when available', () => {
    const getRandomValues = vi.fn((buf: Uint32Array) => {
      buf[0] = 42
      return buf
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(randomInt(10)).toBe(2)
    expect(getRandomValues).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})

