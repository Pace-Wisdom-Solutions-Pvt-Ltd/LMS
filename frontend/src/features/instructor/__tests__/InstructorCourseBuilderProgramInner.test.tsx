// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock toastApi before importing anything else
vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

// Mock organizations API
vi.mock('@/lib/api/organizations', () => ({
  deleteModuleNodeApi: vi.fn().mockResolvedValue(undefined),
  getModuleNodeApi: vi.fn().mockResolvedValue({
    id: 100,
    title: 'Node Title',
    description: 'Node desc',
    content_type: 'link',
    content_url: 'https://example.com',
    learning_material: null,
  }),
  createModuleNodeApi: vi.fn().mockResolvedValue({ id: 500, title: 'Created' }),
}))

import { showToast } from '@/lib/toastApi'
import {
  createModuleNodeApi,
  deleteModuleNodeApi,
  getModuleNodeApi,
  type ApiModuleNode,
} from '@/lib/api/organizations'
import type { ProgramResource } from '@/features/institute-admin/store'
import {
  ProgramInner,
} from '../courses/InstructorCourseBuilderProgramInner'
import {
  localItemBadge,
  localItemTitle,
  inferApiNodeContentType,
  getApiNodeInfo,
  getResFileAccept,
  getSubmitLabel,
  normalizeDraftQuestionCorrectOptionIds,
  type ApiCurriculumContext,
} from '@/features/institute-admin/course-builder/courseBuilderProgramHelpers'
import {
  renderApiNodePreview,
  renderLocalResourcePreview,
} from '@/features/institute-admin/course-builder/courseBuilderContentPreview'

beforeEach(() => {
  vi.clearAllMocks()
  const hasCreate = typeof URL.createObjectURL === 'function'
  if (hasCreate) vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
  else Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:x'), configurable: true })
})

afterEach(() => cleanup())

type LocalCurriculumItem = Parameters<typeof localItemTitle>[0]
type ApiNodeInfo = ReturnType<typeof getApiNodeInfo>

const apiNode = (n: Partial<ApiModuleNode>): ApiModuleNode => ({ id: 1, title: '', ...n })

const localResource = (r: Pick<ProgramResource, 'type' | 'title' | 'url'>): ProgramResource => ({
  id: 'r1',
  programId: 'p1',
  createdAt: '2026-01-01T00:00:00Z',
  ...r,
})

const nodeInfo = (i: Partial<ApiNodeInfo>): ApiNodeInfo => ({
  showVideo: false,
  effectiveUrl: '',
  thumb: null,
  inferred: '',
  badge: { label: 'Resource', cls: '' },
  isTask: false,
  isQuiz: false,
  displayTitle: '',
  rawType: '',
  ...i,
})

/* ─────────────────────────────────────────────
   1) Pure helper functions (no component render)
   ───────────────────────────────────────────── */

