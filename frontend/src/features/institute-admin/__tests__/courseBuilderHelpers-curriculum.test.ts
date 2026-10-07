// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import type { ApiModuleNode } from '@/lib/api/organizations'
import { nodeHasContent, collectDescendantNodes } from '../course-builder/courseBuilderHelpers'

/**
 * Regression: a curriculum of 6 chained "Git tutorial" videos was rendering only
 * 5 items because the first node (prerequisite_node = null) was misclassified as
 * an empty chapter heading and swallowed. A node carrying learning material must
 * be treated as a content item, and the whole chain must be reachable.
 */
const chain: ApiModuleNode[] = [
  { id: 975, module: 621, title: 'Git tutorial', sequence_order: 1, prerequisite_node: null, learning_material: { content_type: 'Link', content_url: 'https://www.youtube.com/watch?v=8JJ101D3knE' } } as unknown as ApiModuleNode,
  { id: 976, module: 621, title: 'Git tutorial', sequence_order: 2, prerequisite_node: 975, learning_material: { content_type: 'Link', content_url: 'https://www.youtube.com/watch?v=A2R-CMMyp64' } } as unknown as ApiModuleNode,
  { id: 977, module: 621, title: 'Git tutorial', sequence_order: 3, prerequisite_node: 976, learning_material: { content_type: 'Link', content_url: 'https://www.youtube.com/watch?v=gwWKnnCMQ5c' } } as unknown as ApiModuleNode,
  { id: 978, module: 621, title: 'Git tutorial', sequence_order: 4, prerequisite_node: 977, learning_material: { content_type: 'Link', content_url: 'https://www.youtube.com/watch?v=apGV9Kg7ics' } } as unknown as ApiModuleNode,
  { id: 979, module: 621, title: 'Git tutorial', sequence_order: 5, prerequisite_node: 978, learning_material: { content_type: 'Link', content_url: 'https://www.youtube.com/watch?v=WbwIoQYP6no' } } as unknown as ApiModuleNode,
  { id: 980, module: 621, title: 'Git tutorial', sequence_order: 6, prerequisite_node: 979, learning_material: { content_type: 'Link', content_url: 'https://www.youtube.com/watch?v=s8ZLs6oerYQ' } } as unknown as ApiModuleNode,
]

describe('nodeHasContent', () => {
  it('treats a node with learning material as content (not a chapter heading)', () => {
    expect(nodeHasContent(chain[0])).toBe(true)
  })

  it('treats a task node as content', () => {
    const task = { id: 1, title: 'Task', task_title: 'Submit work' } as unknown as ApiModuleNode
    expect(nodeHasContent(task)).toBe(true)
  })

  it('treats a quiz node as content', () => {
    const quiz = { id: 2, title: 'Quiz', quiz_name: 'Final Quiz' } as unknown as ApiModuleNode
    expect(nodeHasContent(quiz)).toBe(true)
  })

  it('treats an empty title/description-only node as a chapter heading (no content)', () => {
    const heading = { id: 3, title: 'Module 1', description: 'Intro', prerequisite_node: null } as unknown as ApiModuleNode
    expect(nodeHasContent(heading)).toBe(false)
  })
})

describe('collectDescendantNodes', () => {
  it('walks the full prerequisite chain, not just direct children', () => {
    const descendants = collectDescendantNodes(975, chain)
    expect(descendants.map((n) => n.id)).toEqual([976, 977, 978, 979, 980])
  })

  it('flat curriculum render includes the content root + its chain = all 6 items', () => {
    const root = chain[0]
    const childNodes = nodeHasContent(root)
      ? [root, ...collectDescendantNodes(root.id, chain)]
      : collectDescendantNodes(root.id, chain)
    expect(childNodes.map((n) => n.id)).toEqual([975, 976, 977, 978, 979, 980])
  })
})
