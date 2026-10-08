// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ApiModuleNode } from '@/lib/api/organizations'
import type {
  SubmissionFormat,
  ProgramAssessment,
  ProgramResource,
  ProgramTask,
} from '../store'
import { getYouTubeId, toAbsoluteContentUrl } from './courseBuilderHelpers'

export const SUBMISSION_FORMATS: { id: SubmissionFormat; label: string }[] = [
  { id: 'link', label: 'Link' },
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'pdf', label: 'PDF' },
  { id: 'screenshot', label: 'Screenshot' },
]

function editNodeType(isTask: boolean, isQuiz: boolean): NodeEditModalState['nodeType'] {
  if (isTask) return 'task'
  return isQuiz ? 'quiz' : 'content'
}

/** Maps a submission format id to its boolean field on {@link NodeEditModalState}. */
export const TASK_FORMAT_FIELDS = {
  link: 'taskAllowLink',
  paragraph: 'taskAllowParagraph',
  pdf: 'taskAllowPdf',
  screenshot: 'taskAllowScreenshot',
  codeblock: 'taskAllowCodeBlock',
  file: 'taskAllowFile',
} as const satisfies Record<SubmissionFormat, keyof NodeEditModalState>

export type Badge = { label: string; cls: string }

export type ResourceType = 'link' | 'pdf' | 'video'

/** A single MCQ question being authored in the quiz drawer. */
export type DraftQuestion = {
  id: string
  text: string
  options: Array<{ id: string; text: string }>
  correctOptionIds: string[]
  multiSelect: boolean
}

export type LocalCurriculumItem =
  | ({ __itemType: 'Resource' } & ProgramResource)
  | ({ __itemType: 'Task' } & ProgramTask)
  | ({ __itemType: 'Assessment' } & ProgramAssessment)

export type LocalItemType = LocalCurriculumItem['__itemType']

export type ApiNodeInfo = {
  badge: Badge
  isTask: boolean
  isQuiz: boolean
  effectiveUrl: string
  inferred: string
  showVideo: boolean
  thumb: string | null
  displayTitle: string
  rawType: string
}

export type ApiCurriculumContext = {
  orgId: string
  moduleId: string
  /** Chapter (card) these items belong to; null for items outside any chapter. */
  chapterId: number | null
  nodesInModule: number
  refresh: () => Promise<void>
}

export type NodeEditModalState = {
  moduleId: string
  nodeId: number
  nodeType: 'content' | 'task' | 'quiz'
  title: string
  description: string
  // content fields
  contentType: string
  originalContentType: string
  contentUrl: string
  /** Newly-picked file to upload for non-link content types (null = keep existing). */
  contentFile: File | null
  focusAreas: string
  quickOutline: string
  // task fields
  taskTitle: string
  taskDescription: string
  taskAttachmentUrl: string
  taskAllowLink: boolean
  taskAllowParagraph: boolean
  taskAllowPdf: boolean
  taskAllowScreenshot: boolean
  taskAllowCodeBlock: boolean
  taskAllowFile: boolean
  // quiz fields
  quizName: string
  quizTimerMinutes: number | ''
  quizQuestions: DraftQuestion[]
}

/** Narrow an unknown API value to a string-keyed record for safe property reads. */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function newSecureId(prefix: string): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return `${prefix}-${c.randomUUID()}`
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(4)
    c.getRandomValues(buf)
    const hex = Array.from(buf, (n) => n.toString(16).padStart(8, '0')).join('')
    return `${prefix}-${hex}`
  }
  return `${prefix}-${Date.now()}`
}

export function makeEmptyDraftQuestion(): DraftQuestion {
  return {
    id: newSecureId('dq'),
    text: '',
    options: Array.from({ length: 4 }, () => ({ id: newSecureId('opt'), text: '' })),
    correctOptionIds: [],
    multiSelect: false,
  }
}

