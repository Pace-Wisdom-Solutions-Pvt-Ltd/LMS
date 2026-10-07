// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock client before importing organizations
vi.mock('./client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPatchFormData: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/config', () => ({
  default: {
    api: {
      endpoints: {
        organizations: {
          list: '/api/organizations/',
          detail: (id: string) => `/api/organizations/${id}/`,
          analyticsOverview: (orgId: string) => `/api/organizations/${orgId}/analytics/`,
          auditLogs: {
            list: (orgId: string) => `/api/organizations/${orgId}/audit-logs/`,
            detail: (orgId: string, id: string) => `/api/organizations/${orgId}/audit-logs/${id}/`,
            export: (orgId: string) => `/api/organizations/${orgId}/audit-logs/export/`,
          },
          batches: {
            list: (orgId: string) => `/api/organizations/${orgId}/batches/`,
            detail: (orgId: string, batchId: string) => `/api/organizations/${orgId}/batches/${batchId}/`,
          },
          courses: {
            list: (orgId: string) => `/api/organizations/${orgId}/courses/`,
            modules: {
              list: (orgId: string, courseId: string | number) => `/api/organizations/${orgId}/courses/${courseId}/modules/`,
              detail: (orgId: string, courseId: string | number, moduleId: string | number) =>
                `/api/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/`,
              nodes: {
                list: (orgId: string, courseId: string | number, moduleId: string | number) =>
                  `/api/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/`,
                detail: (orgId: string, courseId: string | number, moduleId: string | number, nodeId: string | number) =>
                  `/api/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/${nodeId}/`,
              },
            },
          },
          members: {
            list: (orgId: string) => `/api/organizations/${orgId}/members/`,
            detail: (orgId: string, memberId: string) => `/api/organizations/${orgId}/members/${memberId}/`,
          },
          staff: {
            list: (orgId: string) => `/api/organizations/${orgId}/staff/`,
            detail: (orgId: string, staffId: string) => `/api/organizations/${orgId}/staff/${staffId}/`,
          },
          students: {
            list: (orgId: string, batchId: string) => `/api/organizations/${orgId}/batches/${batchId}/students/`,
            orgList: (orgId: string) => `/api/organizations/${orgId}/students/`,
            detail: (orgId: string, batchId: string, studentId: string) =>
              `/api/organizations/${orgId}/batches/${batchId}/students/${studentId}/`,
            orgDetail: (orgId: string, studentId: string) => `/api/organizations/${orgId}/students/${studentId}/`,
          },
        },
      },
    },
  },
  config: {
    api: {
      endpoints: {
        organizations: {
          list: '/api/organizations/',
          detail: (id: string) => `/api/organizations/${id}/`,
          analyticsOverview: (orgId: string) => `/api/organizations/${orgId}/analytics/`,
          auditLogs: {
            list: (orgId: string) => `/api/organizations/${orgId}/audit-logs/`,
            detail: (orgId: string, id: string) => `/api/organizations/${orgId}/audit-logs/${id}/`,
            export: (orgId: string) => `/api/organizations/${orgId}/audit-logs/export/`,
          },
          batches: {
            list: (orgId: string) => `/api/organizations/${orgId}/batches/`,
            detail: (orgId: string, batchId: string) => `/api/organizations/${orgId}/batches/${batchId}/`,
          },
          courses: {
            list: (orgId: string) => `/api/organizations/${orgId}/courses/`,
            modules: {
              list: (orgId: string, courseId: string | number) => `/api/organizations/${orgId}/courses/${courseId}/modules/`,
              detail: (orgId: string, courseId: string | number, moduleId: string | number) =>
                `/api/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/`,
              nodes: {
                list: (orgId: string, courseId: string | number, moduleId: string | number) =>
                  `/api/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/`,
                detail: (orgId: string, courseId: string | number, moduleId: string | number, nodeId: string | number) =>
                  `/api/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/${nodeId}/`,
              },
            },
          },
          members: {
            list: (orgId: string) => `/api/organizations/${orgId}/members/`,
            detail: (orgId: string, memberId: string) => `/api/organizations/${orgId}/members/${memberId}/`,
          },
          staff: {
            list: (orgId: string) => `/api/organizations/${orgId}/staff/`,
            detail: (orgId: string, staffId: string) => `/api/organizations/${orgId}/staff/${staffId}/`,
          },
          students: {
            list: (orgId: string, batchId: string) => `/api/organizations/${orgId}/batches/${batchId}/students/`,
            orgList: (orgId: string) => `/api/organizations/${orgId}/students/`,
            detail: (orgId: string, batchId: string, studentId: string) =>
              `/api/organizations/${orgId}/batches/${batchId}/students/${studentId}/`,
            orgDetail: (orgId: string, studentId: string) => `/api/organizations/${orgId}/students/${studentId}/`,
          },
        },
      },
    },
  },
}))

