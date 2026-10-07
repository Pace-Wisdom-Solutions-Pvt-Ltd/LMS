// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dismissToast, getToasts, showToast, subscribeToasts } from './toastApi'

describe('toastApi', () => {
  beforeEach(() => {
    // Clear all toasts between tests
    getToasts().forEach((t) => dismissToast(t.id))
  })

  it('showToast adds a toast and notifies subscribers', () => {
    const randomUUID = vi.fn(() => 'fixed-uuid')
    vi.stubGlobal('crypto', { randomUUID })

    const listener = vi.fn()
    const unsubscribe = subscribeToasts(listener)

    showToast('Hello', 'success', 123)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getToasts()).toEqual([
      { id: 'toast-fixed-uuid', message: 'Hello', type: 'success', duration: 123 },
    ])

    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('dismissToast removes a toast', () => {
    showToast('To dismiss', 'info')
    const id = getToasts().at(-1)!.id
    dismissToast(id)
    expect(getToasts().find((t) => t.id === id)).toBeUndefined()
  })
})