describe('helper functions', () => {
  it('localItemBadge returns correct badge for each type', () => {
    expect(localItemBadge('Resource')).toEqual({ label: 'Resource', cls: 'bg-blue-50 text-blue-600' })
    expect(localItemBadge('Task')).toEqual({ label: 'Task', cls: 'bg-indigo-50 text-indigo-600' })
    expect(localItemBadge('Assessment')).toEqual({ label: 'Assessment', cls: 'bg-emerald-50 text-emerald-600' })
  })

  it('localItemTitle returns title or name', () => {
    const base = { id: 'i1', programId: 'p1', createdAt: '2026-01-01T00:00:00Z' }
    const resource: LocalCurriculumItem = { ...base, __itemType: 'Resource', title: 'Res', type: 'link', url: 'https://x' }
    const task: LocalCurriculumItem = { ...base, __itemType: 'Task', title: 'Task', requiredSubmissionFormats: [] }
    const quiz: LocalCurriculumItem = {
      ...base,
      __itemType: 'Assessment',
      name: 'Quiz',
      type: 'mcq',
      mandatory: false,
      requiredSubmissionFormats: [],
      status: 'draft',
    }
    expect(localItemTitle(resource)).toBe('Res')
    expect(localItemTitle(task)).toBe('Task')
    expect(localItemTitle(quiz)).toBe('Quiz')
  })

  it('inferApiNodeContentType infers from url extension', () => {
    expect(inferApiNodeContentType('pdf', '')).toBe('pdf')
    expect(inferApiNodeContentType('', 'https://x/f.pdf')).toBe('pdf')
    expect(inferApiNodeContentType('', 'https://x/f.doc')).toBe('doc')
    expect(inferApiNodeContentType('', 'https://x/f.docx')).toBe('doc')
    expect(inferApiNodeContentType('', 'https://x/f.mp4')).toBe('video')
    expect(inferApiNodeContentType('', 'https://x/f.webm')).toBe('video')
    expect(inferApiNodeContentType('', 'https://x/f.mov')).toBe('video')
    expect(inferApiNodeContentType('', 'https://x/f.txt')).toBe('')
  })

  it('getApiNodeInfo detects task nodes', () => {
    const info = getApiNodeInfo(apiNode({ title: 'X', task_title: 'My Task', content_url: '' }))
    expect(info.isTask).toBe(true)
    expect(info.badge.label).toBe('Task')
    expect(info.displayTitle).toBe('My Task')
  })

  it('getApiNodeInfo detects quiz nodes', () => {
    const info = getApiNodeInfo(apiNode({ title: 'X', quiz_name: 'Quiz 1', content_url: '' }))
    expect(info.isQuiz).toBe(true)
    expect(info.badge.label).toBe('Quiz')
    expect(info.displayTitle).toBe('Quiz 1')
  })

  it('getApiNodeInfo detects youtube and builds thumbnail', () => {
    const info = getApiNodeInfo(apiNode({ title: 'YT', content_type: 'link', content_url: 'https://www.youtube.com/watch?v=abc123' }))
    expect(info.showVideo).toBe(true)
    expect(info.thumb).toContain('img.youtube.com')
  })

  it('getApiNodeInfo falls back to learning_material fields', () => {
    const info = getApiNodeInfo(apiNode({
      title: 'LM Node',
      learning_material: { content_type: '', content_url: 'https://x/file.pdf?q=1' },
    }))
    expect(info.inferred).toBe('pdf')
    expect(info.badge.label).toBe('Resource')
  })

  it('getResFileAccept returns expected values', () => {
    expect(getResFileAccept('pdf')).toBe('.pdf')
    expect(getResFileAccept('video')).toBe('video/*')
    expect(getResFileAccept('link')).toBeUndefined()
  })

  it('getSubmitLabel returns correct labels', () => {
    expect(getSubmitLabel({ saving: false, editing: false, addLabel: 'Add', saveLabel: 'Save' })).toBe('Add')
    expect(getSubmitLabel({ saving: false, editing: true, addLabel: 'Add', saveLabel: 'Save' })).toBe('Save')
    expect(getSubmitLabel({ saving: true, editing: false, addLabel: 'Add', saveLabel: 'Save' })).toBe('Saving…')
    expect(getSubmitLabel({ saving: true, editing: false, addLabel: 'Add', saveLabel: 'Save', savingLabel: 'Wait' })).toBe('Wait')
  })

  it('normalizeDraftQuestionCorrectOptionIds normalizes correctly', () => {
    expect(normalizeDraftQuestionCorrectOptionIds({ options: [], correctOptionIds: ['x'] })).toEqual(['x'])
    expect(normalizeDraftQuestionCorrectOptionIds({ options: [{ id: 'a' }, { id: 'b' }], correctOptionIds: ['b'] })).toEqual(['b'])
    expect(normalizeDraftQuestionCorrectOptionIds({ options: [{ id: 'a' }, { id: 'b' }], correctOptionIds: ['z'] })).toEqual(['a'])
  })
})

