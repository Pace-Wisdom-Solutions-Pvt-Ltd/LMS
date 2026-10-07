// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, type ReactNode } from 'react'
import type { TenantBranding } from '@/lib/api/tenant'

interface TenantContextValue {
  tenant: TenantBranding | null
  slug: string | null
  loading: boolean
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  slug: null,
  loading: false,
})

export function TenantProvider({ children }: { children: ReactNode }) {
  return (
    <TenantContext.Provider value={{ tenant: null, slug: null, loading: false }}>
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