import * as client from './client'
import {
  getOrganizationsApi,
  getOrganizationByIdApi,
  createOrganizationApi,
  replaceOrganizationApi,
  updateOrganizationApi,
  deleteOrganizationApi,
  getAnalyticsOverviewApi,
  getBatchesApi,
  getCoursesApi,
  createCourseApi,
  createCourseModuleApi,
  getCourseModulesApi,
  updateCourseModuleApi,
  deleteCourseModuleApi,
  getModuleNodesApi,
  getModuleNodeApi,
  createModuleNodeApi,
  updateModuleNodeApi,
  replaceModuleNodeApi,
  deleteModuleNodeApi,
  getBatchByIdApi,
  createBatchApi,
  replaceBatchApi,
  updateBatchApi,
  deleteBatchApi,
  getMembersApi,
  getMemberByIdApi,
  createMemberApi,
  replaceMemberApi,
  updateMemberApi,
  deleteMemberApi,
  getStaffApi,
  getStaffByIdApi,
  createStaffApi,
  updateStaffApi,
  replaceStaffApi,
  deleteStaffApi,
  getStudentsApi,
  getOrgStudentsApi,
  getStudentByIdApi,
  getOrgStudentByIdApi,
  addStudentApi,
  removeStudentApi,
  updateStudentApi,
  updateOrgStudentApi,
  deleteOrgStudentApi,
  replaceStudentApi,
} from './organizations'

const mockApiGet = vi.mocked(client.apiGet)
const mockApiPost = vi.mocked(client.apiPost)
const mockApiPostFormData = vi.mocked(client.apiPostFormData)
const mockApiPatchFormData = vi.mocked(client.apiPatchFormData)
const mockApiPut = vi.mocked(client.apiPut)
const mockApiPatch = vi.mocked(client.apiPatch)
const mockApiDelete = vi.mocked(client.apiDelete)

