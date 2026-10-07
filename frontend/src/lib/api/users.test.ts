// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  apiPostFormData: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPatchFormData: vi.fn(),
}))

vi.mock('@/config', () => ({
  config: {
    api: {
      endpoints: {
        users: {
          list: '/api/users/',
          detail: (id: string) => `/api/users/${id}/`,
        },
        roles: {
          list: '/api/roles/',
        },
      },
    },
  },
}))

import * as client from './client'
import {
  createUserApi,
  getRolesApi,
  getUsersApi,
  getUserByIdApi,
  updateUserApi,
  deleteUserApi,
} from './users'

const mockApiPostFormData = vi.mocked(client.apiPostFormData)
const mockApiGet = vi.mocked(client.apiGet)
const mockApiPatch = vi.mocked(client.apiPatch)
const mockApiDelete = vi.mocked(client.apiDelete)

const mockUser = {
  id: '1',
  email: 'user@test.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  phone_number: null,
  profile_picture: null,
  is_active: true,
  is_superuser: false,
  date_joined: '2024-01-01',
  roles: ['student'],
}

beforeEach(() => vi.clearAllMocks())

describe('createUserApi', () => {
  it('creates form data without profile picture', async () => {
    mockApiPostFormData.mockResolvedValue(mockUser)
    const payload = {
      email: 'user@test.com',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '1234567890',
      profile_picture: null,
      role_id: 4,
      organization_id: 1,
    }
    const result = await createUserApi(payload)
    expect(mockApiPostFormData).toHaveBeenCalledWith('/api/users/', expect.any(FormData))
    const fd = mockApiPostFormData.mock.calls[0][1]
    expect(fd.get('email')).toBe('user@test.com')
    expect(fd.get('role_id')).toBe('4')
    expect(fd.get('organization_id')).toBe('1')
    expect(result).toEqual(mockUser)
  })

  it('creates form data with profile picture', async () => {
    mockApiPostFormData.mockResolvedValue(mockUser)
    const file = new File(['image'], 'profile.jpg', { type: 'image/jpeg' })
    await createUserApi({
      email: 'user@test.com',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '1234567890',
      profile_picture: file,
      role_id: 4,
      organization_id: 1,
    })
    const fd = mockApiPostFormData.mock.calls[0][1]
    expect(fd.get('profile_picture')).toStrictEqual(file)
  })
})

describe('getRolesApi', () => {
  it('returns roles from paginated response', async () => {
    const roles = [{ id: 1, name: 'admin', description: 'Admin role' }]
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: roles })
    const result = await getRolesApi()
    expect(result).toEqual(roles)
    expect(mockApiGet).toHaveBeenCalledWith('/api/roles/')
  })
})

describe('getUsersApi', () => {
  it('returns users from paginated response', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockUser] })
    const result = await getUsersApi()
    expect(result).toEqual([mockUser])
    expect(mockApiGet).toHaveBeenCalledWith('/api/users/', undefined)
  })

  it('passes search params', async () => {
    mockApiGet.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    await getUsersApi({ search: 'john', role: 'teacher', organization: '1' })
    expect(mockApiGet).toHaveBeenCalledWith('/api/users/', { search: 'john', role: 'teacher', organization: '1' })
  })

  it('returns empty array when results is not an array', async () => {
    mockApiGet.mockResolvedValue({ count: 0, next: null, previous: null, results: null })
    const result = await getUsersApi()
    expect(result).toEqual([])
  })
})

describe('getUserByIdApi', () => {
  it('fetches user by id', async () => {
    mockApiGet.mockResolvedValue(mockUser)
    const result = await getUserByIdApi('1')
    expect(result).toEqual(mockUser)
    expect(mockApiGet).toHaveBeenCalledWith('/api/users/1/')
  })
})

describe('updateUserApi', () => {
  it('patches user data', async () => {
    mockApiPatch.mockResolvedValue(mockUser)
    const result = await updateUserApi('1', { first_name: 'Updated', is_active: false })
    expect(result).toEqual(mockUser)
    expect(mockApiPatch).toHaveBeenCalledWith('/api/users/1/', { first_name: 'Updated', is_active: false })
  })
})

describe('deleteUserApi', () => {
  it('deletes user', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteUserApi('1')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/users/1/')
  })
})
