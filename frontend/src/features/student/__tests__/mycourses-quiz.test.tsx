// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StudentMyCourses from '../courses/MyCourses'
import * as orgApi from '../../../lib/api/organizations'
import type { ApiCourseRoadmap, ApiEnrolledCourse, ApiTaskSubmission } from '../../../lib/api/organizations'
import type { RoadmapNodeData } from '../courses/components/courseMeta'

vi.mock('../../../lib/api/organizations', () => ({
  getMyCoursesApi: vi.fn(),
  getCourseRoadmapApi: vi.fn(),
  completeModuleNodeApi: vi.fn(),
  getTaskSubmissionsApi: vi.fn().mockResolvedValue([]),
  submitTaskApi: vi.fn().mockResolvedValue({}),
  submitQuizApi: vi.fn(),
  getNodeQuizReviewApi: vi.fn().mockResolvedValue([]),
  getStudentNodeDetailApi: vi.fn(),
}))

vi.mock('../../../lib/auth', () => ({
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
}))

vi.mock('../../../lib/toastApi', () => ({
  showToast: vi.fn(),
}))

const course = (overrides: Partial<ApiEnrolledCourse> = {}): ApiEnrolledCourse => ({
  id: 1,
  organization: 1,
  title: 'Test Course',
  description: 'Desc',
  completion_percentage: '0',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
})

const mockCourse: ApiEnrolledCourse[] = [course()]

/**
 * Builds a roadmap from legacy/detail-shaped nodes (content inline), which the
 * UI still supports but `ApiRoadmapNode` (capability flags only) doesn't model.
 */
const asRoadmap = (modules: { id: number; title: string; nodes: RoadmapNodeData[] }[]) =>
  ({ ...mockCourse[0], modules }) as unknown as ApiCourseRoadmap

const singleNodeRoadmap = (node: RoadmapNodeData) =>
  asRoadmap([{ id: 101, title: 'Module 1', nodes: [node] }])

const quizNode: RoadmapNodeData = {
  id: 301,
  title: 'Quiz Node',
  description: 'Test your knowledge',
  is_completed: false,
  quizzes: [
    {
      id: 10,
      name: 'Python Basics Quiz',
      timer_minutes: null,
      questions: [
        {
          id: 1,
          question_text: 'What is Python?',
          options: [
            { id: 11, option_text: 'A snake', is_correct: false },
            { id: 12, option_text: 'A programming language', is_correct: true },
            { id: 13, option_text: 'A fruit', is_correct: false },
          ],
        },
        {
          id: 2,
          question_text: 'What is a variable?',
          options: [
            { id: 21, option_text: 'A storage container', is_correct: true },
            { id: 22, option_text: 'A function', is_correct: false },
          ],
        },
      ],
    },
  ],
}

const taskNode: RoadmapNodeData = {
  id: 401,
  title: 'Task Node',
  description: 'Complete this task',
  is_completed: false,
  task: {
    title: 'Write a Python script',
    allow_link: true,
    allow_paragraph: false,
    allow_pdf: false,
    allow_screenshot: false,
    allow_code_block: false,
    allow_file: false,
  },
}

const taskNodeWithPdf: RoadmapNodeData = {
  id: 402,
  title: 'PDF Task',
  description: 'Upload a PDF',
  is_completed: false,
  task: {
    title: 'Upload your report',
    allow_link: false,
    allow_paragraph: false,
    allow_pdf: true,
    allow_screenshot: false,
    allow_code_block: false,
    allow_file: false,
  },
}

const taskNodeWithCode: RoadmapNodeData = {
  id: 403,
  title: 'Code Task',
  is_completed: false,
  task: {
    title: 'Write code',
    allow_link: false,
    allow_paragraph: false,
    allow_pdf: false,
    allow_screenshot: false,
    allow_code_block: true,
    allow_file: false,
  },
}

const renderRoadmap = () =>
  render(
    <MemoryRouter initialEntries={['/student/my-courses/1']}>
      <Routes>
        <Route path="/student/my-courses/:courseId" element={<StudentMyCourses />} />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  // Quiz questions/options are shuffled with Math.random; pin it so the
  // Fisher-Yates shuffle never swaps and questions keep their original order.
  vi.spyOn(Math, 'random').mockReturnValue(0.999)
  vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourse)
  vi.mocked(orgApi.completeModuleNodeApi).mockResolvedValue(undefined)
  vi.mocked(orgApi.getTaskSubmissionsApi).mockResolvedValue([])
  vi.mocked(orgApi.getNodeQuizReviewApi).mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

type User = ReturnType<typeof userEvent.setup>

