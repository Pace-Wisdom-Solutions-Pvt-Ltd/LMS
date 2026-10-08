// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ProgramInner } from '../course-builder/CourseBuilderProgramInner'
import * as orgApi from '../../../lib/api/organizations'

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api/organizations', () => ({
  deleteModuleNodeApi: vi.fn(),
  getModuleNodeApi: vi.fn(),
}))

describe('CourseBuilderProgramInner API node interactions', () => {
  it('covers API node Edit mapping branches and Remove confirm branches', async () => {
    const user = userEvent.setup()

    const refreshSpy = vi.fn(async () => {})
    const requestConfirm = vi.fn(async () => false)
    const setNodeEditLoading = vi.fn()
    const setNodeEditModal = vi.fn()

    vi.mocked(orgApi.getModuleNodeApi).mockResolvedValue({
      id: 22,
      title: 'Node title',
      description: 'desc',
      // content_type intentionally empty to force inference mapping path
      content_type: '',
      learning_material_content_type: 'screenshot',
      // use learning_material content_url and screenshot type to hit mapping ct === 'screenshot' -> 'link'
      learning_material: {
        content_type: 'screenshot',
        content_url: 'https://example.com/file.pdf',
        focus_areas: 'focus',
        quick_outline: 'outline',
        content_text: 'text',
      },
    })

    render(
      <ProgramInner
        programId="chapter:mod-1:1"
        apiCurriculum={{
          orgId: 'org-1',
          moduleId: 'mod-1',
          chapterId: 1,
          nodesInModule: 2,
          refresh: refreshSpy,
        }}
        apiChildNodes={[
          {
            id: 22,
            title: 'Child',
            chapter: 1,
            sequence_order: 2,
            content_url: '',
            content_type: '',
            description: 'd',
            learning_material_content_url: 'https://example.com/file.pdf',
            learning_material_content_type: '',
          },
        ]}
        orgId="org-1"
        effectiveCourseId="course-1"
        refresh={vi.fn()}
        requestConfirm={requestConfirm}
        nodeEditLoading={null}
        setNodeEditLoading={setNodeEditLoading}
        setNodeEditModal={setNodeEditModal}
      />,
    )

    // Find the API child item row and click Edit to cover mapping logic
    const row = screen.getByText('Child').closest('li')
    expect(row).toBeTruthy()
    if (!row) return

    await user.click(within(row).getByRole('button', { name: /^edit$/i }))

    await waitFor(() => {
      expect(orgApi.getModuleNodeApi).toHaveBeenCalled()
      expect(setNodeEditModal).toHaveBeenCalled()
    })

    const modalArg = vi.mocked(setNodeEditModal).mock.calls.at(-1)?.[0]
    expect(modalArg).toMatchObject({
      nodeId: 22,
      title: 'Node title',
      // mapping: screenshot -> link
      contentType: 'link',
    })

    // Remove branch: confirm false should not delete
    await user.click(within(row).getByRole('button', { name: /remove/i }))
    await waitFor(() => {
      expect(requestConfirm).toHaveBeenCalled()
    })
    expect(orgApi.deleteModuleNodeApi).not.toHaveBeenCalled()

    // Remove branch: confirm true should delete and refresh
    requestConfirm.mockResolvedValueOnce(true)
    await user.click(within(row).getByRole('button', { name: /remove/i }))
    await waitFor(() => {
      expect(orgApi.deleteModuleNodeApi).toHaveBeenCalled()
      expect(refreshSpy).toHaveBeenCalled()
    })
  })
})

