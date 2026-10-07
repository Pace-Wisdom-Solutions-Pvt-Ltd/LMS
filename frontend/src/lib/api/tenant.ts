// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { computeBaseUrl } from '@/config'

const BASE_URL = computeBaseUrl(import.meta.env.VITE_API_BASE_URL)

export interface TenantBranding {
  name: string
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
}

export async function getTenantBrandingApi(slug: string): Promise<TenantBranding> {
  const res = await fetch(`${BASE_URL}/tenant/${slug}/`)
  if (!res.ok) throw new Error('Tenant not found')
  return res.json()
}
