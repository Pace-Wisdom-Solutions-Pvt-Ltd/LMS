// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'
import { getStoredToken, setStoredToken, getStoredRefreshToken, setStoredRefreshToken, clearStoredUser } from '@/lib/auth'

/**
 * The `ngrok-skip-browser-warning` header is only needed when the frontend
 * points at an ngrok tunnel (it suppresses ngrok's HTML interstitial). Any
 * other backend — production, a Microsoft Dev Tunnel (*.devtunnels.ms), or a
 * plain host — rejects this custom header in the CORS preflight, so we send it
 * only when the API base URL is actually an ngrok domain.
 * Spread the result into a headers object: `...ngrokHeader()`.
 */
export function ngrokHeader(): Record<string, string> {
  return /\bngrok(-free)?\.(app|dev|io)\b/.test(config.api.baseUrl)
    ? { 'ngrok-skip-browser-warning': 'true' }
    : {}
}

function getCsrfToken(): string | null {
  const fromEnv =
    typeof import.meta.env.VITE_CSRFTOKEN === 'string' &&
    import.meta.env.VITE_CSRFTOKEN.length > 0
      ? import.meta.env.VITE_CSRFTOKEN
      : null
  if (fromEnv) return fromEnv
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
  return match ? match.split('=')[1] ?? null : null
}

/* ── Token refresh logic ─────────────────────────────── */
let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return null

  try {
    const url = `${config.api.baseUrl}${config.api.endpoints.auth.refresh}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const newToken = data.access as string
    setStoredToken(newToken)
    if (data.refresh) setStoredRefreshToken(data.refresh as string)
    return newToken
  } catch {
    return null
  }
}

/* ── Shared helpers ──────────────────────────────────── */

/**
 * Error thrown for any non-2xx response. Carries the HTTP `status` so callers can
 * branch on it (e.g. treat a 404 as an "empty" state rather than a failure)
 * instead of string-matching the message. It extends `Error`, so existing
 * `err instanceof Error ? err.message : …` handling keeps working unchanged.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function extractErrorMessage(body: string): string {
  try {
    const json = JSON.parse(body)
    return (
      json.detail ??
      json.message ??
      json.error ??
      (typeof json === 'object' ? Object.values(json).flat().join(' ') : '')
    )
  } catch {
    return body.includes('<') ? '' : body
  }
}

async function handleErrorResponse(res: Response): Promise<never> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    const msg =
      res.status === 404
        ? 'API endpoint not found. Please check your server configuration.'
        : `Server error (${res.status}). Please try again later.`
    throw new ApiError(msg, res.status)
  }
  const body = await res.text()
  throw new ApiError(extractErrorMessage(body) || `Request failed (${res.status})`, res.status)
}

function handleExpiredSession(): never {
  clearStoredUser()
  window.location.href = '/login'
  throw new Error('Session expired. Please log in again.')
}

async function deduplicatedRefresh(): Promise<string | null> {
  refreshPromise ??= tryRefreshToken().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

/* ── Main API request function ───────────────────────── */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${config.api.baseUrl}${path}`
  const csrf = getCsrfToken()
  const token = getStoredToken()

  const headers: HeadersInit = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    ...ngrokHeader(),
    ...(csrf && { 'X-CSRFToken': csrf }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401 && getStoredRefreshToken()) {
    const newToken = await deduplicatedRefresh()
    if (!newToken) handleExpiredSession()
    res = await fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } })
  }

  if (!res.ok) await handleErrorResponse(res)

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  const contentType = res.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return res.text() as Promise<T>
}

export function apiPost<T>(path: string, data: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** Shared implementation for multipart/form-data requests (POST or PATCH). */
async function formDataRequest<T>(method: 'POST' | 'PATCH', path: string, formData: FormData): Promise<T> {
  const url = path.startsWith('http') ? path : `${config.api.baseUrl}${path}`
  const csrf = getCsrfToken()
  const token = getStoredToken()

  // Do NOT set Content-Type - browser sets multipart/form-data; boundary=...
  const headers: HeadersInit = {
    accept: 'application/json',
    ...ngrokHeader(),
    ...(csrf && { 'X-CSRFToken': csrf }),
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  let res = await fetch(url, { method, body: formData, headers })
  if (res.status === 401 && getStoredRefreshToken()) {
    const newToken = await deduplicatedRefresh()
    if (!newToken) handleExpiredSession()
    res = await fetch(url, { method, body: formData, headers: { ...headers, Authorization: `Bearer ${newToken}` } })
  }

  if (!res.ok) await handleErrorResponse(res)
  return res.json() as Promise<T>
}

/** POST multipart/form-data (e.g. file uploads). Do not set Content-Type - browser adds boundary. */
export function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  return formDataRequest<T>('POST', path, formData)
}

/**
 * POST multipart/form-data and return the raw Response (after auth + token refresh)
 * WITHOUT throwing on non-2xx. Use this when the caller needs to inspect a
 * structured error body (e.g. a 400 with row-level validation details).
 */
export async function apiPostFormDataRaw(path: string, formData: FormData): Promise<Response> {
  const url = path.startsWith('http') ? path : `${config.api.baseUrl}${path}`
  const csrf = getCsrfToken()
  const token = getStoredToken()

  // Do NOT set Content-Type - browser sets multipart/form-data; boundary=...
  const headers: HeadersInit = {
    accept: 'application/json',
    ...ngrokHeader(),
    ...(csrf && { 'X-CSRFToken': csrf }),
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  let res = await fetch(url, { method: 'POST', body: formData, headers })
  if (res.status === 401 && getStoredRefreshToken()) {
    const newToken = await deduplicatedRefresh()
    if (!newToken) handleExpiredSession()
    res = await fetch(url, { method: 'POST', body: formData, headers: { ...headers, Authorization: `Bearer ${newToken}` } })
  }
  return res
}

/** PATCH multipart/form-data (e.g. file uploads). Do not set Content-Type - browser adds boundary. */
export function apiPatchFormData<T>(path: string, formData: FormData): Promise<T> {
  return formDataRequest<T>('PATCH', path, formData)
}

export function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  let url = path
  if (params) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.append(k, String(v))
    })
    const str = qs.toString()
    if (str) url += `?${str}`
  }
  return apiRequest<T>(url, { method: 'GET' })
}

/** GET a binary file and return a Blob (for downloads). Handles auth + token refresh. */
export async function apiGetBlob(path: string): Promise<Blob> {
  const url = path.startsWith('http') ? path : `${config.api.baseUrl}${path}`
  const csrf = getCsrfToken()
  const token = getStoredToken()

  const headers: HeadersInit = {
    accept: '*/*',
    ...ngrokHeader(),
    ...(csrf && { 'X-CSRFToken': csrf }),
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  let res = await fetch(url, { method: 'GET', headers })

  if (res.status === 401 && getStoredRefreshToken()) {
    const newToken = await deduplicatedRefresh()
    if (!newToken) handleExpiredSession()
    res = await fetch(url, { method: 'GET', headers: { ...headers, Authorization: `Bearer ${newToken}` } })
  }

  if (!res.ok) await handleErrorResponse(res)
  return res.blob()
}

export function apiPut<T>(path: string, data: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function apiPatch<T>(path: string, data: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function apiDelete<T = void>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' })
}