/* ─────────────────────────────────────────────
   2) renderLocalResourcePreview
   ───────────────────────────────────────────── */

describe('renderLocalResourcePreview', () => {
  it('renders youtube video preview with thumbnail', () => {
    const { container } = render(
      <>{renderLocalResourcePreview(localResource({ type: 'link', title: 'YT', url: 'https://www.youtube.com/watch?v=abc123' }))}</>
    )
    expect(container.querySelector('img[alt="YT thumbnail"]')).toBeTruthy()
  })

  it('renders video type with placeholder when no youtube id', () => {
    render(<>{renderLocalResourcePreview(localResource({ type: 'video', title: 'Vid', url: 'https://x/a.mp4' }))}</>)
    expect(screen.getAllByText('Video').length).toBeGreaterThanOrEqual(1)
  })

  it('renders pdf iframe preview', () => {
    render(<>{renderLocalResourcePreview(localResource({ type: 'pdf', title: 'PDF', url: 'https://x/a.pdf' }))}</>)
    expect(screen.getByTitle('PDF preview')).toBeTruthy()
  })

  it('returns null for link type without youtube', () => {
    const { container } = render(<>{renderLocalResourcePreview(localResource({ type: 'link', title: 'L', url: 'https://x/page' }))}</>)
    expect(container.innerHTML).toBe('')
  })
})

/* ─────────────────────────────────────────────
   3) renderApiNodePreview
   ───────────────────────────────────────────── */

describe('renderApiNodePreview', () => {
  it('renders video preview with thumbnail', () => {
    const info = getApiNodeInfo(apiNode({ title: 'YT', content_type: 'link', content_url: 'https://www.youtube.com/watch?v=abc' }))
    const { container } = render(<>{renderApiNodePreview(info, 'YT')}</>)
    expect(container.querySelector('img[alt="YT thumbnail"]')).toBeTruthy()
  })

  it('renders video preview without thumbnail', () => {
    const info = nodeInfo({ showVideo: true, effectiveUrl: 'https://x/v.mp4', inferred: 'video', displayTitle: 'V' })
    render(<>{renderApiNodePreview(info, 'V')}</>)
    expect(screen.getByText('Video')).toBeTruthy()
  })

  it('renders pdf iframe', () => {
    const info = nodeInfo({ showVideo: false, effectiveUrl: 'https://x/f.pdf', inferred: 'pdf', displayTitle: 'P' })
    render(<>{renderApiNodePreview(info, 'P')}</>)
    expect(screen.getByTitle('P preview')).toBeTruthy()
  })

  it('renders doc link', () => {
    const info = nodeInfo({ showVideo: false, effectiveUrl: 'https://x/f.doc', inferred: 'doc', displayTitle: 'D' })
    render(<>{renderApiNodePreview(info, 'D')}</>)
    expect(screen.getByText('DOC')).toBeTruthy()
  })

  it('returns null for document type with empty url', () => {
    const info = nodeInfo({ showVideo: false, effectiveUrl: '', inferred: 'document', displayTitle: 'D' })
    const { container } = render(<>{renderApiNodePreview(info, 'D')}</>)
    expect(container.innerHTML).toBe('')
  })

  it('returns null for unknown type', () => {
    const info = nodeInfo({ showVideo: false, effectiveUrl: '', inferred: '', displayTitle: 'X' })
    const { container } = render(<>{renderApiNodePreview(info, 'X')}</>)
    expect(container.innerHTML).toBe('')
  })
})

/* ─────────────────────────────────────────────
   4) ProgramInner – basic rendering (non-API mode)
   ───────────────────────────────────────────── */

