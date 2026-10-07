// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ResourceContentField from '@/components/course/ResourceContentField'
import { showToast, withUploadToast } from '@/lib/toastApi'
import {
  type SubmissionFormat,
  type ProgramResource,
  type ProgramTask,
  type ProgramAssessment,
  addProgramAssessment,
  addProgramResource,
  addProgramTask,
  addQuestion,
  getQuestions,
  updateProgramResource,
  updateProgramTask,
} from '../store'
import {
  SUBMISSION_FORMATS,
  getSubmitLabel,
  makeEmptyDraftQuestion,
  newSecureId,
  normalizeDraftQuestionCorrectOptionIds,
  type DraftQuestion,
  type ResourceType,
} from './courseBuilderProgramHelpers'
import { buildQuestionsInputJson } from './courseBuilderHelpers'
import {
  createResourceNode,
  createTaskNode,
  createQuizNode,
  type ItemCreateContext,
} from './curriculumItemApi'

const FIELD_CLASS =
  'w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none'

const EMPTY_RES_FORM = { title: '', url: '', type: 'link' as ResourceType, focusNotes: '', outline: '' }

// ── Resource modal ────────────────────────────────────────────────────────────

export function ResourceModal({
  programId,
  immediateCreate,
  editingResource,
  onClose,
  onSaved,
}: Readonly<{
  programId: string
  immediateCreate?: ItemCreateContext
  editingResource: ProgramResource | null
  onClose: () => void
  onSaved: () => void
}>) {
  const [form, setForm] = useState(() =>
    editingResource
      ? {
          title: editingResource.title,
          url: editingResource.url,
          type: editingResource.type as ResourceType,
          focusNotes: editingResource.focusNotes ?? '',
          outline: editingResource.outline ?? '',
        }
      : EMPTY_RES_FORM,
  )
  const [saving, setSaving] = useState(false)

  const submitLabel = getSubmitLabel({ saving, editing: !!editingResource, addLabel: 'Add', saveLabel: 'Save' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      showToast('Title is required.', 'warning')
      return
    }
    if (!form.url.trim()) {
      showToast('URL is required.', 'warning')
      return
    }

    const common = {
      title: form.title.trim(),
      type: form.type,
      focusNotes: form.focusNotes.trim() || undefined,
      outline: form.outline.trim() || undefined,
    }

    // API-backed course: create the node on the server right away.
    if (immediateCreate && !editingResource) {
      setSaving(true)
      try {
        await createResourceNode(immediateCreate, { ...common, url: form.url.trim() })
        showToast('Resource added.', 'success')
        onClose()
        onSaved()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to add resource.', 'error')
      } finally {
        setSaving(false)
      }
      return
    }

    if (editingResource) {
      updateProgramResource(editingResource.id, { ...common, url: form.url.trim() })
      showToast('Resource updated.', 'success')
    } else {
      addProgramResource({ programId, ...common, url: form.url.trim() })
      showToast('Resource added.', 'success')
    }
    onClose()
    onSaved()
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4">{editingResource ? 'Edit Resource' : 'Add Resource'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id={`res-title-${programId}`}
          label="Title"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <ResourceContentField
          idPrefix={`res-${programId}`}
          type={form.type}
          onTypeChange={(v) => setForm((p) => ({ ...p, type: v, url: '' }))}
          url={form.url}
          onUrlChange={(url) => setForm((p) => ({ ...p, url }))}
          required={!editingResource}
        />
        <div>
          <label htmlFor={`res-focus-${programId}`} className="block text-sm font-medium text-slate-700 mb-1">
            What should learners focus on?
          </label>
          <textarea
            id={`res-focus-${programId}`}
            value={form.focusNotes}
            onChange={(e) => setForm((p) => ({ ...p, focusNotes: e.target.value }))}
            className={`${FIELD_CLASS} min-h-[72px] text-sm`}
            placeholder="Example: Watch only chapters 1–5. Focus on variables and basic troubleshooting."
          />
        </div>
        <Input
          id={`res-outline-${programId}`}
          label="Quick outline (optional)"
          value={form.outline}
          onChange={(e) => setForm((p) => ({ ...p, outline: e.target.value }))}
          className="text-sm"
          placeholder="Example: What is JavaScript? · Overview · Troubleshooting · Variables"
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Task modal ────────────────────────────────────────────────────────────────

const EMPTY_TASK_FORM = {
  title: '',
  description: '',
  formats: [] as SubmissionFormat[],
  attachment: null as File | null,
}

export function TaskModal({
  programId,
  immediateCreate,
  editingTask,
  onClose,
  onSaved,
}: Readonly<{
  programId: string
  immediateCreate?: ItemCreateContext
  editingTask: ProgramTask | null
  onClose: () => void
  onSaved: () => void
}>) {
  const [form, setForm] = useState(() =>
    editingTask
      ? {
          title: editingTask.title,
          description: editingTask.description ?? '',
          formats: editingTask.requiredSubmissionFormats ?? [],
          attachment: editingTask.attachment ?? null,
        }
      : EMPTY_TASK_FORM,
  )
  const attachmentRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  const toggleFormat = (id: SubmissionFormat) => {
    setForm((p) => ({
      ...p,
      formats: p.formats.includes(id) ? p.formats.filter((x) => x !== id) : [...p.formats, id],
    }))
  }

  const submitLabel = getSubmitLabel({ saving, editing: !!editingTask, addLabel: 'Add', saveLabel: 'Save' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || form.formats.length === 0) {
      showToast('Title and at least one format are required.', 'warning')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      attachment: form.attachment ?? null,
      requiredSubmissionFormats: form.formats,
    }

    // API-backed course: create the node on the server right away.
    if (immediateCreate && !editingTask) {
      const create = () =>
        createTaskNode(immediateCreate, {
          title: payload.title,
          description: payload.description,
          attachment: payload.attachment,
          formats: payload.requiredSubmissionFormats,
        })
      if (payload.attachment) {
        // Uploads can be slow — close the modal right away and let the toast
        // track progress in the background so the user can keep working.
        onClose()
        withUploadToast('attachment', create, { successMessage: 'Task added.' })
          .then(() => onSaved())
          .catch(() => {})
        return
      }
      setSaving(true)
      try {
        await create()
        showToast('Task added.', 'success')
        onClose()
        onSaved()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to add task.', 'error')
      } finally {
        setSaving(false)
      }
      return
    }

    if (editingTask) {
      updateProgramTask(editingTask.id, payload)
      showToast('Task updated.', 'success')
    } else {
      addProgramTask({ programId, ...payload })
      showToast('Task added.', 'success')
    }
    onClose()
    onSaved()
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4">{editingTask ? 'Edit Task' : 'Add Task'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id={`task-title-${programId}`}
          label="Title"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        />
        <div>
          <label htmlFor={`task-desc-${programId}`} className="block text-sm font-medium text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id={`task-desc-${programId}`}
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Instructions or details for students…"
            className={`${FIELD_CLASS} resize-none text-sm`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Attachment <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            ref={attachmentRef}
            type="file"
            className="hidden"
            onChange={(e) => setForm((p) => ({ ...p, attachment: e.target.files?.[0] ?? null }))}
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => attachmentRef.current?.click()}>
              {form.attachment ? 'Change file' : 'Choose file'}
            </Button>
            {form.attachment && (
              <span className="text-xs text-slate-500 truncate max-w-[180px]">{form.attachment.name}</span>
            )}
          </div>
        </div>
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-2" id={`task-formats-${programId}`}>
            Submission formats
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SUBMISSION_FORMATS.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-xs p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={form.formats.includes(f.id)}
                  onChange={() => toggleFormat(f.id)}
                  className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Quiz drawer ───────────────────────────────────────────────────────────────

/** Locks page scroll (body + every <main>) while the full-screen drawer is open. */
function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prevBody = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const mains = Array.from(document.querySelectorAll<HTMLElement>('main'))
    const prevMains = mains.map((m) => m.style.overflow)
    mains.forEach((m) => {
      m.style.overflow = 'hidden'
    })
    return () => {
      document.body.style.overflow = prevBody
      mains.forEach((m, i) => {
        m.style.overflow = prevMains[i] ?? ''
      })
    }
  }, [active])
}

function QuizQuestionEditor({
  question,
  index,
  canRemove,
  onChange,
  onRemove,
}: Readonly<{
  question: DraftQuestion
  index: number
  canRemove: boolean
  onChange: (patch: Partial<DraftQuestion>) => void
  onRemove: () => void
}>) {
  const setOptionText = (optionIndex: number, text: string) => {
    const next = question.options.slice()
    next[optionIndex] = { ...next[optionIndex], text }
    onChange({ options: next })
  }

  const removeOption = (optionIndex: number) => {
    const next = question.options.slice()
    const removedId = question.options[optionIndex].id
    next.splice(optionIndex, 1)
    const validIds = question.correctOptionIds.filter((id) => id !== removedId && next.some((o) => o.id === id))
    onChange({ options: next, correctOptionIds: validIds.length > 0 ? validIds : next[0] ? [next[0].id] : [] })
  }

  const toggleCorrect = (optionId: string) => {
    if (!question.multiSelect) {
      onChange({ correctOptionIds: [optionId] })
      return
    }
    const next = question.correctOptionIds.includes(optionId)
      ? question.correctOptionIds.filter((id) => id !== optionId)
      : [...question.correctOptionIds, optionId]
    onChange({ correctOptionIds: next })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-slate-800">Question {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="secondary" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor={`dq-text-${question.id}`} className="block text-sm font-medium text-slate-700 mb-1">
            Question
          </label>
          <textarea
            id={`dq-text-${question.id}`}
            value={question.text}
            onChange={(e) => onChange({ text: e.target.value })}
            className={`${FIELD_CLASS} min-h-[72px] text-sm`}
            placeholder="Enter the question text"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700" id={`dq-options-${question.id}`}>
              Options {question.multiSelect ? '(check all correct answers)' : '(select correct answer)'}
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={question.multiSelect}
                onChange={() =>
                  onChange({ multiSelect: !question.multiSelect, correctOptionIds: question.correctOptionIds.slice(0, 1) })
                }
                className="text-brand-teal focus:ring-brand-teal rounded"
              />
              <span className="text-xs text-slate-500 font-medium">Multiple correct</span>
            </label>
          </div>
          <div className="space-y-2">
            {question.options.map((opt, idx) => (
              <label
                key={opt.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <input
                  type={question.multiSelect ? 'checkbox' : 'radio'}
                  name={`correct-${question.id}`}
                  checked={question.correctOptionIds.includes(opt.id)}
                  onChange={() => toggleCorrect(opt.id)}
                  aria-labelledby={`dq-options-${question.id}`}
                  className="text-brand-teal focus:ring-brand-teal"
                />
                <input
                  value={opt.text}
                  onChange={(e) => setOptionText(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
                  placeholder={`Option ${idx + 1}`}
                />
                {question.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                )}
              </label>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onChange({ options: [...question.options, { id: newSecureId('opt'), text: '' }] })}
            >
              + Add option
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A fresh draft question with its (empty) correct-answer selection normalized. */
function initialDraftQuestions(): DraftQuestion[] {
  const q = makeEmptyDraftQuestion()
  return [{ ...q, correctOptionIds: normalizeDraftQuestionCorrectOptionIds(q) }]
}

export function QuizDrawer({
  programId,
  immediateCreate,
  editingAssessment,
  onClose,
  onSaved,
}: Readonly<{
  programId: string
  immediateCreate?: ItemCreateContext
  editingAssessment: ProgramAssessment | null
  onClose: () => void
  onSaved: () => void
}>) {
  const [quizId, setQuizId] = useState<string | null>(editingAssessment?.id ?? null)
  const [name, setName] = useState(editingAssessment?.name ?? '')
  const [timerMinutes, setTimerMinutes] = useState<number | ''>(editingAssessment?.durationMinutes ?? '')
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>(initialDraftQuestions)
  const [saving, setSaving] = useState(false)

  useLockBodyScroll(true)

  const updateDraft = (id: string, patch: Partial<DraftQuestion>) => {
    setDraftQuestions((p) => p.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeDraft = (id: string) => {
    setDraftQuestions((p) => (p.length <= 1 ? p : p.filter((q) => q.id !== id)))
  }

  const resetDraftQuestions = () => setDraftQuestions([makeEmptyDraftQuestion()])

  const createQuizAssessment = (): ProgramAssessment =>
    addProgramAssessment({
      programId,
      name: name.trim(),
      type: 'mcq',
      durationMinutes: timerMinutes !== '' ? Number(timerMinutes) : undefined,
      mandatory: true,
      requiredSubmissionFormats: [],
      status: 'draft',
    })

  const addQuestionsFromDraft = (targetQuizId: string) => {
    draftQuestions.forEach((dq) => {
      const filled = dq.options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text.length > 0)
      const options = filled.map((o, i) => ({
        id: `opt-${i + 1}`,
        text: o.text,
        isCorrect: dq.correctOptionIds.includes(o.id),
      }))
      if (options.length > 0 && !options.some((o) => o.isCorrect)) options[0].isCorrect = true
      addQuestion({ quizId: targetQuizId, text: dq.text.trim(), type: 'mcq', options, allowMultipleCorrect: dq.multiSelect })
    })
  }

  /** Serialize the drafted questions into the node `questions_input` JSON. */
  const buildDraftQuestionsInput = (): string =>
    buildQuestionsInputJson(
      draftQuestions.map((dq) => {
        const filled = dq.options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text.length > 0)
        return {
          text: dq.text.trim(),
          options: filled.map((o) => o.text),
          correctIndices: filled.flatMap((o, i) => (dq.correctOptionIds.includes(o.id) ? [i] : [])),
          multiSelect: dq.multiSelect,
        }
      }),
    )

  const handleSaveQuiz = async () => {
    const invalidIdx = draftQuestions.findIndex((dq) => {
      const filled = dq.options.map((o) => o.text.trim()).filter(Boolean)
      return !dq.text.trim() || filled.length < 2
    })
    if (invalidIdx >= 0) {
      showToast(`Question ${invalidIdx + 1}: add question text and at least two options.`, 'warning')
      return
    }
    const noAnswerIdx = draftQuestions.findIndex((dq) => {
      const filled = dq.options.filter((o) => o.text.trim())
      return !filled.some((o) => dq.correctOptionIds.includes(o.id))
    })
    if (noAnswerIdx >= 0) {
      showToast(`Question ${noAnswerIdx + 1}: select at least one correct answer.`, 'warning')
      return
    }
    if (!name.trim()) {
      showToast('Quiz name is required.', 'warning')
      return
    }

    // API-backed course: create the quiz node on the server right away.
    if (immediateCreate) {
      setSaving(true)
      try {
        await createQuizNode(immediateCreate, {
          name: name.trim(),
          timerMinutes: timerMinutes === '' ? undefined : Number(timerMinutes),
          allowMultipleCorrect: draftQuestions.some((dq) => dq.multiSelect),
          questionsInputJson: buildDraftQuestionsInput(),
        })
        showToast('Quiz added.', 'success')
        onClose()
        onSaved()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to add quiz.', 'error')
      } finally {
        setSaving(false)
      }
      return
    }

    // Purely-local course: keep the quiz in the local store.
    const asm = createQuizAssessment()
    setQuizId(asm.id)
    addQuestionsFromDraft(asm.id)
    resetDraftQuestions()
    onSaved()
    showToast('Quiz saved with questions.', 'success')
  }

  const savedQuestions = quizId ? getQuestions(quizId) : []

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto" role="dialog" aria-modal="true">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{quizId ? 'Edit Quiz' : 'Add Quiz'}</h2>
            <p className="text-sm text-slate-500 mt-1">Create MCQ questions for this quiz.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
            <div>
              <label htmlFor={`quiz-name-${programId}`} className="block text-sm font-medium text-slate-700 mb-1">
                Quiz name
              </label>
              <input
                id={`quiz-name-${programId}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD_CLASS}
                placeholder="e.g. JS Basics Quiz"
              />
              {!quizId && (
                <p className="text-[11px] text-slate-500 mt-1">
                  After you click <span className="font-semibold">Create quiz</span>, you can add questions below.
                </p>
              )}
            </div>
            <div className="w-28">
              <label htmlFor={`quiz-timer-${programId}`} className="block text-sm font-medium text-slate-700 mb-1">
                Timer (min)
              </label>
              <input
                id={`quiz-timer-${programId}`}
                type="number"
                min={1}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
                placeholder="e.g. 30"
              />
            </div>
          </div>

          {quizId && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800">Questions</p>
              <p className="text-xs text-slate-500 mt-0.5">{savedQuestions.length} added</p>

              {savedQuestions.length === 0 ? (
                <p className="text-xs text-slate-500 mt-3">No questions yet. Add the first one below.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {savedQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 rounded-xl bg-white border border-slate-200">
                      <p className="text-xs font-bold text-slate-500">Q{idx + 1}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{q.text}</p>
                      {q.options?.length ? (
                        <ul className="mt-2 space-y-1">
                          {q.options.map((o) => (
                            <li
                              key={o.id}
                              className={`text-xs ${o.isCorrect ? 'text-emerald-700 font-semibold' : 'text-slate-600'}`}
                            >
                              {o.isCorrect ? '✓ ' : ''}
                              {o.text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {draftQuestions.map((dq, qIdx) => (
              <QuizQuestionEditor
                key={dq.id}
                question={dq}
                index={qIdx}
                canRemove={draftQuestions.length > 1}
                onChange={(patch) => updateDraft(dq.id, patch)}
                onRemove={() => removeDraft(dq.id)}
              />
            ))}

            <div className="flex gap-3">
              <Button type="button" fullWidth onClick={() => setDraftQuestions((p) => [...p, makeEmptyDraftQuestion()])}>
                Add another question
              </Button>
              <Button type="button" variant="secondary" onClick={resetDraftQuestions}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <Button type="button" fullWidth loading={saving} disabled={!!quizId} onClick={handleSaveQuiz}>
            {getSubmitLabel({ saving, editing: !!quizId, addLabel: 'Create quiz', saveLabel: 'Quiz created' })}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
