// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

interface PageCardProps {
  title?: string
  children?: React.ReactNode
  /** Extra classes appended to the card wrapper (e.g. spacing). */
  className?: string
}

export default function PageCard({ title, children, className = '' }: PageCardProps) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 sm:p-8 ${className}`.trim()}>
      {title ? <h2 className="text-xl font-bold text-slate-800 mb-5 tracking-tight">{title}</h2> : null}
      {children ?? (
        <p className="text-slate-600">This page is under construction. (UI only)</p>
      )}
    </div>
  )
}
