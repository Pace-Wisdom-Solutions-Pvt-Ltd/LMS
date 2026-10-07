// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from '@/config'
import type { ApiModuleNode } from '@/lib/api/organizations'

export type CourseStatus = 'draft' | 'published'

export function toCourseStatus(status: unknown): CourseStatus {
  return String(status).toLowerCase() === 'published' ? 'published' : 'draft'
}

/** Root phase nodes: no valid parent FK (never use 0 — backend rejects it). */
export function isRootModuleNode(n: ApiModuleNode): boolean {
  const pr = n.prerequisite_node
  return pr == null || pr === undefined || Number(pr) <= 0
}

/**
 * True when a node carries actual learning content (material, task, or quiz)
 * rather than being an empty chapter/phase heading.
 *
 * A real chapter heading is created with only title/description/sequence_order
 * (see CourseBuilder commit logic), so it has no content fields. A content node
 * that merely happens to be first in a prerequisite chain (prerequisite_node = null)
 * must NOT be mistaken for a chapter — otherwise it gets swallowed as a header and
 * its content disappears from the curriculum.
 */
export function nodeHasContent(n: ApiModuleNode): boolean {
  const lm = (n as { learning_material?: { content_type?: string | null; content_url?: string | null; content_file?: string | null; content_text?: string | null } | null }).learning_material
  const hasMaterial = !!(
    n.content_type || n.content_url || n.content_file || n.content_text ||
    n.learning_material_content_type || n.learning_material_content_url ||
    n.learning_material_content_file || n.learning_material_content_text ||
    lm?.content_type || lm?.content_url || lm?.content_file || lm?.content_text
  )
  const isTask = !!(n as { task_title?: unknown; task?: unknown }).task_title ||
    !!(n as { task?: unknown }).task ||
    Object.keys(n).some((k) => k.startsWith('task_allow_'))
  const isQuiz = !!(n as { quiz_name?: unknown }).quiz_name ||
    (n as { questions_input?: unknown }).questions_input != null ||
    (Array.isArray((n as { quizzes?: unknown[] }).quizzes) && ((n as { quizzes?: unknown[] }).quizzes?.length ?? 0) > 0)
  return hasMaterial || isTask || isQuiz
}

/**
 * All descendant nodes reachable from `rootId` by following prerequisite_node
 * links (handles both "all items point to the phase" and chained structures),
 * sorted by sequence_order. The root itself is not included.
 */
export function collectDescendantNodes(rootId: number, list: ApiModuleNode[]): ApiModuleNode[] {
  const result: ApiModuleNode[] = []
  const visited = new Set<number>()
  let frontier = [rootId]
  while (frontier.length > 0) {
    const next: number[] = []
    for (const id of frontier) {
      if (visited.has(id)) continue
      visited.add(id)
      const children = list.filter((n) => Number(n.prerequisite_node) === id)
      result.push(...children)
      next.push(...children.map((c) => c.id))
    }
    frontier = next
  }
  return result.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
}

export function getYouTubeId(url: string): string | null {
  const raw = url.trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '')
      return id || null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/').filter(Boolean)
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1]
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1]
    }
  } catch {
    // ignore
  }
  const match = raw.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,})/)
  return match?.[1] ?? null
}

export function toAbsoluteContentUrl(url: string): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) return raw
  if (raw.startsWith('/')) return `${config.api.baseUrl}${raw}`
  return raw
}

export function buildQuestionsInputJson(
  draftQuestions: Array<{ text: string; options: string[]; correctIndices: number[]; multiSelect?: boolean }>
): string {
  const OPTION_LETTERS = 'abcdefghijklmnopqrstuvwxyz'
  const items = draftQuestions.map((dq) => {
    const filled = dq.options.map((t) => t.trim()).filter(Boolean)
    const filledIndices = dq.options.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0)
    const letters = dq.correctIndices
      .map((ci) => OPTION_LETTERS[filledIndices.indexOf(ci)])
      .filter(Boolean)
    const correct_option = letters.join(',')
    return {
      question_text: dq.text.trim(),
      option_a: filled[0] ?? '',
      option_b: filled[1] ?? '',
      option_c: filled[2] ?? '',
      option_d: filled[3] ?? '',
      extra_options: filled.slice(4),
      correct_option,
      allow_multiple_correct: dq.multiSelect ?? false,
    }
  })
  return JSON.stringify(items)
}
