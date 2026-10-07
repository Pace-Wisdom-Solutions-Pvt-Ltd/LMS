// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StudentMyCourses from '../courses/MyCourses'
import * as orgApi from '../../../lib/api/organizations'
import type { ApiCourseRoadmap, ApiEnrolledCourse } from '../../../lib/api/organizations'
import type { RoadmapNodeData } from '../courses/components/courseMeta'

vi.mock('../../../lib/api/organizations', () => ({
  getMyCoursesApi: vi.fn(),
  getCourseRoadmapApi: vi.fn(),
  completeModuleNodeApi: vi.fn(),
}))

vi.mock('../../../lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
}))

const mockCourse: ApiEnrolledCourse[] = [
  {
    id: 1,
    organization: 1,
    title: 'Test Course',
    description: 'Desc',
    completion_percentage: '0',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

/**
 * Builds a roadmap from legacy/detail-shaped nodes (content inline), which the
 * UI still supports but `ApiRoadmapNode` (capability flags only) doesn't model.
 */
const asRoadmap = (modules: { id: number; title: string; nodes: RoadmapNodeData[] }[]) =>
  ({ ...mockCourse[0], modules }) as unknown as ApiCourseRoadmap

const renderRoadmap = () =>
  render(
    <MemoryRouter initialEntries={['/student/my-courses/1']}>
      <Routes>
        <Route path="/student/my-courses/:courseId" element={<StudentMyCourses />} />
      </Routes>
    </MemoryRouter>
  )

const videoNode = (id: number, isDone: boolean, extra: Partial<RoadmapNodeData> = {}): RoadmapNodeData => ({
  id,
  title: `Node ${id}`,
  description: 'desc',
  learning_material: { content_type: 'video', content_url: `https://youtube.com/watch?v=abc${id}` },
  is_completed: isDone,
  ...extra,
})

const headingNode = (id: number): RoadmapNodeData => ({
  id,
  title: `Heading ${id}`,
  // no learning_material, no task, no quiz → isHeading = true
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourse)
  vi.mocked(orgApi.completeModuleNodeApi).mockResolvedValue(undefined)
})

/* ─── Phase unlock based on API completion ─── */

describe('Phase 2 unlocks when all Phase 1 completable nodes are done', () => {
  it('unlocks phase 2 when all phase 1 nodes have is_completed=true', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      { id: 101, title: 'Easy', nodes: [videoNode(201, true), videoNode(202, true)] },
      { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
    ]))

    renderRoadmap()

    await waitFor(() => {
      // Phase 2 section title should be visible
      expect(screen.getByText('Hard')).toBeDefined()
    })

    // Should NOT show the "Locked" section status pill
    const lockedLabels = screen.queryAllByText('Locked Phase')
    expect(lockedLabels.length).toBe(0)
  })

  it('keeps phase 2 locked when phase 1 nodes are not completed', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      { id: 101, title: 'Easy', nodes: [videoNode(201, false), videoNode(202, false)] },
      { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
    ]))

    renderRoadmap()

    await waitFor(() => {
      expect(screen.getByText('Locked Phase')).toBeDefined()
    })
  })

  it('keeps phase 2 locked when only some phase 1 nodes are completed', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      { id: 101, title: 'Easy', nodes: [videoNode(201, true), videoNode(202, false)] },
      { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
    ]))

    renderRoadmap()

    await waitFor(() => {
      expect(screen.getByText('Locked Phase')).toBeDefined()
    })
  })
})

/* ─── Heading nodes don't block unlock ─── */

describe('Heading nodes do not block phase unlock', () => {
  it('unlocks phase 2 even when phase 1 has a heading node (heading is never completable)', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Easy',
        nodes: [
          headingNode(200),         // heading — should be skipped in lock check
          videoNode(201, true),     // completable — done
          videoNode(202, true),     // completable — done
        ],
      },
      { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
    ]))

    renderRoadmap()

    await waitFor(() => {
      expect(screen.getByText('Hard')).toBeDefined()
    })

    const lockedLabels = screen.queryAllByText('Locked Phase')
    expect(lockedLabels.length).toBe(0)
  })

  it('still locks phase 2 when heading is present but completable nodes are not done', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Easy',
        nodes: [
          headingNode(200),
          videoNode(201, false),  // completable — not done
        ],
      },
      { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
    ]))

    renderRoadmap()

    await waitFor(() => {
      expect(screen.getByText('Locked Phase')).toBeDefined()
    })
  })
})

