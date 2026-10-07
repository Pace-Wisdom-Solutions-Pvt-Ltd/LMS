// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'
import { apiPost, apiPostFormData, apiPatchFormData, apiGet, apiPatch, apiDelete } from './client'

export interface CreateUserPayload {
  email: string
  first_name: string
  last_name: string
  phone_number: string
  profile_picture: File | null
  role_id: number
  organization_id: number
}

export interface CreateUserResponse {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  phone_number: string | null
  profile_picture: string | null
  role: string
  is_active: boolean
  date_joined: string
}

export interface Role {
  id: number
  name: string
  description: string
}

interface PaginatedRoles {
  count: number
  next: string | null
  previous: string | null
  results: Role[]
}

export async function createUserApi(
  payload: CreateUserPayload
): Promise<CreateUserResponse> {
  const fd = new FormData()
  fd.append('email', payload.email)
  fd.append('first_name', payload.first_name)
  fd.append('last_name', payload.last_name)
  fd.append('phone_number', payload.phone_number)
  fd.append('role_id', String(payload.role_id))
  fd.append('organization_id', String(payload.organization_id))
  if (payload.profile_picture) {
    fd.append('profile_picture', payload.profile_picture, payload.profile_picture.name)
  }
  return apiPostFormData<CreateUserResponse>(config.api.endpoints.users.list, fd)
}

export async function getRolesApi(): Promise<Role[]> {
  const data = await apiGet<PaginatedRoles | Role[]>(config.api.endpoints.roles.list)
  return Array.isArray(data) ? data : (data.results ?? [])
}

export interface ApiUser {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  phone_number: string | null
  profile_picture: string | null
  is_active: boolean
  status?: string
  is_superuser: boolean
  date_joined: string
  roles: string[]
}

interface PaginatedUsers {
  count: number
  next: string | null
  previous: string | null
  results: ApiUser[]
}

export async function getUsersApi(params?: {
  search?: string
  role?: string
  organization?: string
}): Promise<ApiUser[]> {
  const data = await apiGet<PaginatedUsers>(config.api.endpoints.users.list, params)
  return Array.isArray(data.results) ? data.results : []
}

export async function getUsersPaginatedApi(params?: {
  search?: string
  role?: string
  organization?: string
  ordering?: string
}, page = 1): Promise<{ count: number; results: ApiUser[] }> {
  const data = await apiGet<PaginatedUsers>(config.api.endpoints.users.list, { ...params, page })
  return { count: data.count ?? 0, results: Array.isArray(data.results) ? data.results : [] }
}

export async function getUserByIdApi(id: string): Promise<ApiUser> {
  return apiGet<ApiUser>(config.api.endpoints.users.detail(id))
}

export interface UpdateUserPayload {
  username?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  profile_picture?: string
  is_active?: boolean
}

export async function updateUserApi(
  id: string,
  data: UpdateUserPayload
): Promise<ApiUser> {
  return apiPatch<ApiUser>(config.api.endpoints.users.detail(id), data)
}

export async function deleteUserApi(id: string): Promise<void> {
  return apiDelete(config.api.endpoints.users.detail(id))
}

export async function reinviteUserApi(identifier: string): Promise<{ detail: string; reinvite_count: number; last_invited_at: string }> {
  return apiPost(config.api.endpoints.users.reinvite(identifier), {})
}

export async function updateUserProfileApi(
  id: string,
  data: { first_name?: string; last_name?: string; phone_number?: string; profile_picture?: File }
): Promise<ApiUser> {
  const fd = new FormData()
  if (data.first_name !== undefined) fd.append('first_name', data.first_name)
  if (data.last_name !== undefined) fd.append('last_name', data.last_name)
  if (data.phone_number !== undefined) fd.append('phone_number', data.phone_number)
  if (data.profile_picture) fd.append('profile_picture', data.profile_picture)
  return apiPatchFormData<ApiUser>(config.api.endpoints.users.detail(id), fd)
}