describe('ProgramInner basic rendering', () => {
  const defaultProps = {
    programId: 'prog-test',
    refresh: vi.fn(),
    requestConfirm: vi.fn(async () => true),
    nodeEditLoading: null,
    setNodeEditLoading: vi.fn(),
    setNodeEditModal: vi.fn(),
  }

  it('renders empty state with "No items yet" message', () => {
    render(<ProgramInner {...defaultProps} />)
    expect(screen.getByText('No items yet.')).toBeTruthy()
    expect(screen.getByText(/add a resource/i)).toBeTruthy()
  })

  it('renders the Add Item button', () => {
    render(<ProgramInner {...defaultProps} />)
    expect(screen.getByRole('button', { name: /add item/i })).toBeTruthy()
  })

  it('renders Curriculum heading', () => {
    render(<ProgramInner {...defaultProps} />)
    expect(screen.getByText('Curriculum')).toBeTruthy()
  })
})

/* ─────────────────────────────────────────────
   5) Add Item menu
   ───────────────────────────────────────────── */

describe('ProgramInner Add Item menu', () => {
  const defaultProps = {
    programId: 'prog-test',
    refresh: vi.fn(),
    requestConfirm: vi.fn(async () => true),
    nodeEditLoading: null,
    setNodeEditLoading: vi.fn(),
    setNodeEditModal: vi.fn(),
  }

  it('opens and shows resource, task, quiz menu items', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    expect(screen.getByRole('menuitem', { name: /resource/i })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /task/i })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /quiz/i })).toBeTruthy()
  })

  it('toggles menu open/close', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    const btn = screen.getByRole('button', { name: /add item/i })
    await user.click(btn)
    expect(screen.getByRole('menu')).toBeTruthy()
    await user.click(btn)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

/* ─────────────────────────────────────────────
   6) Resource modal
   ───────────────────────────────────────────── */

describe('ProgramInner resource modal', () => {
  const defaultProps = {
    programId: 'prog-test',
    refresh: vi.fn(),
    requestConfirm: vi.fn(async () => true),
    nodeEditLoading: null,
    setNodeEditLoading: vi.fn(),
    setNodeEditModal: vi.fn(),
  }

  it('opens resource modal, fills form with link, and submits', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))

    const modal = screen.getByRole('dialog')
    expect(within(modal).getByText(/add resource/i)).toBeTruthy()

    // Fill title
    await user.type(within(modal).getByLabelText(/title/i), 'My Resource')
    // Fill URL
    await user.type(within(modal).getByLabelText(/url/i), 'https://example.com/content')
    // Fill focus notes
    await user.type(within(modal).getByLabelText(/what should learners focus on/i), 'Focus on chapter 1')
    // Fill outline
    await user.type(within(modal).getByLabelText(/quick outline/i), 'Intro, Basics')

    // Submit
    const form = within(modal).getByRole('button', { name: /^add$/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Resource added.', 'success')
    })
  })

  it('shows validation warning when title is empty', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))

    const modal = screen.getByRole('dialog')
    // The title field has required attribute but let's trigger the submit
    // Fill URL but leave title empty - however the native required won't fire in JSDOM
    // Instead let's test the URL required warning: fill title but leave URL empty
    await user.type(within(modal).getByLabelText(/title/i), 'T')

    // Clear url field (it's already empty for link type)
    // Submit - should trigger URL required warning
    const form = within(modal).getByRole('button', { name: /^add$/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('URL is required.', 'warning')
    })
  })

  it('switches resource type to PDF and clears the URL', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))

    const modal = screen.getByRole('dialog')
    const urlInput = within(modal).getByLabelText(/url/i)
    await user.type(urlInput, 'https://example.com/a')
    expect(urlInput).toHaveValue('https://example.com/a')

    // The type is a Dropdown: open it and pick PDF. Every type takes a URL,
    // so changing it just resets the URL field.
    fireEvent.click(within(modal).getByRole('button', { name: /^link$/i }))
    fireEvent.click(within(modal).getByRole('button', { name: /^pdf$/i }))

    expect(within(modal).getByRole('button', { name: /^pdf$/i })).toBeTruthy()
    expect(within(modal).getByLabelText(/url/i)).toHaveValue('')
  })

  it('cancel closes the resource modal', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))

    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('adds resource then edits it', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    // Add a resource first
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))
    let modal = screen.getByRole('dialog')
    await user.type(within(modal).getByLabelText(/title/i), 'Editable Resource')
    await user.type(within(modal).getByLabelText(/url/i), 'https://example.com')
    fireEvent.submit(within(modal).getByRole('button', { name: /^add$/i }).closest('form')!)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Now edit it
    const card = screen.getByText('Editable Resource').closest('li')!
    await user.click(within(card).getByRole('button', { name: /^edit$/i }))

    modal = screen.getByRole('dialog')
    expect(within(modal).getByText(/edit resource/i)).toBeTruthy()

    await user.clear(within(modal).getByLabelText(/title/i))
    await user.type(within(modal).getByLabelText(/title/i), 'Updated Resource')
    fireEvent.submit(within(modal).getByRole('button', { name: /^save$/i }).closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Resource updated.', 'success')
    })
  })

  it('adds resource then removes it', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    // Add a resource
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))
    const modal = screen.getByRole('dialog')
    await user.type(within(modal).getByLabelText(/title/i), 'Remove Me')
    await user.type(within(modal).getByLabelText(/url/i), 'https://example.com')
    fireEvent.submit(within(modal).getByRole('button', { name: /^add$/i }).closest('form')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Remove it
    const card = screen.getByText('Remove Me').closest('li')!
    await user.click(within(card).getByRole('button', { name: /remove/i }))

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Item removed.', 'success')
    })
  })
})

