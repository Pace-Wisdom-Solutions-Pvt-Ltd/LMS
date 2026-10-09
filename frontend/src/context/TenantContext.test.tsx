// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { TenantProvider, useTenant, resolveOrgLogoUrl } from './TenantContext'
import * as auth from '@/lib/auth'
import * as orgApi from '@/lib/api/organizations'

vi.mock('@/lib/auth', () => ({
  getStoredOrganizations: vi.fn(),
}))

vi.mock('@/lib/api/organizations', () => ({
  getOrganizationByIdApi: vi.fn(),
}))

describe('resolveOrgLogoUrl', () => {
  it('returns null for null, undefined, or empty string', () => {
    expect(resolveOrgLogoUrl(null)).toBeNull()
    expect(resolveOrgLogoUrl(undefined)).toBeNull()
    expect(resolveOrgLogoUrl('')).toBeNull()
    expect(resolveOrgLogoUrl('   ')).toBeNull()
  })

  it('returns absolute URLs untouched', () => {
    expect(resolveOrgLogoUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png')
    expect(resolveOrgLogoUrl('http://example.com/logo.png')).toBe('http://example.com/logo.png')
    expect(resolveOrgLogoUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123')
    expect(resolveOrgLogoUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
  })

  it('prepends backend origin for relative media paths', () => {
    const result = resolveOrgLogoUrl('/media/organizations/1/logo.png')
    expect(result).toContain('/media/organizations/1/logo.png')
  })
})

describe('TenantProvider & useTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides null tenant when no stored organizations exist', async () => {
    vi.mocked(auth.getStoredOrganizations).mockReturnValue([])

    const { result } = renderHook(() => useTenant(), {
      wrapper: ({ children }) => <TenantProvider>{children}</TenantProvider>,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.tenant).toBeNull()
  })

  it('fetches organization and updates tenant branding when active org exists', async () => {
    vi.mocked(auth.getStoredOrganizations).mockReturnValue([
      { id: 1, name: 'Initial Org', role: 'student', logo: null },
    ])
    vi.mocked(orgApi.getOrganizationByIdApi).mockResolvedValue({
      id: '1',
      name: 'Updated Org',
      slug: 'updated-org',
      contact_email: 'admin@org.com',
      logo: '/media/org-logo.png',
      is_active: true,
      org_admin_email: 'admin@org.com',
    })

    const { result } = renderHook(() => useTenant(), {
      wrapper: ({ children }) => <TenantProvider>{children}</TenantProvider>,
    })

    await waitFor(() => {
      expect(result.current.tenant?.name).toBe('Updated Org')
    })
    expect(result.current.tenant?.logo_url).toContain('/media/org-logo.png')
    expect(result.current.slug).toBe('updated-org')
  })
})