/* ─── Already-completed nodes are never locked ─── */

describe('Already-completed nodes are always accessible', () => {
  it('does not lock a node that is already completed even if previous is not done', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Easy',
        nodes: [
          videoNode(201, false),  // first node — not done
          videoNode(202, true),   // second node — already done, should NOT be locked
          videoNode(203, false),  // third node — locked (prev 202 is done, so actually unlocked)
        ],
      },
    ]))

    renderRoadmap()

    // All nodes visible since first module is auto-expanded
    await waitFor(() => {
      expect(screen.getByText('Node 202')).toBeDefined()
    })

    // Node 202 should not show locked badge
    const lockedBadges = screen.queryAllByText(/LOCKED/i)
    // Node 201 is first (never locked), 202 is done (never locked), 203 is after done 202 (unlocked)
    expect(lockedBadges.length).toBe(0)
  })
})

/* ─── localDone unlocks next node immediately ─── */

describe('Marking a node done immediately unlocks the next node', () => {
  it('unlocks second node after first is marked done via API call', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Easy',
        nodes: [
          videoNode(201, false),  // first
          videoNode(202, false),  // second — initially locked
        ],
      },
    ]))

    renderRoadmap()

    // Expand first node; the second starts locked
    const nodeBtns = await screen.findAllByTestId('node-btn')
    expect(screen.getAllByText(/^LOCKED$/i).length).toBe(1)
    fireEvent.click(nodeBtns[0])

    // Mark first node as done
    const completeBtn = await screen.findByText(/MARK AS COMPLETED/i)
    fireEvent.click(completeBtn)

    await waitFor(() => {
      expect(orgApi.completeModuleNodeApi).toHaveBeenCalledWith(201)
    })

    // After marking done, second node should no longer be locked
    await waitFor(() => {
      const lockedBadges = screen.queryAllByText(/^LOCKED$/i)
      expect(lockedBadges.length).toBe(0)
    })
  })
})

/* ─── localDone unlocks next phase ─── */

describe('Marking all Phase 1 nodes done unlocks Phase 2', () => {
  it('unlocks phase 2 after last phase 1 node is marked done locally', async () => {
    // Return updated roadmap after tick
    let callCount = 0
    vi.mocked(orgApi.getCourseRoadmapApi).mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return asRoadmap([
          { id: 101, title: 'Easy', nodes: [videoNode(201, false)] },
          { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
        ])
      }
      // After re-fetch (tick), node 201 is completed
      return asRoadmap([
        { id: 101, title: 'Easy', nodes: [videoNode(201, true)] },
        { id: 102, title: 'Hard', nodes: [videoNode(301, false)] },
      ])
    })

    renderRoadmap()

    // Phase 2 starts locked
    expect(await screen.findByText('Locked Phase')).toBeDefined()

    // Expand first node and mark done
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    const completeBtn = await screen.findByText(/MARK AS COMPLETED/i)
    fireEvent.click(completeBtn)

    await waitFor(() => {
      expect(orgApi.completeModuleNodeApi).toHaveBeenCalledWith(201)
    })

    // After re-fetch with updated data, phase 2 should unlock
    await waitFor(() => {
      const lockedLabels = screen.queryAllByText('Locked Phase')
      expect(lockedLabels.length).toBe(0)
    }, { timeout: 3000 })
  })
})

/* ─── Phase has existing progress — always accessible ─── */

describe('Phase with existing progress is never locked', () => {
  it('unlocks a phase that already has completed nodes even if previous phase is incomplete', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      { id: 101, title: 'Easy', nodes: [videoNode(201, false)] },  // not done
      { id: 102, title: 'Hard', nodes: [videoNode(301, true)] },   // has progress already
    ]))

    renderRoadmap()

    await waitFor(() => {
      expect(screen.getByText('Hard')).toBeDefined()
    })
    expect(screen.queryAllByText('Locked Phase').length).toBe(0)
  })
})
