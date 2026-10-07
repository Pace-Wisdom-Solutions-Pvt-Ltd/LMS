// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import Modal from './Modal'

interface ConfirmationModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
  readonly title: string
  readonly message: string | React.ReactNode
  readonly confirmText?: string
  readonly cancelText?: string
  readonly type?: 'danger' | 'warning' | 'info'
  readonly isLoading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-amber-500" />
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />
      default:
        return <Info className="h-6 w-6 text-slate-500" />
    }
  }

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-100'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-100'
      default:
        return 'bg-slate-800 hover:bg-slate-900 text-white'
    }
  }

  const getIconBgColor = () => {
    if (type === 'danger') return 'bg-red-50'
    if (type === 'warning') return 'bg-amber-50'
    return 'bg-blue-50'
  }

  return (
    <Modal open={isOpen} onClose={isLoading ? undefined : onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center">
        {/* Icon Header */}
        <div className={`p-3 rounded-full mb-4 ${getIconBgColor()}`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <div className="text-slate-600 text-sm leading-relaxed">
            {message}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${getConfirmButtonStyles()}`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                {' '}Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
