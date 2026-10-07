// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'
import { apiPost } from './client'

export interface LoginPayload {
  email: string
  password: string
}

/**
 * API response shape - matches backend login response.
 */
export interface LoginResponse {
  access: string
  refresh: string
  user: {
    id: string
    uuid?: string
    user_id?: string
    email: string
    username: string
    first_name: string
    last_name: string
    phone_number: string | null
    profile_picture: string | null
    is_active: boolean
    is_superuser: boolean
    date_joined: string
    roles: string[]
    organizations?: LoginOrganization[]
  }
}

/** Organization membership as returned on the login user payload. */
export interface LoginOrganization {
  id?: number
  org_id?: number
  name: string
  /** The active/primary role for this membership. */
  role: string
  /** Every role the user holds in this organization (e.g. ["teacher", "student"]). */
  roles?: string[]
  logo?: string | null
  primary_color?: string | null
  accent_color?: string | null
}

export async function loginApi(
  payload: LoginPayload
): Promise<LoginResponse> {
  return apiPost<LoginResponse>(config.api.endpoints.auth.login, payload)
}

export interface RefreshResponse {
  access: string
  refresh?: string  // SimpleJWT returns a rotated refresh token when ROTATE_REFRESH_TOKENS=True
}

export async function refreshTokenApi(
  refreshToken: string
): Promise<RefreshResponse> {
  return apiPost<RefreshResponse>(config.api.endpoints.auth.refresh, {
    refresh: refreshToken,
  })
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await apiPost<unknown>(config.api.endpoints.auth.logout, {
    refresh: refreshToken,
  })
}

export interface AcceptInvitePayload {
  token: string
  password: string
}

export type AcceptInviteResponse = LoginResponse

export async function forgotPasswordApi(email: string): Promise<void> {
  await apiPost<unknown>(config.api.endpoints.auth.forgotPassword, { email })
}

export async function resetPasswordApi(token: string, password: string): Promise<void> {
  await apiPost<unknown>(config.api.endpoints.auth.resetPassword, { token, password })
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  confirm_password: string
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<void> {
  await apiPost<unknown>(config.api.endpoints.auth.changePassword, payload)
}

export async function acceptInviteApi(
  payload: AcceptInvitePayload
): Promise<AcceptInviteResponse> {
  return apiPost<AcceptInviteResponse>(config.api.endpoints.auth.acceptInvite, payload)
}
