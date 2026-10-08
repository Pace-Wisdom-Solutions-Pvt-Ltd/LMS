// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StudentMyCourses from '../courses/MyCourses'
import * as orgApi from '../../../lib/api/organizations'
import type { ApiCourseRoadmap, ApiEnrolledCourse, ApiRoadmapChapter } from '../../../lib/api/organizations'
import type { RoadmapNodeData } from '../courses/components/courseMeta'

vi.mock('../../../lib/api/organizations', () => ({
  getMyCoursesApi: vi.fn(),
  getCourseRoadmapApi: vi.fn(),
  completeModuleNodeApi: vi.fn(),
}))

vi.mock('../../../lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
}))

const course: ApiEnrolledCourse = {
  id: 1,
  organization: 1,
  title: 'Test Course',
  description: 'Desc',
  completion_percentage: '0',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

const video = (id: number, chapter: number | null, isDone = false): RoadmapNodeData =>
  ({
    id,
    title: `Video ${id}`,
    chapter,
    learning_material: { content_type: 'video', content_url: `https://youtube.com/watch?v=v${id}` },
    is_completed: isDone,
  }) as RoadmapNodeData

const roadmap = (chapters: ApiRoadmapChapter[], nodes: RoadmapNodeData[]) =>
  ({ ...course, modules: [{ id: 101, title: 'Beginner', chapters, nodes }] }) as unknown as ApiCourseRoadmap

const renderRoadmap = () =>
  render(
    <MemoryRouter initialEntries={['/student/my-courses/1']}>
      <Routes>
        <Route path="/student/my-courses/:courseId" element={<StudentMyCourses />} />
      </Routes>
    </MemoryRouter>,
  )

const chapters: ApiRoadmapChapter[] = [
  { id: 1, title: 'Getting started', description: 'Basics first', sequence_order: 1 },
  { id: 2, title: 'Going further', sequence_order: 2 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue([course])
})

describe('student roadmap chapters', () => {
  it('shows each chapter as its own card with only its items', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(
      roadmap(chapters, [video(11, 1, true), video(12, 1, true), video(21, 2)]),
    )
    renderRoadmap()

    const cards = await screen.findAllByTestId('roadmap-chapter')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('Chapter 1')).toBeTruthy()
    expect(within(cards[0]).getByText('Getting started')).toBeTruthy()
    expect(within(cards[0]).getByText('Basics first')).toBeTruthy()
    expect(within(cards[0]).getByText('2/2 done')).toBeTruthy()
    expect(within(cards[0]).getByText('Video 11')).toBeTruthy()
    expect(within(cards[0]).queryByText('Video 21')).toBeNull()
    expect(within(cards[1]).getByText('Going further')).toBeTruthy()
    expect(within(cards[1]).getByText('0/1 done')).toBeTruthy()
    expect(within(cards[1]).getByText('Video 21')).toBeTruthy()
  })

  it('keeps the next chapter locked until the previous chapter is finished', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(
      roadmap(chapters, [video(11, 1, true), video(12, 1), video(21, 2)]),
    )
    renderRoadmap()

    const cards = await screen.findAllByTestId('roadmap-chapter')
    expect(within(cards[0]).queryByText('LOCKED')).toBeNull()
    expect(within(cards[1]).getByText('LOCKED')).toBeTruthy()
  })

  it('collapses and expands a chapter', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(roadmap(chapters, [video(11, 1), video(21, 2)]))
    renderRoadmap()

    const cards = await screen.findAllByTestId('roadmap-chapter')
    const header = within(cards[0]).getByRole('button', { name: /Getting started/ })
    fireEvent.click(header)
    await waitFor(() => expect(within(cards[0]).queryByText('Video 11')).toBeNull())
    fireEvent.click(header)
    expect(within(cards[0]).getByText('Video 11')).toBeTruthy()
  })

  it('falls back to a single list when the level has no chapters', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(roadmap([], [video(11, null), video(12, null)]))
    renderRoadmap()

    await waitFor(() => expect(screen.getByText('Video 11')).toBeTruthy())
    expect(screen.queryAllByTestId('roadmap-chapter')).toHaveLength(0)
  })
})