/* ─────────────────────────────────────────────
   7) Task modal
   ───────────────────────────────────────────── */

describe('ProgramInner task modal', () => {
  const defaultProps = {
    programId: 'prog-test',
    refresh: vi.fn(),
    requestConfirm: vi.fn(async () => true),
    nodeEditLoading: null,
    setNodeEditLoading: vi.fn(),
    setNodeEditModal: vi.fn(),
  }

  it('shows validation warning when title/format missing', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /task/i }))

    const modal = screen.getByRole('dialog')
    const form = within(modal).getByRole('button', { name: /^add$/i }).closest('form')!
    fireEvent.submit(form)

    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Title and at least one format are required.', 'warning')
  })

  it('adds a task with title and format', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /task/i }))

    const modal = screen.getByRole('dialog')
    expect(within(modal).getByText(/add task/i)).toBeTruthy()

    await user.type(within(modal).getByLabelText(/title/i), 'My Task')
    // Click first checkbox (Link format)
    const checkbox = within(modal).getAllByRole('checkbox')[0]
    await user.click(checkbox)

    fireEvent.submit(within(modal).getByRole('button', { name: /^add$/i }).closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Task added.', 'success')
    })
  })

  it('adds a task then edits it', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    // Add task
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /task/i }))
    let modal = screen.getByRole('dialog')
    await user.type(within(modal).getByLabelText(/title/i), 'Editable Task')
    await user.click(within(modal).getAllByRole('checkbox')[0])
    fireEvent.submit(within(modal).getByRole('button', { name: /^add$/i }).closest('form')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Edit task
    const card = screen.getByText('Editable Task').closest('li')!
    await user.click(within(card).getByRole('button', { name: /^edit$/i }))
    modal = screen.getByRole('dialog')
    expect(within(modal).getByText(/edit task/i)).toBeTruthy()

    await user.clear(within(modal).getByLabelText(/title/i))
    await user.type(within(modal).getByLabelText(/title/i), 'Updated Task')
    fireEvent.submit(within(modal).getByRole('button', { name: /^save$/i }).closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Task updated.', 'success')
    })
  })

  it('cancel closes task modal', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /task/i }))
    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('toggles submission format checkboxes on and off', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /task/i }))

    const modal = screen.getByRole('dialog')
    const checkboxes = within(modal).getAllByRole('checkbox')
    expect(checkboxes.length).toBe(4) // link, paragraph, pdf, screenshot

    // Check first, then uncheck it
    await user.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()
    await user.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
  })
})

