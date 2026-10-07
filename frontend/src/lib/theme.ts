// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/**
 * ────────────────────────────────────────────────────────────────
 *  APPLICATION THEME — single source of truth for brand colours.
 * ────────────────────────────────────────────────────────────────
 * The app's Tailwind `brand-*` utilities are backed by CSS variables
 * declared in `src/index.css` (`@theme`). Overriding those variables at
 * runtime re-themes the entire UI, so per-organization branding just means
 * pointing them at the org's chosen colours.
 *
 * To change the DEFAULT palette, edit `DEFAULT_THEME` below (and keep it in
 * sync with `index.css`). To change which utilities a slot drives, edit the
 * `*_VARS` maps.
 */

export interface AppTheme {
  /** Primary brand colour → drives `brand-teal` utilities. */
  primary?: string | null
  /** Accent colour → drives `brand-green` utilities. */
  accent?: string | null
}

/** Base palette — mirrors the `@theme` block in `src/index.css`. */
export const DEFAULT_THEME = {
  primary: '#0d9488', // brand-teal
  accent: '#059669', // brand-green
} as const

/** CSS variables each theme slot overrides. */
const PRIMARY_VARS = ['--color-brand-teal', '--color-brand-turquoise']
const ACCENT_VARS = ['--color-brand-green']

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const isHex = (v?: string | null): v is string => typeof v === 'string' && HEX_RE.test(v)

function setVars(vars: string[], color: string) {
  for (const v of vars) document.documentElement.style.setProperty(v, color)
}

function clearVars(vars: string[]) {
  for (const v of vars) document.documentElement.style.removeProperty(v)
}

/**
 * Apply an organization theme. Each slot with a valid hex overrides its CSS
 * variables; empty/invalid slots are cleared so the `index.css` default shows.
 */
export function applyTheme(theme: AppTheme | null | undefined): void {
  if (isHex(theme?.primary)) setVars(PRIMARY_VARS, theme.primary)
  else clearVars(PRIMARY_VARS)

  if (isHex(theme?.accent)) setVars(ACCENT_VARS, theme.accent)
  else clearVars(ACCENT_VARS)
}

/** Revert to the base theme defined in `index.css`. */
export function resetTheme(): void {
  clearVars(PRIMARY_VARS)
  clearVars(ACCENT_VARS)
}
