// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-teal text-white hover:shadow-lg hover:opacity-95',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-brand-teal/30 hover:text-brand-teal',
  danger: 'border border-red-100 bg-white text-red-600 hover:bg-red-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Show a spinner and disable the button while an action is in flight. */
  loading?: boolean
  /** Optional label to show while `loading` (defaults to the normal children). */
  loadingText?: ReactNode
  /** Stretch to the full width of the container. */
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

/**
 * App-wide button. Defaults to `type="button"` so it never submits a form by
 * accident — pass `type="submit"` explicitly for form actions.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    fullWidth = false,
    leftIcon,
    rightIcon,
    type = 'button',
    disabled,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const classes = [BASE, VARIANTS[variant], SIZES[size], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {loading && loadingText != null ? loadingText : children}
      {!loading && rightIcon}
    </button>
  )
})

export default Button
