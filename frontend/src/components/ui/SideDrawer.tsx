// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  /** Heading shown in the drawer header. */
  title: string
  /** Optional secondary line under the title. */
  subtitle?: React.ReactNode
  /** Optional row rendered under the header — filters, tabs, search, etc. */
  toolbar?: React.ReactNode
  /** Optional sticky footer, e.g. action buttons. */
  footer?: React.ReactNode
  /** Max width class for the panel, e.g. max-w-lg, max-w-2xl. */
  maxWidth?: string
  children: React.ReactNode
}

/**
 * Right-hand slide-over panel rendered to `document.body`.
 *
 * Use it instead of a centered `Modal` when the content is a list the user
 * scans and drills into while the page behind stays visible for context.
 */
export default function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  toolbar,
  footer,
  maxWidth = 'max-w-lg',
  children,
}: Readonly<SideDrawerProps>) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-9999 flex justify-end">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] cursor-default"
      />
      <aside
        aria-label={title}
        className={`relative z-10 flex h-full w-full ${maxWidth} flex-col bg-white shadow-2xl animate-slide-in-right`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {toolbar && <div className="border-b border-slate-100 px-5 py-3">{toolbar}</div>}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body
  )
}
