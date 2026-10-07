// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { ChevronRight } from 'lucide-react'

export interface ChoiceCardProps {
  icon: React.ReactNode
  title: string
  description?: string
  /** Highlights the card as the recommended / current choice. */
  selected?: boolean
  /** Text colour applied to icon + title when selected. */
  color?: string
  /** Background applied to the icon chip (and card when selected). */
  bg?: string
  /** Border colour applied when selected. */
  border?: string
  onClick: () => void
}

/**
 * A single selectable option rendered as a card with an icon, title and
 * description. Used by the login "Continue as" flow for both role and
 * organization selection, and available for any other pick-one-of-many UI.
 */
export default function ChoiceCard({
  icon,
  title,
  description,
  selected = false,
  color = 'text-brand-teal',
  bg = 'bg-brand-teal/8',
  border = 'border-brand-teal/30',
  onClick,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full group flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all duration-150 hover:shadow-md active:scale-[0.98] ${
        selected ? `${border} ${bg} shadow-sm` : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden ${bg} ${color} ${selected ? '' : 'group-hover:scale-105 transition-transform'}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className={`font-semibold text-[14px] ${selected ? color : 'text-slate-800'}`}>{title}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>}
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${selected ? color : 'text-slate-300'}`} />
    </button>
  )
}
