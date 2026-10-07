// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: React.ReactNode
  /** Max width class, e.g. max-w-md, max-w-lg */
  maxWidth?: string
}

/** Renders modal to document.body for correct positioning. Centered overlay with scroll support. */
export default function Modal({ open, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  if (!open) return null

  return createPortal(
    <dialog
      className="fixed inset-0 z-9999 w-full max-w-none overflow-y-auto py-8 bg-transparent"
      open
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px] cursor-default"
      />
      {/* Centered content - min-h-[calc(100vh-4rem)] ensures vertical centering when scrollable */}
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div
          className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl p-6 animate-slide-down`}
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  )
}
