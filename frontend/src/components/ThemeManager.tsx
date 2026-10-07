// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getStoredOrganizations } from '@/lib/auth'
import { getOrganizationByIdApi } from '@/lib/api/organizations'
import { applyTheme, resetTheme } from '@/lib/theme'

/** Session cache of fetched org colours, so we don't refetch on every nav. */
const colorCache = new Map<string, { primary?: string | null; accent?: string | null }>()

/**
 * Keeps the app's brand theme in sync with the active organization:
 * - org-admin (or super-admin acting as an org) → that org's primary/accent colours
 * - everyone else (no active org) → the default theme from index.css
 *
 * Colours captured at login / when entering an org are used directly; otherwise
 * the org is fetched once and cached for the session.
 */
export default function ThemeManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    const org = getStoredOrganizations()[0]

    if (!org) {
      resetTheme()
      return
    }

    // Colours already known (login / acting-as payload).
    if (org.primary_color || org.accent_color) {
      applyTheme({ primary: org.primary_color, accent: org.accent_color })
      return
    }

    const id = String(org.id)
    const cached = colorCache.get(id)
    if (cached) {
      applyTheme(cached)
      return
    }

    getOrganizationByIdApi(id)
      .then((detail) => {
        if (cancelled) return
        const colors = { primary: detail.primary_color, accent: detail.accent_color }
        colorCache.set(id, colors)
        applyTheme(colors)
      })
      .catch(() => {
        if (!cancelled) resetTheme()
      })

    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}
