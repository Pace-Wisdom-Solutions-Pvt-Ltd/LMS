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
  /** Chapter (card) the new item belongs to; null puts it outside any chapter. */
  chapterId: number | null
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

export type NewResourceInput = {
  title: string
  type: string
  url: string
  focusNotes?: string
  outline?: string
}

export async function createResourceNode(ctx: ItemCreateContext, res: NewResourceInput): Promise<void> {
  await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
    title: res.title,
    description: res.focusNotes ?? '',
    chapter: ctx.chapterId ?? undefined,
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
  const fmt = new Set<string>(t.formats)
  await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
    title: t.title,
    description: '',
    chapter: ctx.chapterId ?? undefined,
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
  await createModuleNodeApi(ctx.orgId, ctx.effectiveCourseId, ctx.moduleId, {
    title: quiz.name,
    description: '',
    chapter: ctx.chapterId ?? undefined,
    quiz_name: quiz.name,
    quiz_timer_minutes: quiz.timerMinutes,
    quiz_allow_multiple_correct: quiz.allowMultipleCorrect || undefined,
    questions_input: quiz.questionsInputJson,
  })
}

