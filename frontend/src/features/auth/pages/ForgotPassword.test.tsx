// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => cleanup())

vi.mock('@/components/ui/BackButton', () => ({
  default: ({ label, onClick }: { label?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{label ?? 'Back'}</button>
  ),
}))

const mockShowToast = vi.fn()
vi.mock('@/lib/toastApi', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const mockForgotPasswordApi = vi.fn()
vi.mock('@/lib/api/auth', () => ({
  forgotPasswordApi: (...args: unknown[]) => mockForgotPasswordApi(...args),
}))

import ForgotPassword from './ForgotPassword'

function renderPage() {
  return render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
}

function submitEmail(container: HTMLElement, value: string) {
  const emailInput = container.querySelector('input') as HTMLInputElement
  fireEvent.change(emailInput, { target: { value } })
  fireEvent.submit(container.querySelector('form')!)
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    mockShowToast.mockClear()
    mockForgotPasswordApi.mockReset()
    mockForgotPasswordApi.mockResolvedValue(undefined)
  })

  it('renders without crashing', () => {
    const { container } = renderPage()
    expect(container.firstChild).toBeTruthy()
  })

  it('renders email input', () => {
    const { container } = renderPage()
    const emailInput = container.querySelector('input[type="email"], input[placeholder*="example" i]')
    expect(emailInput).toBeTruthy()
  })

  it('shows Forgot Password heading', () => {
    const { container } = renderPage()
    expect(container.textContent?.toLowerCase()).toContain('forgot')
  })

  it('shows error when submitted with empty email', () => {
    const { container } = renderPage()
    fireEvent.submit(container.querySelector('form')!)
    expect(container.textContent).toContain('Please enter your email.')
    expect(mockForgotPasswordApi).not.toHaveBeenCalled()
  })

  it('shows a warning toast for an invalid email', () => {
    const { container } = renderPage()
    submitEmail(container, 'not-an-email')
    expect(mockShowToast).toHaveBeenCalledWith('Enter a valid email address.', 'warning')
    expect(mockForgotPasswordApi).not.toHaveBeenCalled()
  })

  it('shows Check your email after valid email submitted', async () => {
    const { container } = renderPage()
    submitEmail(container, '  Test@Example.com ')
    await waitFor(() => expect(container.textContent).toContain('Check your email'))
    expect(mockForgotPasswordApi).toHaveBeenCalledWith('test@example.com')
    expect(container.textContent).toContain('Back to sign in')
  })

  it('shows error toast when the API call fails', async () => {
    mockForgotPasswordApi.mockRejectedValue(new Error('Server down'))
    const { container } = renderPage()
    submitEmail(container, 'user@test.com')
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Server down', 'error'))
    expect(container.textContent).not.toContain('Check your email')
  })

  it('shows fallback error toast for non-Error rejections', async () => {
    mockForgotPasswordApi.mockRejectedValue('boom')
    const { container } = renderPage()
    submitEmail(container, 'user@test.com')
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Failed to send reset link. Please try again.', 'error'),
    )
  })
})
