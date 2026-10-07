// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef, useId, type TextareaHTMLAttributes, type ReactNode } from 'react'

const FIELD_BASE =
  'w-full rounded-xl border bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all px-4 py-2'
const FIELD_OK = 'border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal'
const FIELD_ERROR = 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  /** Validation message; when set, the field renders in an error state. */
  error?: string
  /** Helper text shown below the field when there is no error. */
  hint?: string
  required?: boolean
  /** Class applied to the outer wrapper (the field gets `className`). */
  containerClassName?: string
}

/**
 * Labelled multi-line text field mirroring {@link Input}, with built-in
 * error / hint handling. Forwards its ref to the underlying `<textarea>`.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, required = false, id, className = '', containerClassName = '', disabled, ...rest },
  ref,
) {
  const reactId = useId()
  const fieldId = id ?? reactId
  const describedById = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  const fieldClasses = [
    FIELD_BASE,
    error ? FIELD_ERROR : FIELD_OK,
    disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClassName}>
      {label != null && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={fieldClasses}
        {...rest}
      />
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

export default Textarea
