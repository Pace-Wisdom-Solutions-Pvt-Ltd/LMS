// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { TenantBranding } from '@/lib/api/tenant'
import { getStoredOrganizations } from '@/lib/auth'
import { getOrganizationByIdApi } from '@/lib/api/organizations'
import { config } from '@/config'

export function resolveOrgLogoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed
  }
  const baseUrl = config.api.baseUrl || ''
  try {
    const origin = typeof window !== 'undefined' ? new URL(baseUrl, window.location.origin).origin : 'http://localhost'
    return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
  } catch {
    return trimmed
  }
}

export interface TenantContextValue {
  tenant: TenantBranding | null
  slug: string | null
  loading: boolean
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  slug: null,
  loading: false,
  refreshTenant: async () => {},
})

export function TenantProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [tenant, setTenant] = useState<TenantBranding | null>(() => {
    const org = getStoredOrganizations()[0]
    if (!org) return null
    return {
      name: org.name,
      logo_url: resolveOrgLogoUrl(org.logo),
      primary_color: org.primary_color ?? null,
      accent_color: org.accent_color ?? null,
    }
  })
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const refreshTenant = useCallback(async () => {
    const org = getStoredOrganizations()[0]
    if (!org) {
      setTenant(null)
      setSlug(null)
      return
    }

    try {
      setLoading(true)
      const detail = await getOrganizationByIdApi(String(org.id))
      setTenant({
        name: detail.name,
        logo_url: resolveOrgLogoUrl(detail.logo),
        primary_color: detail.primary_color ?? null,
        accent_color: detail.accent_color ?? null,
      })
      setSlug(detail.slug ?? null)
    } catch {
      // If the fetch fails, keep any initial stored values
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshTenant().catch(() => {})
  }, [refreshTenant])

  const contextValue = useMemo(
    () => ({ tenant, slug, loading, refreshTenant }),
    [tenant, slug, loading, refreshTenant]
  )

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  )
}

// Provider + hook in one file is the usual context pattern; Fast Refresh just
// does a full reload when this file changes.
// eslint-disable-next-line react-refresh/only-export-components
export function useTenant() {
  return useContext(TenantContext)
}