export function localItemBadge(itemType: LocalItemType): Badge {
  switch (itemType) {
    case 'Resource':
      return { label: 'Resource', cls: 'bg-blue-50 text-blue-600' }
    case 'Task':
      return { label: 'Task', cls: 'bg-indigo-50 text-indigo-600' }
    case 'Assessment':
      return { label: 'Assessment', cls: 'bg-emerald-50 text-emerald-600' }
  }
}

export function localItemTitle(item: LocalCurriculumItem): string {
  if (item.__itemType === 'Assessment') return item.name
  return item.title
}

export function inferApiNodeContentType(rawTypeLower: string, effectiveUrl: string): string {
  if (rawTypeLower) return rawTypeLower
  const ext = effectiveUrl.split('?')[0].toLowerCase()
  if (ext.endsWith('.pdf')) return 'pdf'
  if (ext.endsWith('.doc') || ext.endsWith('.docx')) return 'doc'
  if (ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.mov')) return 'video'
  return ''
}

export function getApiNodeInfo(c: ApiModuleNode): ApiNodeInfo {
  const rec = c as unknown as Record<string, unknown>
  const lm = asRecord(rec.learning_material)

  const rawType = String(c.content_type ?? c.learning_material_content_type ?? lm.content_type ?? '')
  const typeLower = rawType.toLowerCase()
  const url = String(c.content_url ?? c.learning_material_content_url ?? lm.content_url ?? rec.contentUrl ?? '')
  const fileUrl = String(c.content_file ?? c.learning_material_content_file ?? lm.content_file ?? rec.contentFile ?? '')
  const effectiveUrl = toAbsoluteContentUrl(url || fileUrl)

  const titleLower = String(c.title ?? '').toLowerCase()
  const isTask =
    !!rec.task_title || Object.keys(rec).some((k) => k.startsWith('task_allow_')) || titleLower.includes('task') || !!rec.task
  const isQuiz =
    !!rec.quiz_name || rec.questions_input != null || titleLower.includes('quiz') || asArray(rec.quizzes).length > 0

  let badge: Badge = { label: 'Resource', cls: 'bg-blue-50 text-blue-600' }
  if (isTask) badge = { label: 'Task', cls: 'bg-indigo-50 text-indigo-600' }
  else if (isQuiz) badge = { label: 'Quiz', cls: 'bg-emerald-50 text-emerald-600' }

  const inferred = inferApiNodeContentType(typeLower, effectiveUrl)

  const yid = getYouTubeId(effectiveUrl)
  const showVideo =
    inferred === 'video' || inferred === 'youtube' || (!!yid && !!effectiveUrl) || (inferred === 'link' && !!yid)
  const thumb = yid ? `https://img.youtube.com/vi/${yid}/mqdefault.jpg` : null

  let displayTitle = String(c.title ?? '')
  if (isTask) displayTitle = String(rec.task_title ?? c.title ?? '')
  else if (isQuiz) displayTitle = String(rec.quiz_name ?? c.title ?? '')

  return { badge, isTask, isQuiz, effectiveUrl, inferred, showVideo, thumb, displayTitle, rawType }
}

export type NodeEditResolution = {
  nodeId: number
  state: NodeEditModalState
}

/**
 * Map a fully-fetched API node into the inline edit-modal state. The backend
 * returns task/quiz data either flat (`task_allow_*`, `quiz_name`) or nested
 * (`task`, `quizzes[0]`), so each field falls back across both shapes.
 */
export function buildNodeEditModalState(full: ApiModuleNode, info: ApiNodeInfo, moduleId: string): NodeEditResolution {
  const rec = full as unknown as Record<string, unknown>
  const lm = asRecord(rec.learning_material)

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = rec[k] ?? lm[k]
      if (v != null && String(v).trim() !== '') return String(v)
    }
    return ''
  }

  let contentType = pick('content_type', 'learning_material_content_type').toLowerCase()
  if (!contentType || contentType === 'resource' || contentType === 'resources') {
    contentType = info.inferred || info.rawType.toLowerCase() || ''
  }
  if (contentType === 'doc') contentType = 'document'
  if (contentType === 'screenshot') contentType = 'link'

  const taskObj = asRecord(rec.task)
  const isTask =
    info.isTask ||
    !!rec.task_title ||
    !!taskObj.allow_pdf ||
    !!taskObj.allow_link ||
    !!taskObj.allow_file ||
    !!taskObj.allow_paragraph ||
    !!taskObj.title ||
    Object.keys(rec).some((k) => k.startsWith('task_allow_'))
  const isQuiz =
    !isTask && (info.isQuiz || !!rec.quiz_name || rec.questions_input != null || asArray(rec.quizzes).length > 0)

  const quizObj = asRecord(asArray(rec.quizzes)[0])
  let quizQuestions: DraftQuestion[] = []
  if (isQuiz) {
    quizQuestions = asArray(quizObj.questions).map((rawQuestion) => {
      const q = asRecord(rawQuestion)
      const options = asArray(q.options)
      const correctIds = options
        .map(asRecord)
        .filter((o) => o.is_correct)
        .map((o) => String(o.id))
      return {
        id: String(q.id ?? newSecureId('q')),
        text: String(q.question_text ?? q.text ?? ''),
        options: options.map((rawOption) => {
          const o = asRecord(rawOption)
          return { id: String(o.id ?? newSecureId('o')), text: String(o.option_text ?? o.text ?? '') }
        }),
        correctOptionIds: correctIds.length > 0 ? correctIds : [String(asRecord(options[0]).id ?? '')],
        multiSelect: correctIds.length > 1,
      }
    })
  }

  const timer = quizObj.timer_minutes ?? rec.quiz_timer_minutes

  return {
    nodeId: full.id,
    state: {
      moduleId,
      nodeId: full.id,
      nodeType: editNodeType(isTask, isQuiz),
      title: pick('title'),
      description: pick('description', 'content_text', 'learning_material_content_text'),
      contentType,
      originalContentType: contentType,
      contentUrl: pick('content_url', 'learning_material_content_url') || info.effectiveUrl || '',
      contentFile: null,
      focusAreas: pick('focus_areas', 'focus_area'),
      quickOutline: pick('quick_outline', 'outline'),
      taskTitle: String(taskObj.title ?? rec.task_title ?? full.title ?? ''),
      taskDescription: String(taskObj.description ?? rec.task_description ?? ''),
      taskAttachmentUrl: String(taskObj.attachment ?? rec.task_attachment ?? ''),
      taskAllowLink: Boolean(taskObj.allow_link ?? rec.task_allow_link),
      taskAllowParagraph: Boolean(taskObj.allow_paragraph ?? rec.task_allow_paragraph),
      taskAllowPdf: Boolean(taskObj.allow_pdf ?? rec.task_allow_pdf),
      taskAllowScreenshot: Boolean(taskObj.allow_screenshot ?? rec.task_allow_screenshot),
      taskAllowCodeBlock: Boolean(taskObj.allow_code_block ?? rec.task_allow_code_block),
      taskAllowFile: Boolean(taskObj.allow_file ?? rec.task_allow_file),
      quizName: String(quizObj.name ?? rec.quiz_name ?? full.title ?? ''),
      quizTimerMinutes: timer != null ? Number(timer) : '',
      quizQuestions,
    },
  }
}

export function getResFileAccept(type: ResourceType): string | undefined {
  if (type === 'pdf') return '.pdf'
  if (type === 'video') return 'video/*'
  return undefined
}

export function getSubmitLabel(opts: {
  saving: boolean
  editing: boolean
  addLabel: string
  saveLabel: string
  savingLabel?: string
}): string {
  if (opts.saving) return opts.savingLabel ?? 'Saving…'
  if (opts.editing) return opts.saveLabel
  return opts.addLabel
}

export function normalizeDraftQuestionCorrectOptionIds(q: {
  options: Array<{ id: string }>
  correctOptionIds: string[]
}): string[] {
  if (!q.options.length) return q.correctOptionIds
  const valid = q.correctOptionIds.filter((id) => q.options.some((o) => o.id === id))
  if (valid.length > 0) return valid
  return q.options[0] ? [q.options[0].id] : []
}
