// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * Reusable shimmer placeholder block. Compose several of these to build
 * loading states that mirror real content. Pass sizing/shape via `className`,
 * or `style` for dynamic dimensions that can't be expressed as utility classes.
 *
 * @example <Skeleton className="h-4 w-32 rounded-full" />
 */
export default function Skeleton({
  className = '',
  style,
}: {
  readonly className?: string
  readonly style?: React.CSSProperties
}) {
  return <div aria-hidden="true" style={style} className={`animate-pulse bg-slate-100 rounded-md ${className}`} />
}
