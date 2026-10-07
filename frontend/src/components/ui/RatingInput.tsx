// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Star } from 'lucide-react'

interface RatingInputProps {
  value: number | null
  onChange?: (value: number) => void
  max?: number
  readOnly?: boolean
  size?: 'sm' | 'md'
  'aria-label'?: string
}

/** 1-N star rating control. Used both to configure and to answer `RATING_1_5` questions. */
export default function RatingInput({
  value,
  onChange,
  max = 5,
  readOnly = false,
  size = 'md',
  ...rest
}: RatingInputProps) {
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className="flex items-center gap-1" role={readOnly ? undefined : 'radiogroup'} {...rest}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const filled = value != null && n <= value
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            aria-checked={value === n}
            role={readOnly ? undefined : 'radio'}
            aria-label={`${n} out of ${max}`}
            onClick={() => onChange?.(n)}
            className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star
              className={`${starSize} ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              strokeWidth={1.5}
            />
          </button>
        )
      })}
    </div>
  )
}
