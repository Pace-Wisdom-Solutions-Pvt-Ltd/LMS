// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle, Loader2 } from 'lucide-react'
import {
  getToasts,
  subscribeToasts,
  dismissToast,
  type ToastItem,
  type ToastType,
} from '@/lib/toastApi'

function useToasts() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    const unsub = subscribeToasts(listener)
    return unsub
  }, [])

  return getToasts()
}

/* ────────── config ────────── */
const ICON_MAP: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="h-5 w-5" />,
  success: <CheckCircle2 className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  loading: <Loader2 className="h-5 w-5 animate-spin" />,
}

const COLOR_MAP: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    text: 'text-red-800',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    text: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    text: 'text-amber-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    text: 'text-blue-800',
  },
  loading: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'text-teal-600',
    text: 'text-teal-800',
  },
}

/* ────────── single toast ────────── */
function ToastCard({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  const close = useCallback(() => {
    setExiting(true)
    setTimeout(() => dismissToast(item.id), 300)
  }, [item.id])

  useEffect(() => {
    // enter animation
    const enter = requestAnimationFrame(() => setVisible(true))
    // auto-dismiss
    if (item.duration && item.duration > 0) {
      const timer = setTimeout(close, item.duration)
      return () => { cancelAnimationFrame(enter); clearTimeout(timer) }
    }
    return () => cancelAnimationFrame(enter)
  }, [item.duration, close])

  const c = COLOR_MAP[item.type]

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${c.bg} ${c.border} ${
        visible && !exiting
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${c.icon}`}>{ICON_MAP[item.type]}</span>
      <p className={`text-[13px] font-medium leading-snug flex-1 ${c.text}`}>
        {item.message}
      </p>
      <button
        onClick={close}
        className="shrink-0 p-0.5 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ────────── container (mount once in App) ────────── */
export default function ToastContainer() {
  const items = useToasts()

  if (items.length === 0) return null

  return createPortal(
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-auto">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>,
    document.body
  )
}
