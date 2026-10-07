// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

const FIELD_BASE =
  'w-full rounded-xl border bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all'
const FIELD_OK = 'border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal'
const FIELD_ERROR = 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode
  /** Validation message; when set, the field renders in an error state. */
  error?: string
  /** Helper text shown below the field when there is no error. */
  hint?: string
  required?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Class applied to the outer wrapper (the field gets `className`). */
  containerClassName?: string
}

/**
 * Labelled text input with built-in error / hint handling and icon slots.
 * Forwards its ref to the underlying `<input>` so callers can focus or read it.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    required = false,
    leftIcon,
    rightIcon,
    id,
    className = '',
    containerClassName = '',
    disabled,
    ...rest
  },
  ref,
) {
  const reactId = useId()
  const inputId = id ?? reactId
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  const fieldClasses = [
    FIELD_BASE,
    error ? FIELD_ERROR : FIELD_OK,
    'px-4 py-2',
    leftIcon ? 'pl-10' : '',
    rightIcon ? 'pr-10' : '',
    disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClassName}>
      {label != null && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={fieldClasses}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">{rightIcon}</span>
        )}
      </div>
      {error ? (
        <p id={describedById} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="mt-1 text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export default Input