/** Opens the quiz node and starts the quiz. */
async function startQuiz(user: User) {
  fireEvent.click(await screen.findByTestId('node-btn'))
  await user.click(await screen.findByRole('button', { name: /^Start$/i }))
  await screen.findByText(/What is Python\?/i)
}

/** Questions are shown one at a time: answer Q1, go Next, answer Q2. */
async function answerAll(user: User) {
  await user.click(screen.getByText(/A programming language/i))
  await user.click(screen.getByRole('button', { name: /^Next$/i }))
  await user.click(await screen.findByText(/A storage container/i))
}

/* ─── Quiz start screen ─── */

describe('Quiz node — start screen', () => {
  beforeEach(() => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(quizNode))
  })

  it('shows quiz ready screen with start button', async () => {
    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    expect(await screen.findByText(/Quiz Ready/i)).toBeDefined()
    expect(screen.getByText(/Start/i)).toBeDefined()
    expect(screen.getByText(/1 quiz/i)).toBeDefined()
  })

  it('shows quiz name and question count', async () => {
    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Ready/i)
    expect(screen.getByText(/2 questions/i)).toBeDefined()
  })

  it('does not show Start button when already completed', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap({ ...quizNode, is_completed: true }))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Completed/i)
    expect(screen.queryByRole('button', { name: /Start/i })).toBeNull()
  })
})

/* ─── Quiz questions flow ─── */

describe('Quiz node — answering questions', () => {
  beforeEach(() => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(quizNode))
    vi.mocked(orgApi.submitQuizApi).mockResolvedValue({
      id: 1,
      quiz: 10,
      score: 2,
      total_questions: 2,
      correct_answers: 2,
      submitted_at: new Date().toISOString(),
      answers: [],
    })
  })

  it('shows questions after clicking Start', async () => {
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)

    expect(screen.getByText(/A programming language/i)).toBeDefined()
    expect(screen.getByText(/Question 1 of 2/i)).toBeDefined()
  })

  it('Submit button is disabled until all questions answered', async () => {
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)

    // Submit lives on the last question
    await user.click(screen.getByRole('button', { name: /^Next$/i }))
    const submitBtn = await screen.findByRole('button', { name: /Submit Quiz/i })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('selecting an option highlights it', async () => {
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)

    const option = screen.getByText(/A programming language/i)
    await user.click(option)

    // Option button should now have selected styling
    expect(option.closest('button')?.className).toContain('border-brand-teal')
    expect(screen.getByText(/1 answered/i)).toBeDefined()
  })

  it('enables Submit after answering all questions', async () => {
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)
    await answerAll(user)

    const submitBtn = screen.getByRole('button', { name: /Submit Quiz/i })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls submitQuizApi with correct payload on submit', async () => {
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)
    await answerAll(user)

    await user.click(screen.getByRole('button', { name: /Submit Quiz/i }))

    await waitFor(() => {
      expect(orgApi.submitQuizApi).toHaveBeenCalledWith(10, expect.arrayContaining([
        expect.objectContaining({ question: 1, selected_option: 12 }),
        expect.objectContaining({ question: 2, selected_option: 21 }),
      ]))
    })
  })

  it('shows result screen after successful submission', async () => {
    const { showToast } = await import('../../../lib/toastApi')
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: /Submit Quiz/i }))

    await waitFor(() => {
      expect(screen.getByText(/Quiz Submitted/i)).toBeDefined()
    })
    expect(screen.getAllByText(/100%/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/2 \/ 2 correct/i)).toBeDefined()
    expect(showToast).toHaveBeenCalledWith('Quiz submitted successfully.', 'success')
    await waitFor(() => expect(orgApi.completeModuleNodeApi).toHaveBeenCalledWith(301))
  })

  it('offers a retake when a must-pass quiz is failed', async () => {
    const { showToast } = await import('../../../lib/toastApi')
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(
      singleNodeRoadmap({
        ...quizNode,
        quizzes: quizNode.quizzes?.map((q) => ({ ...q, must_pass_to_continue: true, pass_percentage: 80 })),
      }),
    )
    vi.mocked(orgApi.submitQuizApi).mockResolvedValue({
      id: 1,
      quiz: 10,
      score: 1,
      total_questions: 2,
      correct_answers: 1,
      submitted_at: new Date().toISOString(),
      answers: [],
    })
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: /Submit Quiz/i }))

    expect(await screen.findByText(/Quiz Not Passed/i)).toBeDefined()
    expect(screen.getByText(/You must score at least 80% to continue/i)).toBeDefined()
    expect(showToast).toHaveBeenCalledWith(
      'You need to pass this quiz before continuing. Please retake it.',
      'warning',
    )
    expect(orgApi.completeModuleNodeApi).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Retake Quiz/i }))
    expect(await screen.findByText(/0 answered/i)).toBeDefined()
  })

  it('shows error toast when submitQuizApi fails', async () => {
    vi.mocked(orgApi.submitQuizApi).mockRejectedValue(new Error('Network error'))
    const { showToast } = await import('../../../lib/toastApi')
    const user = userEvent.setup()
    renderRoadmap()
    await startQuiz(user)
    await answerAll(user)
    await user.click(screen.getByRole('button', { name: /Submit Quiz/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Failed to submit quiz.', 'error')
    })
  })
})