const mockOrg = {
  id: '1', name: 'Test Org', slug: 'test-org',
  contact_email: 'test@org.com', is_active: true, logo: null, org_admin_email: 'admin@org.com',
}
const mockBatch = { id: '1', name: 'Batch A' }
const mockCourse = { id: 1, title: 'Course A' }
const mockModule = { id: 1, title: 'Module A' }
const mockNode = { id: 1, title: 'Node A' }
const mockMember = { id: '1', email: 'member@test.com', first_name: 'John', last_name: 'Doe', role: 'student', is_active: true }
const mockStaff = { id: '1', user_email: 'staff@test.com', first_name: 'Jane', last_name: 'Smith', role_name: 'teacher', is_active: true }
const mockStudent = { id: '1', email: 'student@test.com', first_name: 'Alice', last_name: 'Bob', is_active: true }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Organization APIs', () => {
  it('getOrganizationsApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockOrg] })
    const result = await getOrganizationsApi()
    expect(result).toEqual([mockOrg])
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/')
  })

  it('getOrganizationsApi - array response', async () => {
    mockApiGet.mockResolvedValue([mockOrg])
    const result = await getOrganizationsApi()
    expect(result).toEqual([mockOrg])
  })

  it('getOrganizationByIdApi', async () => {
    mockApiGet.mockResolvedValue(mockOrg)
    const result = await getOrganizationByIdApi('1')
    expect(result).toEqual(mockOrg)
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/')
  })

  it('createOrganizationApi', async () => {
    mockApiPost.mockResolvedValue(mockOrg)
    const payload = { name: 'Test', contact_email: 'a@b.com', org_admin_email: 'admin@b.com' }
    const result = await createOrganizationApi(payload)
    expect(result).toEqual(mockOrg)
    expect(mockApiPost).toHaveBeenCalledWith('/api/organizations/', payload)
  })

  it('replaceOrganizationApi', async () => {
    mockApiPut.mockResolvedValue(mockOrg)
    const payload = { name: 'Updated', contact_email: 'a@b.com', org_admin_email: 'admin@b.com' }
    await replaceOrganizationApi('1', payload)
    expect(mockApiPut).toHaveBeenCalledWith('/api/organizations/1/', payload)
  })

  it('updateOrganizationApi', async () => {
    mockApiPatch.mockResolvedValue(mockOrg)
    await updateOrganizationApi('1', { name: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/', { name: 'Updated' })
  })

  it('deleteOrganizationApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteOrganizationApi('1')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/')
  })

  it('getAnalyticsOverviewApi', async () => {
    const analytics = { total_users: 10, total_staff: 5, total_students: 5, total_batches: 2, total_courses: 3 }
    mockApiGet.mockResolvedValue(analytics)
    const result = await getAnalyticsOverviewApi('1')
    expect(result).toEqual(analytics)
  })

})

describe('Batch APIs', () => {
  it('getBatchesApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockBatch] })
    const result = await getBatchesApi('1')
    expect(result).toEqual([mockBatch])
  })

  it('getBatchesApi - array', async () => {
    mockApiGet.mockResolvedValue([mockBatch])
    const result = await getBatchesApi('1')
    expect(result).toEqual([mockBatch])
  })

  it('getBatchByIdApi', async () => {
    mockApiGet.mockResolvedValue(mockBatch)
    await getBatchByIdApi('1', '2')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/batches/2/')
  })

  it('createBatchApi', async () => {
    mockApiPost.mockResolvedValue(mockBatch)
    await createBatchApi('1', { name: 'Batch B' })
    expect(mockApiPost).toHaveBeenCalledWith('/api/organizations/1/batches/', { name: 'Batch B' })
  })

  it('replaceBatchApi', async () => {
    mockApiPut.mockResolvedValue(mockBatch)
    await replaceBatchApi('1', '2', { name: 'Batch C' })
    expect(mockApiPut).toHaveBeenCalledWith('/api/organizations/1/batches/2/', { name: 'Batch C' })
  })

  it('updateBatchApi', async () => {
    mockApiPatch.mockResolvedValue(mockBatch)
    await updateBatchApi('1', '2', { name: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/batches/2/', { name: 'Updated' })
  })

  it('deleteBatchApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteBatchApi('1', '2')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/batches/2/')
  })
})

describe('Course APIs', () => {
  it('getCoursesApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockCourse] })
    const result = await getCoursesApi('1')
    expect(result).toEqual([mockCourse])
  })

  it('getCoursesApi - array', async () => {
    mockApiGet.mockResolvedValue([mockCourse])
    const result = await getCoursesApi('1')
    expect(result).toEqual([mockCourse])
  })

  it('createCourseApi', async () => {
    mockApiPost.mockResolvedValue(mockCourse)
    await createCourseApi('1', { title: 'New Course' })
    expect(mockApiPost).toHaveBeenCalledWith('/api/organizations/1/courses/', { title: 'New Course' })
  })
})

describe('Course Module APIs', () => {
  it('createCourseModuleApi', async () => {
    mockApiPost.mockResolvedValue(mockModule)
    await createCourseModuleApi('1', '2', { title: 'Module' })
    expect(mockApiPost).toHaveBeenCalledWith('/api/organizations/1/courses/2/modules/', { title: 'Module' })
  })

  it('getCourseModulesApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockModule] })
    const result = await getCourseModulesApi('1', '2')
    expect(result).toEqual([mockModule])
  })

  it('getCourseModulesApi - array', async () => {
    mockApiGet.mockResolvedValue([mockModule])
    const result = await getCourseModulesApi('1', '2')
    expect(result).toEqual([mockModule])
  })

  it('updateCourseModuleApi', async () => {
    mockApiPatch.mockResolvedValue(mockModule)
    await updateCourseModuleApi('1', '2', '3', { title: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/courses/2/modules/3/', { title: 'Updated' })
  })

  it('deleteCourseModuleApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteCourseModuleApi('1', '2', '3')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/courses/2/modules/3/')
  })
})

