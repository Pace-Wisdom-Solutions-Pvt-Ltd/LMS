// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const

export type AvatarSize = keyof typeof SIZES

/** Derive up-to-two-letter initials from a display name, falling back to `?`. */
function getInitials(name?: string | null, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return (parts[0][0] ?? fallback).toUpperCase()
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1][0] ?? ''
  return (first + last).toUpperCase() || fallback
}

interface AvatarProps {
  /** Image URL (or data URI). Falls back to initials when empty. */
  src?: string | null
  /** Display name used to derive initials when there is no image. */
  name?: string | null
  /** Explicit initials text, overriding `name`-derived initials. */
  initials?: string
  size?: AvatarSize
  /** Extra classes applied to both the image and the initials fallback (borders, shadows…). */
  className?: string
  /** Colour classes for the initials fallback only. */
  fallbackClassName?: string
  alt?: string
  onClick?: () => void
}

/** Circular user avatar that renders an image when available or coloured initials otherwise. */
export default function Avatar({
  src,
  name,
  initials,
  size = 'md',
  className = '',
  fallbackClassName = 'bg-brand-teal/10 text-brand-teal',
  alt = 'Avatar',
  onClick,
}: AvatarProps) {
  const sizeCls = SIZES[size]
  const clickable = onClick ? 'cursor-pointer' : ''

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        onClick={onClick}
        className={`${sizeCls} rounded-full object-cover ${clickable} ${className}`}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={`${sizeCls} rounded-full flex items-center justify-center font-bold ${fallbackClassName} ${clickable} ${className}`}
    >
      {initials ?? getInitials(name)}
    </div>
  )
}
