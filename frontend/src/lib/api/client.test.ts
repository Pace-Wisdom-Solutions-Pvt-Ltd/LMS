// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getStoredToken: vi.fn().mockReturnValue('test-token'),
  getStoredRefreshToken: vi.fn().mockReturnValue('test-refresh'),
  setStoredToken: vi.fn(),
  clearStoredUser: vi.fn(),
}))

vi.mock('@/config', () => ({
  config: {
    api: {
      baseUrl: 'http://localhost:3000/api',
      endpoints: { auth: { refresh: '/auth/refresh/' } },
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockLocation = { href: '' }
Object.defineProperty(globalThis, 'location', { value: mockLocation, writable: true })

import {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiPostFormData,
  apiPatchFormData,
} from './client'
import { clearStoredUser } from '@/lib/auth'

beforeEach(() => {
  vi.clearAllMocks()
  mockLocation.href = ''
  mockFetch.mockReset()
})

describe('apiRequest', () => {
  it('makes a fetch call with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'test' }),
    })

    const result = await apiRequest('/test')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ data: 'test' })
  })

  it('prepends baseUrl for relative paths', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })

    await apiRequest('/users/')
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:3000/api/users/')
  })

  it('uses absolute URL as-is', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })

    await apiRequest('https://other.com/api/test')
    expect(mockFetch.mock.calls[0][0]).toBe('https://other.com/api/test')
  })

  it('returns text for non-JSON responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('plain text'),
    })

    const result = await apiRequest('/text')
    expect(result).toBe('plain text')
  })

  it('throws on error response with JSON detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ detail: 'Bad request' })),
    })

    await expect(apiRequest('/error')).rejects.toThrow('Bad request')
  })

  it('throws on error response with message field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ message: 'Validation failed' })),
    })

    await expect(apiRequest('/error')).rejects.toThrow('Validation failed')
  })

  it('throws on HTML error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<html>Not Found</html>'),
    })

    await expect(apiRequest('/missing')).rejects.toThrow('API endpoint not found')
  })

  it('throws server error for non-404 HTML', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<html>Error</html>'),
    })

    await expect(apiRequest('/error')).rejects.toThrow('Server error (500)')
  })

  it('includes auth token in headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })

    await apiRequest('/test')
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer test-token')
  })

  it('attempts token refresh on 401', async () => {
    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
    })
    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ access: 'new-token' }),
    })
    // Retry succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ refreshed: true }),
    })

    const result = await apiRequest('/protected')
    expect(result).toEqual({ refreshed: true })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('redirects to login when refresh fails', async () => {
    // 401 response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
    })
    // Refresh fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    await expect(apiRequest('/protected')).rejects.toThrow('Session expired')
    expect(clearStoredUser).toHaveBeenCalled()
    expect(mockLocation.href).toBe('/login')
  })
})

describe('apiGet', () => {
  it('makes GET request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([]),
    })

    await apiGet('/items')
    expect(mockFetch.mock.calls[0][1].method).toBe('GET')
  })

  it('builds query string from params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([]),
    })

    await apiGet('/items', { page: 1, search: 'test' })
    const url = mockFetch.mock.calls[0][0]
    expect(url).toContain('page=1')
    expect(url).toContain('search=test')
  })

  it('skips undefined params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([]),
    })

    await apiGet('/items', { page: 1, search: undefined })
    const url = mockFetch.mock.calls[0][0]
    expect(url).toContain('page=1')
    expect(url).not.toContain('search')
  })
})

describe('apiPost', () => {
  it('makes POST request with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: 1 }),
    })

    const result = await apiPost('/items', { name: 'test' })
    expect(result).toEqual({ id: 1 })
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'test' }))
  })
})

describe('apiPut', () => {
  it('makes PUT request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })

    await apiPut('/items/1', { name: 'updated' })
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
  })
})

describe('apiPatch', () => {
  it('makes PATCH request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    })

    await apiPatch('/items/1', { name: 'patched' })
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })
})

describe('apiDelete', () => {
  it('makes DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve(''),
    })

    await apiDelete('/items/1')
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
  })
})

describe('apiPostFormData', () => {
  it('posts FormData and returns JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ ok: true }),
    })
    const fd = new FormData()
    fd.append('f', 'x')
    const out = await apiPostFormData<{ ok: boolean }>('/upload', fd)
    expect(out.ok).toBe(true)
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(mockFetch.mock.calls[0][1].body).toBe(fd)
  })

  it('refreshes token on 401 and retries POST form', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access: 'newtok' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ done: 1 }),
      })
    const fd = new FormData()
    const out = await apiPostFormData<{ done: number }>('/up', fd)
    expect(out.done).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

describe('apiPatchFormData', () => {
  it('patches FormData and returns JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ patched: true }),
    })
    const fd = new FormData()
    const out = await apiPatchFormData<{ patched: boolean }>('/file/1', fd)
    expect(out.patched).toBe(true)
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
  })
})
