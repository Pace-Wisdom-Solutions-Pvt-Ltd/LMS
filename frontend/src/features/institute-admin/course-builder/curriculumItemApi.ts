// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { createModuleNodeApi } from '@/lib/api/organizations'
import type { SubmissionFormat } from '../store'

/**
 * Everything needed to POST a new curriculum item node the moment it is created,
 * instead of queuing it locally for a later "Save Curriculum" pass. Built from
 * the phase's `ApiCurriculumContext` + the course id — see ProgramInner.
 */
export type ItemCreateContext = {
  orgId: string
  effectiveCourseId: string | number
  moduleId: string
  /** Existing chapter (phase) node id; null when the chapter is an unsaved draft. */
  phaseNodeId: number | null
  /** Unsaved chapter details — its node is created lazily on the first item POST. */
  phaseDraft?: { title: string; description: string }
  /** Invoked once the draft chapter has been persisted, so the parent can drop it. */
  onDraftCommitted?: () => void
}

function resourceTypeToLabel(type: string): 'Link' | 'PDF' | 'Video' {
  switch (type) {
    case 'link':
      return 'Link'
    case 'pdf':
      return 'PDF'
    default:
      return 'Video'
  }
}

/**
 * Resolve the node a new item should hang under. When the chapter is still an
 * unsaved draft, its root node is created first (once) so items nest inside the
 * chapter instead of landing at the module root; `onDraftCommitted` then lets the
 * caller clear the local draft. Returns undefined when there is no chapter at all
 * (item lands at module root).
 */
async function resolvePrerequisiteNode(ctx: ItemCreateContext): Promise<number | undefined> {
  if (ctx.phaseNodeId) return ctx.phaseNodeId
  if (ctx.phaseDraft) {
    const phase = await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
      title: ctx.phaseDraft.title,
      description: ctx.phaseDraft.description || '',
    })
    ctx.onDraftCommitted?.()
    return phase.id
  }
  return undefined
}

export type NewResourceInput = {
  title: string
  type: string
  url: string
  focusNotes?: string
  outline?: string
}

export async function createResourceNode(ctx: ItemCreateContext, res: NewResourceInput): Promise<void> {
  const prerequisiteNode = await resolvePrerequisiteNode(ctx)
  await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
    title: res.title,
    description: res.focusNotes ?? '',
    prerequisite_node: prerequisiteNode,
    learning_material_content_type: resourceTypeToLabel(res.type),
    learning_material_content_url: res.url || undefined,
    focus_areas: res.focusNotes ?? undefined,
    quick_outline: res.outline ?? undefined,
  })
}

export type NewTaskInput = {
  title: string
  description?: string
  attachment: File | null
  formats: SubmissionFormat[]
}

export async function createTaskNode(ctx: ItemCreateContext, t: NewTaskInput): Promise<void> {
  const prerequisiteNode = await resolvePrerequisiteNode(ctx)
  const fmt = new Set<string>(t.formats)
  await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
    title: t.title,
    description: '',
    prerequisite_node: prerequisiteNode,
    task_title: t.title,
    task_description: t.description,
    task_attachment: t.attachment ?? undefined,
    task_allow_link: fmt.has('link'),
    task_allow_paragraph: fmt.has('paragraph'),
    task_allow_pdf: fmt.has('pdf'),
    task_allow_screenshot: fmt.has('screenshot'),
    task_allow_code_block: fmt.has('codeblock'),
    task_allow_file: fmt.has('file'),
  })
}

export type NewQuizInput = {
  name: string
  timerMinutes?: number
  allowMultipleCorrect: boolean
  /** Pre-serialized questions array (JSON) for the node's `questions_input`. */
  questionsInputJson: string
}

export async function createQuizNode(ctx: ItemCreateContext, quiz: NewQuizInput): Promise<void> {
  const prerequisiteNode = await resolvePrerequisiteNode(ctx)
  await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
    title: quiz.name,
    description: '',
    prerequisite_node: prerequisiteNode,
    quiz_name: quiz.name,
    quiz_timer_minutes: quiz.timerMinutes,
    quiz_allow_multiple_correct: quiz.allowMultipleCorrect || undefined,
    questions_input: quiz.questionsInputJson,
  })
}

