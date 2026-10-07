// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPatchFormData: vi.fn(),
  apiPut: vi.fn(),
}))

vi.mock('@/config', () => ({
  config: {
    api: {
      endpoints: {
        auth: {
          login: '/api/auth/login/',
          refresh: '/api/auth/refresh/',
          logout: '/api/auth/logout/',
          acceptInvite: '/api/auth/accept-invite/',
        },
      },
    },
  },
}))

import * as client from './client'
import { loginApi, refreshTokenApi, logoutApi, acceptInviteApi } from './auth'

const mockApiPost = vi.mocked(client.apiPost)

beforeEach(() => vi.clearAllMocks())

const mockLoginResponse = {
  access: 'access-token',
  refresh: 'refresh-token',
  user: {
    id: '1',
    email: 'test@test.com',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    phone_number: null,
    profile_picture: null,
    is_active: true,
    is_superuser: false,
    date_joined: '2024-01-01',
    roles: ['student'],
  },
}

describe('loginApi', () => {
  it('calls apiPost with login endpoint and credentials', async () => {
    mockApiPost.mockResolvedValue(mockLoginResponse)
    const result = await loginApi({ email: 'test@test.com', password: 'password' })
    expect(mockApiPost).toHaveBeenCalledWith('/api/auth/login/', { email: 'test@test.com', password: 'password' })
    expect(result).toEqual(mockLoginResponse)
  })

  it('propagates errors from apiPost', async () => {
    mockApiPost.mockRejectedValue(new Error('Unauthorized'))
    await expect(loginApi({ email: 'bad@test.com', password: 'wrong' })).rejects.toThrow('Unauthorized')
  })
})

describe('refreshTokenApi', () => {
  it('calls apiPost with refresh endpoint and token', async () => {
    mockApiPost.mockResolvedValue({ access: 'new-access-token' })
    const result = await refreshTokenApi('my-refresh-token')
    expect(mockApiPost).toHaveBeenCalledWith('/api/auth/refresh/', { refresh: 'my-refresh-token' })
    expect(result).toEqual({ access: 'new-access-token' })
  })
})

describe('logoutApi', () => {
  it('calls apiPost with logout endpoint and refresh token', async () => {
    mockApiPost.mockResolvedValue(undefined)
    await logoutApi('my-refresh-token')
    expect(mockApiPost).toHaveBeenCalledWith('/api/auth/logout/', { refresh: 'my-refresh-token' })
  })
})

describe('acceptInviteApi', () => {
  it('calls apiPost with accept invite endpoint', async () => {
    mockApiPost.mockResolvedValue(mockLoginResponse)
    const result = await acceptInviteApi({ token: 'invite-token', password: 'new-password' })
    expect(mockApiPost).toHaveBeenCalledWith('/api/auth/accept-invite/', { token: 'invite-token', password: 'new-password' })
    expect(result).toEqual(mockLoginResponse)
  })
})
