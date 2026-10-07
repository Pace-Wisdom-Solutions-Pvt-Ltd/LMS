// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export interface DropdownOption<T = string> {
  value: T
  label: string
  badge?: string
  style?: React.CSSProperties
}

const BADGE_COLORS: Record<string, string> = {
  MCQ: 'bg-teal-50 text-teal-700',
  CODING: 'bg-blue-50 text-blue-700',
  TASK: 'bg-purple-50 text-purple-700',
}

type DropdownProps<T = string> = Readonly<{
  label?: string
  required?: boolean
  value: T
  /** Accepts `readonly` arrays so callers can pass frozen option constants. */
  options: readonly DropdownOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  compact?: boolean
  className?: string
}>

export default function Dropdown<T extends string>({
  label,
  required = false,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  compact = false,
  className = '',
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)
  const displayText = selected?.label ?? placeholder

  const MENU_MAX_HEIGHT = 220

  const getMenuStyle = useCallback((): React.CSSProperties => {
    if (!buttonRef.current) return {}
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const goUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow

    if (goUp) {
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      }
    }
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      minWidth: rect.width,
      width: 'max-content',
      zIndex: 99999,
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    // Calculate position before opening so the portal renders at the right spot immediately
    setMenuStyle(getMenuStyle())
    setIsOpen(true)
    if (listRef.current) listRef.current.scrollTop = 0
  }, [isOpen, getMenuStyle])

  useEffect(() => {
    if (!isOpen) return
    const recalc = () => setMenuStyle(getMenuStyle())
    window.addEventListener('scroll', recalc, true)
    window.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('scroll', recalc, true)
      window.removeEventListener('resize', recalc)
    }
  }, [isOpen, getMenuStyle])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const id = label ? `dropdown-${label.replaceAll(/\s+/g, '-').toLowerCase()}` : undefined

  const menu = isOpen
    ? createPortal(
        <ul
          ref={listRef}
          className="max-h-[220px] overflow-y-auto overflow-x-hidden bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 py-1"
          style={menuStyle}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  style={opt.style}
                  className={[
                    'w-full text-left font-medium transition-colors flex items-center justify-between gap-2',
                    compact ? 'px-3 py-2 text-[12px]' : 'px-4 py-2.5 text-[13px]',
                    isSelected
                      ? 'bg-brand-teal/10 text-brand-teal'
                      : 'text-slate-700 hover:bg-brand-teal/8 hover:text-brand-teal',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_COLORS[opt.badge] ?? 'bg-slate-100 text-slate-600'}`}>
                        {opt.badge}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-teal" strokeWidth={3} />}
                </button>
              </li>
            )
          })}
        </ul>,
        document.body
      )
    : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label ?? placeholder}
        disabled={disabled}
        onClick={handleToggle}
        className={[
          'w-full bg-white border rounded-xl flex items-center justify-between gap-2 text-left transition-all shadow-sm',
          compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-[14px]',
          isOpen
            ? 'border-brand-teal ring-2 ring-brand-teal/20'
            : 'border-slate-200 hover:border-slate-300',
          selected ? 'text-slate-800 font-medium' : 'text-slate-400 font-medium',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0" style={selected?.style}>
          <span className="truncate">{displayText}</span>
          {selected?.badge && (
            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_COLORS[selected.badge] ?? 'bg-slate-100 text-slate-600'}`}>
              {selected.badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-teal' : ''}`}
          strokeWidth={2.5}
        />
      </button>

      {menu}
    </div>
  )
}
