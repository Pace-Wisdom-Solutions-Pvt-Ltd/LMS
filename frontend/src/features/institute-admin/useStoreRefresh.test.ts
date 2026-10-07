// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStoreRefresh } from './useStoreRefresh'

describe('useStoreRefresh', () => {
  it('returns a function', () => {
    const { result } = renderHook(() => useStoreRefresh())
    expect(typeof result.current).toBe('function')
  })

  it('calling refresh does not throw', () => {
    const { result } = renderHook(() => useStoreRefresh())
    expect(() => act(() => result.current())).not.toThrow()
  })

  it('calling refresh multiple times is stable', () => {
    const { result } = renderHook(() => useStoreRefresh())
    const firstRef = result.current
    act(() => result.current())
    // The function reference should be stable (useCallback)
    expect(result.current).toBe(firstRef)
  })
})
