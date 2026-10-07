// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@/lib/toastApi', () => ({
  getToasts: vi.fn(),
  subscribeToasts: vi.fn(),
  dismissToast: vi.fn(),
}))

import * as toastApi from '@/lib/toastApi'
const mockGetToasts = vi.mocked(toastApi.getToasts)
const mockSubscribeToasts = vi.mocked(toastApi.subscribeToasts)
const mockDismissToast = vi.mocked(toastApi.dismissToast)

import ToastContainer from './Toast'
import type { ToastItem } from '@/lib/toastApi'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockSubscribeToasts.mockReturnValue(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

function makeToast(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: '1',
    message: 'Test message',
    type: 'success',
    duration: 3000,
    ...overrides,
  }
}

describe('ToastContainer', () => {
  it('renders nothing when there are no toasts', () => {
    mockGetToasts.mockReturnValue([])
    const { container } = render(<ToastContainer />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a success toast', async () => {
    mockGetToasts.mockReturnValue([makeToast({ type: 'success', message: 'Success!' })])
    render(<ToastContainer />)
    expect(screen.getByText('Success!')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('renders an error toast', () => {
    mockGetToasts.mockReturnValue([makeToast({ type: 'error', message: 'Error occurred' })])
    render(<ToastContainer />)
    expect(screen.getByText('Error occurred')).toBeTruthy()
  })

  it('renders a warning toast', () => {
    mockGetToasts.mockReturnValue([makeToast({ type: 'warning', message: 'Warning!' })])
    render(<ToastContainer />)
    expect(screen.getByText('Warning!')).toBeTruthy()
  })

  it('renders an info toast', () => {
    mockGetToasts.mockReturnValue([makeToast({ type: 'info', message: 'Info message' })])
    render(<ToastContainer />)
    expect(screen.getByText('Info message')).toBeTruthy()
  })

  it('renders multiple toasts', () => {
    mockGetToasts.mockReturnValue([
      makeToast({ id: '1', message: 'Toast 1', type: 'success' }),
      makeToast({ id: '2', message: 'Toast 2', type: 'error' }),
    ])
    render(<ToastContainer />)
    expect(screen.getByText('Toast 1')).toBeTruthy()
    expect(screen.getByText('Toast 2')).toBeTruthy()
  })

  it('calls dismissToast when close button is clicked', async () => {
    mockGetToasts.mockReturnValue([makeToast({ id: 'toast-1', duration: 0 })])
    render(<ToastContainer />)
    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(mockDismissToast).toHaveBeenCalledWith('toast-1')
  })

  it('auto-dismisses after duration', async () => {
    mockGetToasts.mockReturnValue([makeToast({ id: 'auto-toast', duration: 2000 })])
    render(<ToastContainer />)
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(mockDismissToast).toHaveBeenCalledWith('auto-toast')
  })

  it('does not auto-dismiss when duration is 0', async () => {
    mockGetToasts.mockReturnValue([makeToast({ id: 'persistent', duration: 0 })])
    render(<ToastContainer />)
    await act(async () => {
      vi.advanceTimersByTime(10000)
    })
    expect(mockDismissToast).not.toHaveBeenCalled()
  })

  it('subscribes to toasts on mount and unsubscribes on unmount', () => {
    const unsub = vi.fn()
    mockSubscribeToasts.mockReturnValue(unsub)
    mockGetToasts.mockReturnValue([makeToast()])
    const { unmount } = render(<ToastContainer />)
    expect(mockSubscribeToasts).toHaveBeenCalled()
    unmount()
    expect(unsub).toHaveBeenCalled()
  })

  it('toast without duration does not auto-dismiss', async () => {
    mockGetToasts.mockReturnValue([makeToast({ duration: undefined })])
    render(<ToastContainer />)
    await act(async () => {
      vi.advanceTimersByTime(10000)
    })
    expect(mockDismissToast).not.toHaveBeenCalled()
  })
})