/* ─── Task submission form ─── */

describe('Task node — submission form', () => {
  it('shows link input when allowLink is true', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    expect(await screen.findByText(/Submission link/i)).toBeDefined()
    expect(screen.getByPlaceholderText(/https:\/\/github.com\/\.\.\. or a Drive link/i)).toBeDefined()
  })

  it('shows code textarea when allowCodeBlock is true', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNodeWithCode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    expect(await screen.findByLabelText(/^Code$/)).toBeDefined()
    expect(screen.getByPlaceholderText(/Paste your code here/i)).toBeDefined()
  })

  it('shows PDF file upload when allowPdf is true', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNodeWithPdf))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    expect(await screen.findByText(/Click to upload/i)).toBeDefined()
    expect(screen.getByText(/PDF · up to 10 MB/i)).toBeDefined()
    expect(document.querySelector('input[type="file"][accept=".pdf"]')).not.toBeNull()
  })

  it('submit button is disabled when no payload or file', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Submission link/i)
    const submitBtn = screen.getByRole('button', { name: /Submit for Review/i })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables submit after typing in payload', async () => {
    const user = userEvent.setup()
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    const input = await screen.findByLabelText(/Submission link/i)
    await user.type(input, 'https://github.com/repo')

    const submitBtn = screen.getByRole('button', { name: /Submit for Review/i })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls submitTaskApi with payload on submit', async () => {
    const submission: ApiTaskSubmission = {
      id: 1,
      task: 50,
      student: 'u1',
      payload: '{"link":"https://github.com/my-repo"}',
      submission_file: null,
      status: 'Pending',
      feedback: '',
      awarded_score: null,
      submitted_at: '2026-04-08T12:00:00Z',
      graded_at: null,
    }
    vi.mocked(orgApi.submitTaskApi).mockResolvedValue(submission)
    const user = userEvent.setup()
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    const input = await screen.findByLabelText(/Submission link/i)
    await user.type(input, 'https://github.com/my-repo')

    vi.mocked(orgApi.getTaskSubmissionsApi).mockResolvedValue([submission])
    const submitBtn = screen.getByRole('button', { name: /Submit for Review/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(orgApi.submitTaskApi).toHaveBeenCalledWith(401, {
        payload: JSON.stringify({ link: 'https://github.com/my-repo' }),
        submission_file: null,
      })
    })
    expect(await screen.findByText(/Under Review/i)).toBeDefined()
  })

  it('shows task title in form header', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(taskNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    expect(await screen.findByText(/Write a Python script/i)).toBeDefined()
  })
})

/* ─── Progress percentage calculation ─── */

describe('Progress % computed from completable nodes only', () => {
  it('shows 100% achieved when all completable nodes are done, even with empty modules', async () => {
    vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue(mockCourse)
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Module 1',
        nodes: [
          { id: 201, title: 'Video', learning_material: { content_type: 'video', content_url: 'https://youtube.com/watch?v=abc' }, is_completed: true },
        ],
      },
      { id: 102, title: 'Module 2', nodes: [] },
    ]))

    renderRoadmap()
    // Wait for roadmap data to load (phase header appears), then check progress
    await screen.findByRole('heading', { name: 'Module 1', level: 4 }, { timeout: 3000 })
    await waitFor(() => {
      const label = screen.getByText(/achieved/i)
      expect(label.textContent).toContain('100%')
    })
  })

  it('shows 50% achieved when half of completable nodes are done', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Module 1',
        nodes: [
          { id: 201, title: 'Video 1', learning_material: { content_type: 'video', content_url: 'https://youtube.com/watch?v=abc' }, is_completed: true },
          { id: 202, title: 'Video 2', learning_material: { content_type: 'video', content_url: 'https://youtube.com/watch?v=xyz' }, is_completed: false },
        ],
      },
    ]))

    renderRoadmap()
    await screen.findByRole('heading', { name: 'Module 1', level: 4 }, { timeout: 3000 })
    await waitFor(() => {
      const label = screen.getByText(/achieved/i)
      expect(label.textContent).toContain('50%')
    })
  })

  it('falls back to API percentage when no completable nodes exist', async () => {
    vi.mocked(orgApi.getMyCoursesApi).mockResolvedValue([course({ completion_percentage: '33' })])
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([{ id: 101, title: 'Module 1', nodes: [] }]))

    renderRoadmap()
    await screen.findByRole('heading', { name: 'Module 1', level: 4 }, { timeout: 3000 })
    await waitFor(() => {
      const label = screen.getByText(/achieved/i)
      expect(label.textContent).toContain('33%')
    })
  })
})

