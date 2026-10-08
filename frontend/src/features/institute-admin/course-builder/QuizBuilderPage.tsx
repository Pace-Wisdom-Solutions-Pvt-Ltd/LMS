// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Trash2, CheckCircle2, Circle } from 'lucide-react'
import { showToast } from '@/lib/toastApi'
import BackButton from '@/components/ui/BackButton'
import {
  addProgramAssessment,
  addQuestion,
  getQuestions,
  getProgramAssessments,
} from '../store'
import { buildQuestionsInputJson } from './courseBuilderHelpers'
import { updateModuleNodeApi } from '@/lib/api/organizations'
import { createQuizNode, type ItemCreateContext } from './curriculumItemApi'
import type { ApiCurriculumContext, NodeEditModalState } from './CourseBuilderProgramInner'

// ── Types ──────────────────────────────────────────────────────────────────

export type QuizQuestion = {
  id: string
  text: string
  options: Array<{ id: string; text: string }>
  correctOptionIds: string[]
  multiSelect: boolean
}

function newId(prefix: string): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return `${prefix}-${c.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function makeEmptyQuestion(): QuizQuestion {
  return {
    id: newId('dq'),
    text: '',
    options: [
      { id: newId('opt'), text: '' },
      { id: newId('opt'), text: '' },
      { id: newId('opt'), text: '' },
      { id: newId('opt'), text: '' },
    ],
    correctOptionIds: [],
    multiSelect: false,
  }
}

/** Convert number|'' to number|undefined for API payloads */
function toOptionalNumber(v: number | ''): number | undefined {
  return v === '' ? undefined : Number(v)
}

export type QuizBuilderPageProps = {
  onClose: () => void
  refresh: () => void | Promise<void>
} & (
  | {
      mode: 'local-add'
      programId: string
      apiCurriculum?: ApiCurriculumContext
      /**
       * When the quiz lives under a real API course/module, bulk upload creates
       * the quiz node on the server first, then attaches the uploaded questions.
       * `chapterId` is the chapter the quiz belongs to. Null/undefined ⇒ no chapter.
       */
      apiIds?: {
        orgId: string
        effectiveCourseId: string | number
        moduleId: string
        chapterId?: number | null
      }
    }
  | {
      mode: 'local-edit'
      programId: string
      editingAssessmentId: string
    }
  | {
      mode: 'api'
      orgId: string
      effectiveCourseId: string | number
      moduleId: string
      nodeId: number
      initialState: Pick<NodeEditModalState, 'quizName' | 'quizTimerMinutes' | 'quizQuestions'>
    }
)

// ── Input / Label styles ───────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm text-slate-700'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

// ── Helpers for removeOption / toggleCorrect ───────────────────────────────

function applyRemoveOption(q: QuizQuestion, optIdx: number): QuizQuestion {
  const removedId = q.options[optIdx].id
  const options = q.options.filter((_, i) => i !== optIdx)
  const correctOptionIds = q.correctOptionIds.filter((id) => id !== removedId)
  return { ...q, options, correctOptionIds }
}

function applyToggleCorrect(q: QuizQuestion, optId: string, multiSelect: boolean): QuizQuestion {
  const curr = q.correctOptionIds
  let next: string[]
  if (multiSelect) {
    next = curr.includes(optId) ? curr.filter((id) => id !== optId) : [...curr, optId]
  } else {
    next = [optId]
  }
  return { ...q, correctOptionIds: next }
}

// ── Build questions payload for API save ───────────────────────────────────

function buildQuestionsPayload(questions: QuizQuestion[]) {
  return questions.map((q) => {
    const correctIndices = q.correctOptionIds
      .map((id) => q.options.findIndex((o) => o.id === id))
      .filter((i) => i >= 0)
    return {
      text: q.text,
      options: q.options.map((o) => o.text),
      correctIndices,
      multiSelect: q.multiSelect ?? false,
    }
  })
}

// ── QuizBuilderPage ────────────────────────────────────────────────────────

export default function QuizBuilderPage(props: QuizBuilderPageProps) {
  const { onClose, refresh } = props

  // ── Derive initial values ─────────────────────────────────────────────
  let initName = ''
  if (props.mode === 'local-edit') {
    initName = getProgramAssessments(props.programId).find((a) => a.id === props.editingAssessmentId)?.name ?? ''
  } else if (props.mode === 'api') {
    initName = props.initialState.quizName
  }

  const initTimer: number | '' = props.mode === 'api' ? props.initialState.quizTimerMinutes : ''
  const initQuestions: QuizQuestion[] = props.mode === 'api' ? props.initialState.quizQuestions : [makeEmptyQuestion()]

  // ── State ─────────────────────────────────────────────────────────────
  const [quizName, setQuizName] = useState(initName)
  const [timerMinutes, setTimerMinutes] = useState<number | ''>(initTimer)
  const [questions, setQuestions] = useState<QuizQuestion[]>(initQuestions)
  const [saving, setSaving] = useState(false)

  // Existing questions on local-edit (read-only list)
  const existingQuestions = props.mode === 'local-edit' ? getQuestions(props.editingAssessmentId) : []

  // ── Question helpers ──────────────────────────────────────────────────
  const updateQuestion = (qId: string, patch: Partial<QuizQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, ...patch } : q)))

  const removeQuestion = (qId: string) =>
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.id !== qId)))

  const updateOptionText = (qId: string, optIdx: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q
        const opts = q.options.slice()
        opts[optIdx] = { ...opts[optIdx], text }
        return { ...q, options: opts }
      }),
    )
  }

  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, options: [...q.options, { id: newId('opt'), text: '' }] } : q,
      ),
    )
  }

  const removeOption = (qId: string, optIdx: number) =>
    setQuestions((prev) => prev.map((q) => (q.id === qId ? applyRemoveOption(q, optIdx) : q)))

  const toggleCorrect = (qId: string, optId: string, multiSelect: boolean) =>
    setQuestions((prev) => prev.map((q) => (q.id === qId ? applyToggleCorrect(q, optId, multiSelect) : q)))

  // ── Validation ────────────────────────────────────────────────────────
  const validateQuestion = (q: QuizQuestion, num: number): string | null => {
    if (!q.text.trim()) return `Question ${num}: question text is required.`
    const filled = q.options.filter((o) => o.text.trim())
    if (filled.length < 2) return `Question ${num}: at least two options are required.`
    if (!filled.some((o) => q.correctOptionIds.includes(o.id))) return `Question ${num}: select at least one correct answer.`
    return null
  }

  const validate = (): boolean => {
    if (!quizName.trim()) { showToast('Quiz name is required.', 'warning'); return false }
    if (props.mode !== 'local-edit' && questions.length === 0) { showToast('Add at least one question.', 'warning'); return false }
    for (const [i, q] of questions.entries()) {
      const err = validateQuestion(q, i + 1)
      if (err) { showToast(err, 'warning'); return false }
    }
    return true
  }

  // ── Per-mode save handlers ────────────────────────────────────────────
  const saveApi = async () => {
    if (props.mode !== 'api') return
    const { orgId, effectiveCourseId, moduleId, nodeId } = props
    await updateModuleNodeApi(orgId, effectiveCourseId, moduleId, nodeId, {
      title: quizName.trim(),
      quiz_name: quizName.trim(),
      quiz_timer_minutes: toOptionalNumber(timerMinutes),
      questions_input: buildQuestionsInputJson(buildQuestionsPayload(questions)),
    })
    refresh()
    showToast('Quiz updated.', 'success')
    onClose()
  }

  /** Create the quiz node on the server immediately (API-backed course). */
  const saveApiAdd = async (apiIds: NonNullable<Extract<QuizBuilderPageProps, { mode: 'local-add' }>['apiIds']>) => {
    const ctx: ItemCreateContext = {
      orgId: apiIds.orgId,
      effectiveCourseId: apiIds.effectiveCourseId,
      moduleId: apiIds.moduleId,
      chapterId: apiIds.chapterId ?? null,
    }
    await createQuizNode(ctx, {
      name: quizName.trim(),
      timerMinutes: toOptionalNumber(timerMinutes),
      allowMultipleCorrect: questions.some((q) => q.multiSelect),
      questionsInputJson: buildQuestionsInputJson(buildQuestionsPayload(questions)),
    })
    await refresh()
    showToast('Quiz added.', 'success')
    onClose()
  }

  const saveLocalAdd = () => {
    if (props.mode !== 'local-add') return
    const { programId } = props
    const asm = addProgramAssessment({
      programId,
      name: quizName.trim(),
      type: 'mcq',
      durationMinutes: toOptionalNumber(timerMinutes),
      mandatory: true,
      requiredSubmissionFormats: [],
      status: 'draft',
    })
    for (const dq of questions) {
      const filled = dq.options.filter((o) => o.text.trim())
      const options = filled.map((o) => ({ id: o.id, text: o.text, isCorrect: dq.correctOptionIds.includes(o.id) }))
      if (options.length > 0 && options.every((o) => !o.isCorrect)) options[0].isCorrect = true
      addQuestion({ quizId: asm.id, text: dq.text, type: 'mcq', options, allowMultipleCorrect: dq.multiSelect })
    }
    refresh()
    showToast('Quiz saved with questions.', 'success')
    onClose()
  }

  const saveLocalEdit = () => {
    if (props.mode !== 'local-edit') return
    const { editingAssessmentId } = props
    for (const dq of questions) {
      const filled = dq.options.filter((o) => o.text.trim())
      const options = filled.map((o) => ({ id: o.id, text: o.text, isCorrect: dq.correctOptionIds.includes(o.id) }))
      if (options.length > 0 && options.every((o) => !o.isCorrect)) options[0].isCorrect = true
      addQuestion({ quizId: editingAssessmentId, text: dq.text, type: 'mcq', options, allowMultipleCorrect: dq.multiSelect })
    }
    refresh()
    showToast('Questions added to quiz.', 'success')
    onClose()
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (props.mode === 'api') { await saveApi(); return }
      if (props.mode === 'local-add') {
        if (props.apiIds) { await saveApiAdd(props.apiIds); return }
        saveLocalAdd()
        return
      }
      saveLocalEdit()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save quiz.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  const isApiMode = props.mode === 'api'
  const title = isApiMode || props.mode === 'local-edit' ? 'Edit Quiz' : 'Add Quiz'
  const subtitle = isApiMode ? 'Edit quiz details and questions.' : 'Fill in quiz details and build your questions.'

  let saveLabel = 'Create Quiz'
  if (saving) saveLabel = 'Saving…'
  else if (isApiMode) saveLabel = 'Save Quiz'

  return (
    <div className="w-full animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <BackButton label="Back to Course" onClick={onClose} />
        <div className="mt-2">
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Quiz metadata card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5">
        {/* Name + Timer in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
          <div>
            <label htmlFor="quiz-name" className={labelCls}>
              Quiz name <span className="text-red-500">*</span>
            </label>
            <input
              id="quiz-name"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="e.g. Python Basics Quiz"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="quiz-timer" className={labelCls}>Timer (min)</label>
            <input
              id="quiz-timer"
              type="number"
              min={1}
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 30"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Existing questions (read-only, local-edit mode) */}
      {props.mode === 'local-edit' && existingQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Existing questions ({existingQuestions.length})
          </p>
          <div className="space-y-3">
            {existingQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Q{idx + 1}</p>
                <p className="text-sm font-semibold text-slate-800">{q.text}</p>
                {q.options?.length ? (
                  <ul className="mt-2 grid grid-cols-2 gap-1.5">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          o.isCorrect
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {o.isCorrect ? '✓ ' : ''}{o.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions builder */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-700">
          {props.mode === 'local-edit' ? 'Add new questions' : 'Questions'}
        </h3>

        {questions.map((q, qi) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4">
            {/* Question header */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Question {qi + 1}
              </span>
              <div className="flex items-center gap-3">
                <label htmlFor={`q-multi-${q.id}`} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    id={`q-multi-${q.id}`}
                    type="checkbox"
                    checked={q.multiSelect}
                    onChange={() =>
                      updateQuestion(q.id, {
                        multiSelect: !q.multiSelect,
                        correctOptionIds: q.correctOptionIds.slice(0, 1),
                      })
                    }
                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                  />
                  <span className="text-xs text-slate-500 font-medium">Multiple correct</span>
                </label>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Question text */}
            <div>
              <label htmlFor={`q-text-${q.id}`} className={labelCls}>Question text</label>
              <textarea
                id={`q-text-${q.id}`}
                value={q.text}
                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                placeholder="Enter the question text…"
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Options</p>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-brand-teal" />
                  {q.multiSelect ? 'Click options to mark all correct answers' : 'Click an option to mark the correct answer'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = q.correctOptionIds.includes(opt.id)
                  const letter = ['A', 'B', 'C', 'D', 'E', 'F'][oi] ?? String(oi + 1)
                  return (
                    <div key={opt.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          isCorrect
                            ? 'border-brand-teal/50 bg-brand-teal/5'
                            : 'border-slate-200 bg-white hover:border-brand-teal/30 hover:bg-slate-50'
                        }`}
                        onClick={() => toggleCorrect(q.id, opt.id, q.multiSelect)}
                        title={isCorrect ? 'Marked as correct' : 'Click to mark as correct'}
                      >
                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-brand-teal text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {letter}
                        </span>
                        <input
                          value={opt.text}
                          onChange={(e) => updateOptionText(q.id, oi, e.target.value)}
                          placeholder={`Option ${letter}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 min-w-0 cursor-text"
                        />
                        {isCorrect
                          ? <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0" />
                          : <Circle className="h-4 w-4 text-slate-200 shrink-0" />
                        }
                      </button>
                      {q.options.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, oi)}
                          className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0 px-0.5"
                          title="Remove option"
                        >
                          ×
                        </button>
                      ) : (
                        <span className="w-5 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => addOption(q.id)}
                className="mt-2 text-xs font-medium text-brand-teal hover:underline"
              >
                + Add option
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setQuestions((p) => [...p, makeEmptyQuestion()])}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-teal/30 text-brand-teal text-sm font-semibold hover:bg-brand-teal/5 hover:border-brand-teal/50 transition-colors"
        >
          + Add question
        </button>
      </div>

      {/* Footer actions */}
      <div className="flex gap-3 pt-2 pb-8">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-2.5 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg hover:shadow-brand-teal/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