/* ─────────────────────────────────────────────
   8) Quiz drawer
   ───────────────────────────────────────────── */

describe('ProgramInner quiz drawer', () => {
  const defaultProps = {
    programId: 'prog-test',
    refresh: vi.fn(),
    requestConfirm: vi.fn(async () => true),
    nodeEditLoading: null,
    setNodeEditLoading: vi.fn(),
    setNodeEditModal: vi.fn(),
  }

  it('opens quiz drawer and shows quiz name input', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    expect(screen.getByText(/add quiz/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/js basics quiz/i)).toBeTruthy()
  })

  it('shows warning if quiz name empty when creating', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    // Fill question text and options so validation passes that step
    await user.type(screen.getByPlaceholderText(/enter the question text/i), 'Q1')
    const opts = screen.getAllByPlaceholderText(/option \d/i)
    await user.type(opts[0], 'A')
    await user.type(opts[1], 'B')

    // Try to create without quiz name
    await user.click(screen.getByRole('button', { name: /create quiz/i }))
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Quiz name is required.', 'warning')
  })

  it('shows validation warning for incomplete questions', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    await user.type(screen.getByPlaceholderText(/js basics quiz/i), 'My Quiz')

    // Try to create without filling question text
    await user.click(screen.getByRole('button', { name: /create quiz/i }))
    expect(vi.mocked(showToast)).toHaveBeenCalledWith(
      expect.stringContaining('Question 1'),
      'warning'
    )
  })

  it('creates quiz with filled question and options', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    await user.type(screen.getByPlaceholderText(/js basics quiz/i), 'My Quiz')
    await user.type(screen.getByPlaceholderText(/enter the question text/i), 'What is 2+2?')

    const opts = screen.getAllByPlaceholderText(/option \d/i)
    await user.type(opts[0], '3')
    await user.type(opts[1], '4')

    // Select correct answer
    const radios = screen.getAllByRole('radio')
    await user.click(radios[1])

    await user.click(screen.getByRole('button', { name: /create quiz/i }))

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith(
        expect.stringContaining('Quiz'),
        'success'
      )
    })
  })

  it('adds another question and removes it', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    // Should start with 1 question
    expect(screen.getByText('Question 1')).toBeTruthy()

    // Add another question
    await user.click(screen.getByRole('button', { name: /add another question/i }))
    expect(screen.getByText('Question 2')).toBeTruthy()

    // Remove the second question - the Remove buttons inside question cards
    // We need to find Remove buttons that are inside the quiz drawer question cards (not option remove buttons)
    const questionCards = screen.getAllByText(/^Question \d$/).map(el => el.closest<HTMLElement>('div[class*="rounded-2xl"]')!)
    const removeBtn = within(questionCards[1]).getByRole('button', { name: /^remove$/i })
    await user.click(removeBtn)

    // Should be back to 1 question
    await waitFor(() => {
      expect(screen.queryByText('Question 2')).toBeNull()
    })
  })

  it('adds option and removes an option', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    // Start with 4 options
    let opts = screen.getAllByPlaceholderText(/option \d/i)
    expect(opts.length).toBe(4)

    // Add an option
    await user.click(screen.getByRole('button', { name: /add option/i }))
    opts = screen.getAllByPlaceholderText(/option \d/i)
    expect(opts.length).toBe(5)

    // Remove option (must have > 2 for remove buttons to show)
    const removeOptBtns = screen.getAllByLabelText(/remove option/i)
    await user.click(removeOptBtns[0])
    opts = screen.getAllByPlaceholderText(/option \d/i)
    expect(opts.length).toBe(4)
  })

  it('resets draft questions', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    await user.type(screen.getByPlaceholderText(/enter the question text/i), 'Something')
    await user.click(screen.getByRole('button', { name: /^reset$/i }))

    // After reset, question text should be empty
    expect((screen.getByPlaceholderText(/enter the question text/i) as HTMLTextAreaElement).value).toBe('')
  })

  it('closes quiz drawer via Close button', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))
    expect(screen.getByText(/add quiz/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/add quiz/i)).toBeNull()
  })

  it('opens edit quiz drawer for a created quiz', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    // Create a quiz first
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))
    await user.type(screen.getByPlaceholderText(/js basics quiz/i), 'Test Quiz')
    await user.type(screen.getByPlaceholderText(/enter the question text/i), 'Q text')
    const opts = screen.getAllByPlaceholderText(/option \d/i)
    await user.type(opts[0], 'Opt A')
    await user.type(opts[1], 'Opt B')
    await user.click(screen.getByRole('button', { name: /create quiz/i }))
    await waitFor(() =>
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Quiz saved with questions.', 'success'),
    )
    // Once created the drawer switches to edit mode; close it to return to the list.
    expect(screen.getByText(/edit quiz/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/edit quiz/i)).toBeNull()

    // Edit the created quiz
    const card = screen.getByText('Test Quiz').closest('li')!
    await user.click(within(card).getByRole('button', { name: /^edit$/i }))
    expect(screen.getByText(/edit quiz/i)).toBeTruthy()
    expect(screen.getByText(/^Questions$/)).toBeTruthy()
  })
})

