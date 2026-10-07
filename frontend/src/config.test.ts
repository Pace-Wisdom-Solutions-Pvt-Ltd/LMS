// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { computeBaseUrl, config } from './config'

describe('config', () => {
  it('computeBaseUrl uses default when env missing', () => {
    expect(computeBaseUrl(undefined)).toBe('')
    expect(computeBaseUrl('')).toBe('')
  })

  it('computeBaseUrl strips trailing slash', () => {
    expect(computeBaseUrl('https://example.com/api/')).toBe('https://example.com/api')
    expect(computeBaseUrl('https://example.com/api')).toBe('https://example.com/api')
  })

  it('endpoints build correct urls', () => {
    expect(config.api.endpoints.users.detail('u1')).toBe('/users/u1/')
    expect(config.api.endpoints.organizations.detail('org1')).toBe('/organizations/org1/')
    expect(config.api.endpoints.organizations.batches.detail('org1', 'b1')).toBe('/organizations/org1/batches/b1/')
    expect(config.api.endpoints.organizations.students.detail('org1', 'b1', 's1')).toBe('/organizations/org1/batches/b1/students/s1/')
  })

  it('builds common endpoint paths', () => {
    expect(config.api.endpoints.auth.login).toBe('/auth/login/')
    expect(config.api.endpoints.users.detail('1')).toBe('/users/1/')
    expect(config.api.endpoints.organizations.list).toBe('/organizations/')
    expect(config.api.endpoints.organizations.detail('10')).toBe('/organizations/10/')

    // courses/modules/nodes
    expect(config.api.endpoints.organizations.courses.list('10')).toBe('/organizations/10/courses/')
    expect(config.api.endpoints.organizations.courses.modules.list('10', 2)).toBe('/organizations/10/courses/2/modules/')
    expect(config.api.endpoints.organizations.courses.modules.nodes.detail('10', 2, 3, 4)).toBe('/organizations/10/courses/2/modules/3/nodes/4/')
  })

  it('has api.baseUrl', () => {
    expect(typeof config.api.baseUrl).toBe('string')
    expect(config.api.baseUrl.length).toBeGreaterThan(0)
  })

  it('auth endpoints are strings', () => {
    expect(config.api.endpoints.auth.login).toBe('/auth/login/')
    expect(config.api.endpoints.auth.logout).toBe('/auth/logout/')
    expect(config.api.endpoints.auth.refresh).toBe('/auth/refresh/')
  })

  it('users endpoints work', () => {
    expect(config.api.endpoints.users.list).toBe('/users/')
    expect(config.api.endpoints.users.detail('123')).toBe('/users/123/')
  })

  it('organizations batches endpoint builds correct path', () => {
    const ep = config.api.endpoints.organizations
    expect(ep.list).toBe('/organizations/')
    expect(ep.detail('org1')).toBe('/organizations/org1/')
    expect(ep.batches.list('org1')).toBe('/organizations/org1/batches/')
    expect(ep.batches.detail('org1', 'b1')).toBe('/organizations/org1/batches/b1/')
  })

  it('courses modules nodes endpoint builds correct path', () => {
    const ep = config.api.endpoints.organizations.courses
    expect(ep.list('org1')).toBe('/organizations/org1/courses/')
    expect(ep.modules.list('org1', 'c1')).toBe('/organizations/org1/courses/c1/modules/')
    expect(ep.modules.detail('org1', 'c1', 'm1')).toBe('/organizations/org1/courses/c1/modules/m1/')
    expect(ep.modules.nodes.list('org1', 'c1', 'm1')).toBe('/organizations/org1/courses/c1/modules/m1/nodes/')
    expect(ep.modules.nodes.detail('org1', 'c1', 'm1', 'n1')).toBe('/organizations/org1/courses/c1/modules/m1/nodes/n1/')
  })

  it('students endpoints build correct paths', () => {
    const ep = config.api.endpoints.organizations.students
    expect(ep.orgList('org1')).toBe('/organizations/org1/students/')
    expect(ep.list('org1', 'b1')).toBe('/organizations/org1/batches/b1/students/')
    expect(ep.detail('org1', 'b1', 's1')).toBe('/organizations/org1/batches/b1/students/s1/')
  })

  it('staff endpoints build correct paths', () => {
    const ep = config.api.endpoints.organizations.staff
    expect(ep.list('org1')).toBe('/organizations/org1/staff/')
    expect(ep.detail('org1', 's1')).toBe('/organizations/org1/staff/s1/')
  })

  it('roles endpoint is correct', () => {
    expect(config.api.endpoints.roles.list).toBe('/roles/org-roles/')
  })

  it('computeBaseUrl returns default for non-string values', () => {
    expect(computeBaseUrl(null)).toBe('')
    expect(computeBaseUrl(0)).toBe('')
    expect(computeBaseUrl(false)).toBe('')
    expect(computeBaseUrl(42)).toBe('')
  })

  it('analyticsOverview endpoint builds correct path', () => {
    expect(config.api.endpoints.organizations.analyticsOverview('org1')).toBe('/organizations/org1/analytics/overview/')
  })

  it('trainerList endpoint builds correct path', () => {
    expect(config.api.endpoints.organizations.trainerList('org1')).toBe('/organizations/org1/trainer-list/')
  })

  it('teacherDashboard endpoint builds correct path', () => {
    expect(config.api.endpoints.organizations.teacherDashboard('org1', 't1')).toBe('/organizations/org1/teacher-dashboard/t1/')
  })

  it('learnerProgress endpoint builds correct path', () => {
    expect(config.api.endpoints.organizations.learnerProgress('org1')).toBe('/organizations/org1/learner-progress/')
  })

  it('members endpoints build correct paths', () => {
    const ep = config.api.endpoints.organizations.members
    expect(ep.list('org1')).toBe('/organizations/org1/members/')
    expect(ep.detail('org1', 'm1')).toBe('/organizations/org1/members/m1/')
  })

  it('myCourses endpoint builds correct path', () => {
    expect(config.api.endpoints.organizations.myCourses('org1')).toBe('/organizations/org1/my-courses/')
  })

  it('nodes endpoints build correct paths', () => {
    const ep = config.api.endpoints.nodes
    expect(ep.complete(1)).toBe('/nodes/1/complete/')
    expect(ep.submit(2)).toBe('/nodes/2/submit/')
    expect(ep.allSubmissions(3)).toBe('/nodes/3/task/all-submissions/')
    expect(ep.taskSubmissions(4)).toBe('/nodes/4/task/submit/')
  })

  it('nodes endpoints work with string ids', () => {
    const ep = config.api.endpoints.nodes
    expect(ep.complete('abc')).toBe('/nodes/abc/complete/')
    expect(ep.submit('def')).toBe('/nodes/def/submit/')
    expect(ep.allSubmissions('ghi')).toBe('/nodes/ghi/task/all-submissions/')
    expect(ep.taskSubmissions('jkl')).toBe('/nodes/jkl/task/submit/')
  })

  it('students orgDetail and dashboard endpoints', () => {
    const ep = config.api.endpoints.organizations.students
    expect(ep.orgDetail('org1', 's1')).toBe('/organizations/org1/students/s1/')
    expect(ep.dashboard('org1')).toBe('/organizations/org1/students/me/dashboard/')
  })

  it('courses detail and roadmap endpoints', () => {
    const ep = config.api.endpoints.organizations.courses
    expect(ep.detail('org1', 'c1')).toBe('/organizations/org1/courses/c1/')
    expect(ep.detail('org1', 123)).toBe('/organizations/org1/courses/123/')
    expect(ep.roadmap('org1', 'c1')).toBe('/organizations/org1/courses/c1/roadmap/')
    expect(ep.roadmap('org1', 42)).toBe('/organizations/org1/courses/42/roadmap/')
  })

  it('modules.nodes endpoints (non-course scoped)', () => {
    const ep = config.api.endpoints.organizations.modules.nodes
    expect(ep.list('org1', 'm1')).toBe('/organizations/org1/modules/m1/nodes/')
    expect(ep.detail('org1', 'm1', 'n1')).toBe('/organizations/org1/modules/m1/nodes/n1/')
    expect(ep.list('org1', 5)).toBe('/organizations/org1/modules/5/nodes/')
    expect(ep.detail('org1', 5, 10)).toBe('/organizations/org1/modules/5/nodes/10/')
  })

  it('auth acceptInvite endpoint', () => {
    expect(config.api.endpoints.auth.acceptInvite).toBe('/auth/accept-invite/')
  })
})
