// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { newId } from './ids'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number // ms – 0 = sticky
}

type Listener = () => void
let toasts: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function showToast(
  message: string,
  type: ToastType = 'error',
  duration = 4000
): string {
  const id = newId('toast')
  toasts = [...toasts, { id, message, type, duration }]
  emit()
  return id
}

export function updateToast(
  id: string,
  patch: Partial<Pick<ToastItem, 'message' | 'type' | 'duration'>>
) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t))
  emit()
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function getToasts(): ToastItem[] {
  return toasts
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Runs an upload/save action behind a sticky "uploading…" toast, then
 * flips that same toast to success or failure once the request settles —
 * instead of a separate loading indicator plus a follow-up toast.
 */
export async function withUploadToast<T>(
  label: string,
  action: () => Promise<T>,
  opts?: { loadingMessage?: string; successMessage?: string }
): Promise<T> {
  const id = showToast(opts?.loadingMessage ?? `Uploading ${label}…`, 'loading', 0)
  try {
    const result = await action()
    updateToast(id, {
      message: opts?.successMessage ?? `${label} uploaded successfully.`,
      type: 'success',
      duration: 4000,
    })
    return result
  } catch (err) {
    updateToast(id, {
      message: err instanceof Error ? err.message : `Failed to upload ${label}.`,
      type: 'error',
      duration: 5000,
    })
    throw err
  }
}
