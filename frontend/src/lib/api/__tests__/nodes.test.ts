// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import * as api from '../organizations'
import * as client from '../client'

vi.mock('../client', async () => {
  const actual = await vi.importActual('../client')
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPostFormData: vi.fn(),
  }
})

describe('Node APIs', () => {
  it('completeModuleNodeApi should call POST /nodes/{id}/complete/', async () => {
    await api.completeModuleNodeApi(123)
    expect(client.apiPost).toHaveBeenCalledWith('/nodes/123/complete/', {})
  })

  it('submitModuleNodeApi should call POST /nodes/{id}/submit/', async () => {
    await api.submitModuleNodeApi(123)
    expect(client.apiPost).toHaveBeenCalledWith('/nodes/123/submit/', {})
  })

  it('getTaskAllSubmissionsApi should call GET /nodes/{id}/task/all-submissions/', async () => {
    const mockData = [{ id: 1 }]
    vi.mocked(client.apiGet).mockResolvedValueOnce(mockData)
    const result = await api.getTaskAllSubmissionsApi(123)
    expect(client.apiGet).toHaveBeenCalledWith('/nodes/123/task/all-submissions/')
    expect(result).toEqual(mockData)
  })

  it('getTaskSubmissionsApi should call GET /nodes/{id}/task/submit/', async () => {
    const mockData = [{ id: 2 }]
    vi.mocked(client.apiGet).mockResolvedValueOnce(mockData)
    const result = await api.getTaskSubmissionsApi(123)
    expect(client.apiGet).toHaveBeenCalledWith('/nodes/123/task/submit/')
    expect(result).toEqual(mockData)
  })

  it('submitTaskApi should call POST /nodes/{id}/task/submit/ with FormData', async () => {
    const mockResponse = { id: 3 }
    vi.mocked(client.apiPostFormData).mockResolvedValueOnce(mockResponse)
    
    const payload = { payload: 'test payload' }
    const result = await api.submitTaskApi(123, payload)
    
    expect(client.apiPostFormData).toHaveBeenCalledWith('/nodes/123/task/submit/', expect.any(FormData))
    expect(result).toEqual(mockResponse)
  })
})