describe('Module Node APIs', () => {
  it('getModuleNodesApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockNode] })
    const result = await getModuleNodesApi('1', '2', '3')
    expect(result).toEqual([mockNode])
  })

  it('getModuleNodesApi - array', async () => {
    mockApiGet.mockResolvedValue([mockNode])
    const result = await getModuleNodesApi('1', '2', '3')
    expect(result).toEqual([mockNode])
  })

  it('getModuleNodeApi', async () => {
    mockApiGet.mockResolvedValue(mockNode)
    await getModuleNodeApi('1', '2', '3', '4')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/courses/2/modules/3/nodes/4/')
  })

  it('createModuleNodeApi - minimal', async () => {
    mockApiPostFormData.mockResolvedValue(mockNode)
    await createModuleNodeApi('1', '2', '3', { title: 'Node', description: 'Desc' })
    expect(mockApiPostFormData).toHaveBeenCalled()
    const [url, fd] = mockApiPostFormData.mock.calls[0]
    expect(url).toBe('/api/organizations/1/courses/2/modules/3/nodes/')
    expect(fd.get('title')).toBe('Node')
    expect(fd.get('description')).toBe('Desc')
  })

  it('createModuleNodeApi - with file', async () => {
    mockApiPostFormData.mockResolvedValue(mockNode)
    const file = new File(['content'], 'test.pdf')
    await createModuleNodeApi('1', '2', '3', {
      title: 'Node',
      description: 'Desc',
      learning_material_content_file: file,
      task_allow_link: true,
      task_allow_paragraph: false,
      quiz_extra_options: ['option1', 'option2'],
      prerequisite_node: 5,
      sequence_order: 1,
      drip_delay_days: 0,
    })
    const fd = mockApiPostFormData.mock.calls[0][1]
    expect(fd.get('learning_material_content_file')).toBe(file)
    expect(fd.get('task_allow_link')).toBe('true')
    expect(fd.get('task_allow_paragraph')).toBe('false')
  })

  it('createModuleNodeApi - prerequisite_node 0 is skipped', async () => {
    mockApiPostFormData.mockResolvedValue(mockNode)
    await createModuleNodeApi('1', '2', '3', {
      title: 'Node',
      description: '',
      prerequisite_node: 0,
    })
    const fd = mockApiPostFormData.mock.calls[0][1]
    expect(fd.get('prerequisite_node')).toBeNull()
  })

  it('updateModuleNodeApi', async () => {
    mockApiPatchFormData.mockResolvedValue(mockNode)
    await updateModuleNodeApi('1', '2', '3', '4', { title: 'Updated', task_allow_link: true, task_allow_pdf: false })
    expect(mockApiPatchFormData).toHaveBeenCalled()
    const fd = mockApiPatchFormData.mock.calls[0][1]
    expect(fd.get('title')).toBe('Updated')
    expect(fd.get('task_allow_link')).toBe('true')
    expect(fd.get('task_allow_pdf')).toBe('false')
  })

  it('updateModuleNodeApi - with file', async () => {
    mockApiPatchFormData.mockResolvedValue(mockNode)
    const file = new File(['content'], 'test.pdf')
    await updateModuleNodeApi('1', '2', '3', '4', {
      learning_material_content_file: file,
      prerequisite_node: 3,
      sequence_order: 2,
      drip_delay_days: 1,
    })
    const fd = mockApiPatchFormData.mock.calls[0][1]
    expect(fd.get('learning_material_content_file')).toBe(file)
    expect(fd.get('prerequisite_node')).toBe('3')
    expect(fd.get('sequence_order')).toBe('2')
  })

  it('replaceModuleNodeApi', async () => {
    mockApiPut.mockResolvedValue(mockNode)
    await replaceModuleNodeApi('1', '2', '3', '4', { title: 'Replaced' })
    expect(mockApiPut).toHaveBeenCalledWith('/api/organizations/1/courses/2/modules/3/nodes/4/', { title: 'Replaced' })
  })

  it('deleteModuleNodeApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteModuleNodeApi('1', '2', '3', '4')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/courses/2/modules/3/nodes/4/')
  })
})

