// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

export function newId(prefix: string): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return `${prefix}-${c.randomUUID()}`
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(4)
    c.getRandomValues(buf)
    const hex = Array.from(buf, (n) => n.toString(16).padStart(8, '0')).join('')
    return `${prefix}-${hex}`
  }
  return `${prefix}-${Date.now()}`
}

export function randomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1)
    c.getRandomValues(buf)
    return buf[0] % Math.floor(maxExclusive)
  }
  return Math.floor(Date.now() % Math.floor(maxExclusive))
}

