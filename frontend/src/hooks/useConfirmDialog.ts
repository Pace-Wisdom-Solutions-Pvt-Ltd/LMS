// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useRef, useState } from 'react'

export interface ConfirmDialogState {
  open: boolean
  message: string
  confirmText: string
  cancelText: string
}

export interface UseConfirmDialogReturn {
  confirmModal: ConfirmDialogState
  requestConfirm: (message: string) => Promise<boolean>
  handleConfirmClose: (value: boolean) => void
}

/**
 * Provides a promise-based confirm dialog that replaces `window.confirm`.
 *
 * Usage:
 *   const { confirmModal, requestConfirm, handleConfirmClose } = useConfirmDialog()
 *
 *   // In an event handler:
 *   if (!(await requestConfirm('Are you sure?'))) return
 *
 *   // In JSX, render a Modal controlled by confirmModal.open and wired to handleConfirmClose.
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogState>({
    open: false,
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
  })
  const confirmResolveRef = useRef<null | ((value: boolean) => void)>(null)

  const requestConfirm = (message: string): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmModal({ open: true, message, confirmText: 'OK', cancelText: 'Cancel' })
    })

  const handleConfirmClose = (value: boolean): void => {
    confirmResolveRef.current?.(value)
    confirmResolveRef.current = null
    setConfirmModal((p) => ({ ...p, open: false }))
  }

  return { confirmModal, requestConfirm, handleConfirmClose }
}