describe('Member APIs', () => {
  it('getMembersApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockMember] })
    const result = await getMembersApi('1')
    expect(result).toEqual([mockMember])
  })

  it('getMembersApi - array', async () => {
    mockApiGet.mockResolvedValue([mockMember])
    const result = await getMembersApi('1')
    expect(result).toEqual([mockMember])
  })

  it('getMemberByIdApi', async () => {
    mockApiGet.mockResolvedValue(mockMember)
    await getMemberByIdApi('1', '2')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/members/2/')
  })

  it('createMemberApi', async () => {
    mockApiPost.mockResolvedValue(mockMember)
    const payload = { user_email: 'a@b.com', role_name: 'student', is_active: true }
    await createMemberApi('1', payload)
    expect(mockApiPost).toHaveBeenCalledWith('/api/organizations/1/members/', payload)
  })

  it('replaceMemberApi', async () => {
    mockApiPut.mockResolvedValue(mockMember)
    const payload = { user_email: 'a@b.com', role_name: 'student', is_active: true }
    await replaceMemberApi('1', '2', payload)
    expect(mockApiPut).toHaveBeenCalledWith('/api/organizations/1/members/2/', payload)
  })

  it('updateMemberApi', async () => {
    mockApiPatch.mockResolvedValue(mockMember)
    await updateMemberApi('1', '2', { first_name: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/members/2/', { first_name: 'Updated' })
  })

  it('deleteMemberApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteMemberApi('1', '2')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/members/2/')
  })
})

describe('Staff APIs', () => {
  it('getStaffApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockStaff] })
    const result = await getStaffApi('1')
    expect(result).toEqual([mockStaff])
  })

  it('getStaffApi - with role filter', async () => {
    mockApiGet.mockResolvedValue([mockStaff])
    await getStaffApi('1', 'teacher')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/staff/', { role: 'teacher' })
  })

  it('getStaffApi - without role filter', async () => {
    mockApiGet.mockResolvedValue([mockStaff])
    await getStaffApi('1')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/staff/', {
      role: undefined,
      search: undefined,
      ordering: undefined,
    })
  })

  it('getStaffByIdApi', async () => {
    mockApiGet.mockResolvedValue(mockStaff)
    await getStaffByIdApi('1', '2')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/staff/2/')
  })

  it('createStaffApi - minimal', async () => {
    mockApiPostFormData.mockResolvedValue(mockStaff)
    await createStaffApi('1', {
      user_email: 'staff@test.com', first_name: 'Jane', last_name: 'Smith', role_name: 'teacher', is_active: true,
    })
    const fd = mockApiPostFormData.mock.calls[0][1]
    expect(fd.get('user_email')).toBe('staff@test.com')
    expect(fd.get('first_name')).toBe('Jane')
    expect(fd.get('role_name')).toBe('teacher')
  })

  it('createStaffApi - with phone, batch, course', async () => {
    mockApiPostFormData.mockResolvedValue(mockStaff)
    await createStaffApi('1', {
      user_email: 'staff@test.com', first_name: 'Jane', last_name: 'Smith', role_name: 'teacher',
      phone_number: '1234567890', batches: [1, 3], assigned_courses: [2], is_active: false,
    })
    const fd = mockApiPostFormData.mock.calls[0][1]
    expect(fd.get('phone_number')).toBe('1234567890')
    expect(fd.getAll('batches')).toEqual(['1', '3'])
    expect(fd.getAll('assigned_courses')).toEqual(['2'])
    expect(fd.get('is_active')).toBe('false')
  })

  it('updateStaffApi', async () => {
    mockApiPatch.mockResolvedValue(mockStaff)
    await updateStaffApi('1', '2', { first_name: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/staff/2/', { first_name: 'Updated' })
  })

  it('replaceStaffApi', async () => {
    mockApiPut.mockResolvedValue(mockStaff)
    const payload = { user_email: 'a@b.com', first_name: 'A', last_name: 'B', phone_number: '123', role_name: 'teacher', batches: [1], is_active: true }
    await replaceStaffApi('1', '2', payload)
    expect(mockApiPut).toHaveBeenCalledWith('/api/organizations/1/staff/2/', payload)
  })

  it('deleteStaffApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteStaffApi('1', '2')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/staff/2/')
  })
})

