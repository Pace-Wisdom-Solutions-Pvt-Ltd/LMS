// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const baseClass =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 hover:border-brand-teal/30 hover:text-brand-teal transition-all'

interface BackButtonProps {
  label: string
  onClick?: () => void
  to?: string
}

export default function BackButton({ label, onClick, to }: BackButtonProps) {
  const content = (
    <>
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {label}
    </>
  )

  if (to != null) {
    return (
      <Link to={to} className={baseClass}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {content}
    </button>
  )
}
