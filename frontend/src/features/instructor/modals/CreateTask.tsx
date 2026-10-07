// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import { addAssessment, getStudents, getCourse } from '../store'
import type { SubmissionFormat, McqOption } from '../store'
import { Plus, Trash2 } from 'lucide-react'
import BackButton from '@/components/ui/BackButton'

const FORMAT_OPTIONS: {
  value: SubmissionFormat
  label: string
  desc: string
}[] = [
  { value: 'text_area', label: 'Text area', desc: 'Plain or rich text response' },
  { value: 'git_link', label: 'Git repo link', desc: 'GitHub/GitLab URL' },
  { value: 'code_block', label: 'Code block', desc: 'Inline code editor' },
  { value: 'mcq', label: 'MCQ with options', desc: 'Multiple choice with selectable options' },
]

export default function CreateTask() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<SubmissionFormat>('text_area')
  const [passmark, setPassmark] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [options, setOptions] = useState<McqOption[]>([
    { id: crypto.randomUUID(), text: '' },
    { id: crypto.randomUUID(), text: '' },
  ])

  const addOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), text: '' }])
  }

  const removeOption = (id: string) => {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  const interns = getStudents()
  const toggleAssign = (id: string) => {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const updateOption = (id: string, text: string, isCorrect?: boolean) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, text, isCorrect: isCorrect ?? o.isCorrect }
          : { ...o, isCorrect: isCorrect === true ? false : o.isCorrect }
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || !title.trim()) return
    if (format === 'mcq' && options.some((o) => !o.text.trim())) return
    if (format === 'mcq' && !options.some((o) => o.isCorrect)) return

    const added = addAssessment(courseId, {
      title: title.trim(),
      description: description.trim(),
      format,
      passmark: passmark ? Number(passmark) : undefined,
      dueDate: dueDate.trim() || undefined,
      assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
      ...(format === 'mcq' && {
        options: options
          .filter((o) => o.text.trim())
          .map((o) => ({ ...o, text: o.text.trim() })),
      }),
    })
    if (added) {
      navigate(`/trainer/courses/${courseId}`)
    }
  }

  const project = courseId ? getCourse(courseId) : undefined

  if (!courseId || !project) {
    return (
      <PageCard title="Project not found">
        <BackButton label="Back to Assigned Courses" onClick={() => navigate('/trainer/courses')} />
      </PageCard>
    )
  }

  return (
    <PageCard title="Create Task">
      <div className="mb-4">
        <BackButton label={`Back to ${project.name}`} onClick={() => navigate(`/trainer/courses/${courseId}`)} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-6xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Assignment 1 or Quiz 1"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instructions for interns..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            How should interns respond?
          </label>
          <div className="space-y-2">
            {FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  format === opt.value
                    ? 'border-brand-teal bg-brand-teal/5 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  checked={format === opt.value}
                  onChange={() => setFormat(opt.value)}
                  className="text-brand-teal"
                />
                <div>
                  <span className="font-medium text-slate-800">{opt.label}</span>
                  <span className="block text-sm text-slate-500">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {format === 'mcq' && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 animate-fade-in">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              MCQ options (mark correct answer)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={!!opt.isCorrect}
                    onChange={() => updateOption(opt.id, opt.text, true)}
                    className="text-brand-green"
                    title="Mark as correct"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    disabled={options.length <= 2}
                    title="Remove option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex items-center gap-2 text-sm text-brand-teal hover:text-brand-green font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add option
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pass mark (optional)
            </label>
            <input
              type="number"
              value={passmark}
              onChange={(e) => setPassmark(e.target.value)}
              placeholder="e.g. 60"
              min={0}
              max={100}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Due date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
            />
          </div>
        </div>

        {interns.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign to interns (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {interns.map((i) => (
                <label
                  key={i.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={assignedTo.includes(i.id)}
                    onChange={() => toggleAssign(i.id)}
                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                  />
                  <span className="text-sm text-slate-700">
                    {i.firstName} {i.lastName}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/trainer/courses/${courseId}`)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 transition-opacity active:scale-[0.99]"
          >
            Create Task
          </button>
        </div>
      </form>
    </PageCard>
  )
}
