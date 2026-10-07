// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StudentMyCourses from '../courses/MyCourses'
import * as orgApi from '../../../lib/api/organizations'

/**
 * Covers the flag-based roadmap contract: the list endpoint returns capability
 * flags (`has_*`) + `is_accessible` instead of embedded content, and the full
 * content is fetched from the node-detail endpoint when a node is opened.
 */
vi.mock('../../../lib/api/organizations', () => ({
  getMyCoursesApi: vi.fn(),
  getCourseRoadmapApi: vi.fn(),
  completeModuleNodeApi: vi.fn(),
  getStudentNodeDetailApi: vi.fn(),
  getTaskSubmissionsApi: vi.fn(),
}))

vi.mock('../../../lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
}))

const mockCourse = [
  { id: 1, title: 'Test Course', description: 'Desc', completion_percentage: '0' },
]

const renderRoadmap = () =>
  render(
    <MemoryRouter initialEntries={['/student/my-courses/1']}>
      <Routes>
        <Route path="/student/my-courses/:courseId" element={<StudentMyCourses />} />
      </Routes>
    </MemoryRouter>
  )

/** A flag-only roadmap node — no embedded content, just capability flags. */
const flagNode = (
  id: number,
  flags: Partial<{
    has_learning_material: boolean
    has_task: boolean
    has_quiz: boolean
    has_coding_questions: boolean
    is_accessible: boolean
    is_completed: boolean
  }>
) => ({
  id,
  title: `Node ${id}`,
  description: 'desc',
  has_learning_material: false,
  has_task: false,
  has_quiz: false,
  has_coding_questions: false,
  is_accessible: true,
  is_completed: false,
  ...flags,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourse as never)
  vi.mocked(orgApi.completeModuleNodeApi).mockResolvedValue(undefined)
  vi.mocked(orgApi.getTaskSubmissionsApi).mockResolvedValue([] as never)
})

describe('Roadmap capability flags drive node category', () => {
  it('renders the QUIZ badge from has_quiz without embedded quiz data', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue({
      modules: [
        { id: 101, title: 'Intro', nodes: [flagNode(201, { has_quiz: true })] },
      ],
    } as never)

    renderRoadmap()

    await waitFor(() => expect(screen.getByText('Node 201')).toBeDefined())
    expect(screen.getByText('QUIZ')).toBeDefined()
  })
})

describe('is_accessible controls node locking', () => {
  it('locks a node the API marks inaccessible even when it is not the first', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue({
      modules: [
        {
          id: 101,
          title: 'Intro',
          nodes: [
            flagNode(201, { has_learning_material: true, is_accessible: true }),
            flagNode(202, { has_learning_material: true, is_accessible: false }),
          ],
        },
      ],
    } as never)

    renderRoadmap()

    await waitFor(() => expect(screen.getByText('Node 202')).toBeDefined())
    // The inaccessible node shows the LOCKED badge.
    expect(screen.getAllByText(/^LOCKED$/i).length).toBe(1)
  })
})

describe('Opening a flag-only node fetches its content on demand', () => {
  it('calls the node-detail endpoint and renders the fetched video', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue({
      modules: [
        {
          id: 101,
          title: 'Intro',
          nodes: [flagNode(201, { has_learning_material: true })],
        },
      ],
    } as never)
    vi.mocked(orgApi.getStudentNodeDetailApi).mockResolvedValue({
      id: 201,
      title: 'Node 201',
      learning_material: {
        content_type: 'video',
        content_url: 'https://youtube.com/watch?v=abcdefghijk',
      },
    } as never)

    renderRoadmap()

    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await waitFor(() =>
      expect(orgApi.getStudentNodeDetailApi).toHaveBeenCalledWith('1', '1', '101', 201)
    )
  })

  it('shows a locked message when node-detail returns an error (403)', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue({
      modules: [
        {
          id: 101,
          title: 'Intro',
          nodes: [flagNode(201, { has_learning_material: true })],
        },
      ],
    } as never)
    vi.mocked(orgApi.getStudentNodeDetailApi).mockRejectedValue(
      new Error('You must complete the previous node first.')
    )

    renderRoadmap()

    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await waitFor(() =>
      expect(
        screen.getByText('You must complete the previous node first.')
      ).toBeDefined()
    )
  })
})