describe('Student APIs', () => {
  it('getStudentsApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockStudent] })
    const result = await getStudentsApi('1', '2')
    expect(result).toEqual({ count: 1, next: null, previous: null, results: [mockStudent] })
  })

  it('getStudentsApi - array', async () => {
    mockApiGet.mockResolvedValue([mockStudent])
    const result = await getStudentsApi('1', '2')
    expect(result).toEqual({ count: 1, next: null, previous: null, results: [mockStudent] })
  })

  it('getOrgStudentsApi - paginated', async () => {
    mockApiGet.mockResolvedValue({ count: 1, next: null, previous: null, results: [mockStudent] })
    const result = await getOrgStudentsApi('1')
    expect(result).toEqual({ count: 1, next: null, previous: null, results: [mockStudent] })
  })

  it('getOrgStudentsApi - array', async () => {
    mockApiGet.mockResolvedValue([mockStudent])
    const result = await getOrgStudentsApi('1')
    expect(result).toEqual({ count: 1, next: null, previous: null, results: [mockStudent] })
  })

  it('getStudentByIdApi', async () => {
    mockApiGet.mockResolvedValue(mockStudent)
    await getStudentByIdApi('1', '2', '3')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/batches/2/students/3/')
  })

  it('getOrgStudentByIdApi', async () => {
    mockApiGet.mockResolvedValue(mockStudent)
    await getOrgStudentByIdApi('1', '2')
    expect(mockApiGet).toHaveBeenCalledWith('/api/organizations/1/students/2/')
  })

  it('addStudentApi', async () => {
    mockApiPost.mockResolvedValue(mockStudent)
    await addStudentApi('1', { students: [{ email: 'student@test.com', first_name: 'Alice', last_name: 'Bob' }] })
    expect(mockApiPost).toHaveBeenCalledWith('/api/organizations/1/students/', expect.any(Object))
  })

  it('removeStudentApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await removeStudentApi('1', '2', '3')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/batches/2/students/3/')
  })

  it('updateStudentApi', async () => {
    mockApiPatch.mockResolvedValue(mockStudent)
    await updateStudentApi('1', '2', '3', { first_name: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/batches/2/students/3/', { first_name: 'Updated' })
  })

  it('updateOrgStudentApi', async () => {
    mockApiPatch.mockResolvedValue(mockStudent)
    await updateOrgStudentApi('1', '2', { first_name: 'Updated' })
    expect(mockApiPatch).toHaveBeenCalledWith('/api/organizations/1/students/2/', { first_name: 'Updated' })
  })

  it('deleteOrgStudentApi', async () => {
    mockApiDelete.mockResolvedValue(undefined)
    await deleteOrgStudentApi('1', '2')
    expect(mockApiDelete).toHaveBeenCalledWith('/api/organizations/1/students/2/')
  })

  it('replaceStudentApi', async () => {
    mockApiPut.mockResolvedValue(mockStudent)
    const payload = { email: 'a@b.com', first_name: 'A', last_name: 'B', phone_number: '123', student_id: 'S1', course_id: 1, batch_ids: [1], is_active: true }
    await replaceStudentApi('1', '2', '3', payload)
    expect(mockApiPut).toHaveBeenCalledWith('/api/organizations/1/batches/2/students/3/', payload)
  })
})