/* ─── Mark as Completed button hidden for quiz nodes ─── */

describe('Mark as Completed button hidden for quiz nodes', () => {
  it('does not show Mark as Completed button for quiz nodes', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(quizNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Ready/i)
    expect(screen.queryByText(/MARK AS COMPLETED/i)).toBeNull()
  })

  it('shows Mark as Completed button for video nodes', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Module 1',
        nodes: [{ id: 201, title: 'Video', learning_material: { content_type: 'video', content_url: 'https://youtube.com/watch?v=abc' }, is_completed: false }],
      },
    ]))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    expect(await screen.findByText(/MARK AS COMPLETED/i)).toBeDefined()
  })
})

/* ─── Quiz score display from progress.quiz_score ─── */

describe('Quiz node — quiz_score from roadmap progress', () => {
  it('shows score% when quiz is completed and quiz_score is set', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Module 1',
        nodes: [
          {
            ...quizNode,
            is_completed: true,
            progress: { status: 'Completed', last_accessed: '2026-04-08T12:00:00Z', quiz_score: 75 },
          },
        ],
      },
    ]))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Completed/i)
    expect(screen.getByText('75%')).toBeDefined()
    expect(screen.getByText(/Score:/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Start$/i })).toBeNull()
  })

  it('shows question count (not score) when quiz_score is null', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Module 1',
        nodes: [
          {
            ...quizNode,
            is_completed: true,
            progress: { status: 'Completed', last_accessed: '2026-04-08T12:00:00Z', quiz_score: null },
          },
        ],
      },
    ]))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Completed/i)
    expect(screen.getByText(/2 questions/i)).toBeDefined()
    expect(screen.queryByText(/Your score/i)).toBeNull()
  })

  it('shows score 0% correctly (not treated as falsy null)', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(asRoadmap([
      {
        id: 101,
        title: 'Module 1',
        nodes: [
          {
            ...quizNode,
            is_completed: true,
            progress: { status: 'Completed', last_accessed: '2026-04-08T12:00:00Z', quiz_score: 0 },
          },
        ],
      },
    ]))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Completed/i)
    expect(screen.getByText('0%')).toBeDefined()
    // score label shows "Score: 0%"
    expect(screen.getByText(/Score:/i)).toBeDefined()
  })

  it('lets a passed student review revealed answers', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(
      singleNodeRoadmap({
        ...quizNode,
        is_completed: true,
        progress: { status: 'Completed', last_accessed: '2026-04-08T12:00:00Z', quiz_score: 100 },
      }),
    )
    vi.mocked(orgApi.getNodeQuizReviewApi).mockResolvedValue([
      {
        id: 10,
        name: 'Python Basics Quiz',
        questions: [
          {
            id: 1,
            question_text: 'What is Python?',
            options: [
              { id: 11, option_text: 'A snake', is_correct: false },
              { id: 12, option_text: 'A programming language', is_correct: true },
            ],
            selected_options: [12],
          },
        ],
      },
    ])
    const user = userEvent.setup()
    renderRoadmap()
    fireEvent.click(await screen.findByTestId('node-btn'))

    await user.click(await screen.findByRole('button', { name: /^Review$/i }))
    expect(await screen.findByText(/Answer Review/i)).toBeDefined()
    expect(orgApi.getNodeQuizReviewApi).toHaveBeenCalledWith('1', '1', '101', 301)

    await user.click(screen.getByRole('button', { name: /^Back$/i }))
    expect(await screen.findByText(/Quiz Completed/i)).toBeDefined()
  })

  it('compact layout — Start button appears inline for unstarted quiz', async () => {
    vi.mocked(orgApi.getCourseRoadmapApi).mockResolvedValue(singleNodeRoadmap(quizNode))

    renderRoadmap()
    const nodeBtn = await screen.findByTestId('node-btn')
    fireEvent.click(nodeBtn)

    await screen.findByText(/Quiz Ready/i)
    expect(screen.getByRole('button', { name: /^Start$/i })).toBeDefined()
  })
})