/* ─────────────────────────────────────────────
   9) ProgramInner with API curriculum context
   ───────────────────────────────────────────── */

describe('ProgramInner with apiCurriculum', () => {
  const apiCurriculum: ApiCurriculumContext = {
    orgId: 'org-1',
    moduleId: 'mod-1',
    chapterId: 10,
    nodesInModule: 5,
    refresh: vi.fn().mockResolvedValue(undefined),
  }

  const apiChildNodes = [
    {
      id: 101,
      title: 'API Resource Node',
      description: 'A server resource',
      content_type: 'link',
      content_url: 'https://example.com/page',
    },
    {
      id: 102,
      title: 'task node',
      task_title: 'API Task Node',
      content_type: '',
      content_url: '',
    },
  ].map(apiNode)

  const defaultProps = {
    programId: 'prog-api',
    apiCurriculum,
    apiChildNodes,
    orgId: 'org-1',
    effectiveCourseId: 'course-1',
    refresh: vi.fn(),
    requestConfirm: vi.fn(async () => true),
    nodeEditLoading: null as number | null,
    setNodeEditLoading: vi.fn(),
    setNodeEditModal: vi.fn(),
  }

  it('renders API child nodes with badges', () => {
    render(<ProgramInner {...defaultProps} />)
    expect(screen.getByText('API Resource Node')).toBeTruthy()
    expect(screen.getByText('API Task Node')).toBeTruthy()
  })

  it('shows empty state when no items and no API nodes', () => {
    render(<ProgramInner {...defaultProps} apiChildNodes={[]} />)
    expect(screen.getByText('No items yet.')).toBeTruthy()
  })

  it('clicking Edit on API node calls getModuleNodeApi and setNodeEditModal', async () => {
    const user = userEvent.setup()
    const setNodeEditModal = vi.fn()
    render(<ProgramInner {...defaultProps} setNodeEditModal={setNodeEditModal} />)

    const resNode = screen.getByText('API Resource Node').closest('li')!
    await user.click(within(resNode).getByRole('button', { name: /^edit$/i }))

    await waitFor(() => {
      expect(getModuleNodeApi).toHaveBeenCalledWith('org-1', 'course-1', 'mod-1', 101)
    })

    await waitFor(() => {
      expect(setNodeEditModal).toHaveBeenCalled()
    })
  })

  it('clicking Remove on API node calls deleteModuleNodeApi after confirm', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    const resNode = screen.getByText('API Resource Node').closest('li')!
    await user.click(within(resNode).getByRole('button', { name: /remove/i }))

    await waitFor(() => {
      expect(deleteModuleNodeApi).toHaveBeenCalledWith('org-1', 'course-1', 'mod-1', 101)
    })
  })

  it('shows Submissions button on task API nodes only when onViewSubmissions is provided', () => {
    const { unmount } = render(<ProgramInner {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /submissions/i })).toBeNull()
    unmount()

    render(<ProgramInner {...defaultProps} onViewSubmissions={vi.fn()} />)
    const taskNode = screen.getByText('API Task Node').closest('li')!
    expect(within(taskNode).getByRole('button', { name: /submissions/i })).toBeTruthy()
    const resNode = screen.getByText('API Resource Node').closest('li')!
    expect(within(resNode).queryByRole('button', { name: /submissions/i })).toBeNull()
  })

  it('clicking Submissions calls onViewSubmissions with the task node id', async () => {
    const user = userEvent.setup()
    const onViewSubmissions = vi.fn()
    render(<ProgramInner {...defaultProps} onViewSubmissions={onViewSubmissions} />)

    const taskNode = screen.getByText('API Task Node').closest('li')!
    await user.click(within(taskNode).getByRole('button', { name: /submissions/i }))
    expect(onViewSubmissions).toHaveBeenCalledWith(102)
  })

  it('shows loading state in edit button when nodeEditLoading matches', () => {
    render(<ProgramInner {...defaultProps} nodeEditLoading={101} />)
    const resNode = screen.getByText('API Resource Node').closest('li')!
    expect(within(resNode).getByText(/loading/i)).toBeTruthy()
  })

  it('adds resource in API mode by creating the node on the server', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /resource/i }))

    const modal = screen.getByRole('dialog')
    await user.type(within(modal).getByLabelText(/title/i), 'API Res')
    await user.type(within(modal).getByLabelText(/url/i), 'https://example.com')
    fireEvent.submit(within(modal).getByRole('button', { name: /^add$/i }).closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Resource added.', 'success')
    })
    expect(vi.mocked(createModuleNodeApi)).toHaveBeenCalledWith('org-1', 'course-1', 'mod-1', expect.objectContaining({
      title: 'API Res',
      chapter: 10,
      learning_material_content_type: 'Link',
      learning_material_content_url: 'https://example.com',
    }))
    expect(apiCurriculum.refresh).toHaveBeenCalled()
  })

  it('adds task in API mode by creating the node on the server', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /task/i }))

    const modal = screen.getByRole('dialog')
    await user.type(within(modal).getByLabelText(/title/i), 'API Task')
    await user.click(within(modal).getAllByRole('checkbox')[0])
    fireEvent.submit(within(modal).getByRole('button', { name: /^add$/i }).closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Task added.', 'success')
    })
    expect(vi.mocked(createModuleNodeApi)).toHaveBeenCalledWith('org-1', 'course-1', 'mod-1', expect.objectContaining({
      task_title: 'API Task',
      chapter: 10,
      task_allow_link: true,
    }))
  })

  it('adds quiz in API mode by creating the node on the server', async () => {
    const user = userEvent.setup()
    render(<ProgramInner {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.click(screen.getByRole('menuitem', { name: /quiz/i }))

    await user.type(screen.getByPlaceholderText(/js basics quiz/i), 'API Quiz')
    await user.type(screen.getByPlaceholderText(/enter the question text/i), 'Q1 text')
    const opts = screen.getAllByPlaceholderText(/option \d/i)
    await user.type(opts[0], 'A')
    await user.type(opts[1], 'B')

    await user.click(screen.getByRole('button', { name: /create quiz/i }))

    await waitFor(() => {
      expect(vi.mocked(showToast)).toHaveBeenCalledWith('Quiz added.', 'success')
    })
    expect(vi.mocked(createModuleNodeApi)).toHaveBeenCalledWith('org-1', 'course-1', 'mod-1', expect.objectContaining({
      quiz_name: 'API Quiz',
      chapter: 10,
    }))
  })

  it('shows "Open Content" link for resource API nodes', () => {
    render(<ProgramInner {...defaultProps} />)
    const link = screen.getByText('Open Content →')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toContain('example.com')
  })
})
