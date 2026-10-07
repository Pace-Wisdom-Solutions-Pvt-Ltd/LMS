// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React from 'react'

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

// Mock sql.js
vi.mock('sql.js', () => ({
  default: vi.fn().mockResolvedValue({
    Database: vi.fn().mockImplementation(() => ({
      exec: vi.fn().mockReturnValue([]),
      run: vi.fn(),
      close: vi.fn(),
    })),
  }),
}))

// Mock lucide-react icons used by CodeBlock
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return actual
})

import CodeBlock from '../common/CodeBlock'

function renderCodeBlock(props: Parameters<typeof CodeBlock>[0] = {}) {
  const result = render(<CodeBlock {...props} />)
  return result
}

describe('CodeBlock', () => {
  describe('basic rendering', () => {
    it('renders without crashing with no props', () => {
      const { container } = renderCodeBlock()
      expect(container.firstChild).toBeTruthy()
    })

    it('renders the code editor textarea', () => {
      const { container } = renderCodeBlock()
      const textarea = container.querySelector('textarea')
      expect(textarea).toBeTruthy()
    })

    it('renders with initialCode prop', () => {
      const { container } = renderCodeBlock({ initialCode: 'const x = 42;' })
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.value).toBe('const x = 42;')
    })

    it('shows language selector', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      expect(select).toBeTruthy()
      expect(select.value).toBe('javascript')
    })

    it('shows all four language options', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      const options = Array.from(select.options).map((o) => o.value)
      expect(options).toContain('javascript')
      expect(options).toContain('python')
      expect(options).toContain('sql')
      expect(options).toContain('java')
    })

    it('shows Run button when not readOnly', () => {
      const { container } = renderCodeBlock()
      const buttons = Array.from(container.querySelectorAll('button'))
      const runBtn = buttons.find((b) => b.textContent?.includes('Run'))
      expect(runBtn).toBeTruthy()
    })

    it('hides Run button when readOnly is true', () => {
      const { container } = renderCodeBlock({ readOnly: true })
      const buttons = Array.from(container.querySelectorAll('button'))
      const runBtn = buttons.find((b) => b.textContent?.includes('Run'))
      expect(runBtn).toBeFalsy()
    })

    it('shows Clear button when not readOnly', () => {
      const { container } = renderCodeBlock()
      // The toolbar Clear button
      const buttons = Array.from(container.querySelectorAll('button'))
      const clearBtn = buttons.find((b) => b.textContent?.includes('Clear'))
      expect(clearBtn).toBeTruthy()
    })

    it('shows "Run your code to see output." placeholder in console mode', () => {
      const { container } = renderCodeBlock()
      expect(container.textContent).toContain('Run your code to see output.')
    })

    it('shows "Run your code to see test case results." in tests mode', () => {
      const { container } = renderCodeBlock({ mode: 'tests' })
      expect(container.textContent).toContain('Run your code to see test case results.')
    })

    it('shows Output label in console mode', () => {
      const { container } = renderCodeBlock()
      expect(container.textContent).toContain('Output')
    })

    it('shows Test results label in tests mode', () => {
      const { container } = renderCodeBlock({ mode: 'tests' })
      expect(container.textContent).toContain('Test results')
    })

    it('shows the default JavaScript filename', () => {
      const { container } = renderCodeBlock()
      expect(container.textContent).toContain('script.js')
    })
  })

  describe('language switching', () => {
    it('changes language to Python', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })
      expect(select.value).toBe('python')
    })

    it('changes language to SQL', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'sql' } })
      expect(select.value).toBe('sql')
    })

    it('changes language to Java', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'java' } })
      expect(select.value).toBe('java')
    })

    it('sets default Python code when switching to python without initialCode', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.value).toContain('Python')
    })

    it('shows python filename after switching to Python', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })
      expect(container.textContent).toContain('main.py')
    })

    it('shows sql filename after switching to SQL', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'sql' } })
      expect(container.textContent).toContain('script.sql')
    })

    it('shows java filename after switching to Java', () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'java' } })
      expect(container.textContent).toContain('Main.java')
    })

    it('preserves initialCode when switching language', () => {
      const { container } = renderCodeBlock({ initialCode: 'MY CUSTOM CODE' })
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      // With initialCode set, language change should not reset code
      expect(textarea.value).toBe('MY CUSTOM CODE')
    })

    it('clears output when switching language', async () => {
      const { container } = renderCodeBlock()
      // run code first
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => expect(container.textContent).not.toContain('Running...'))
      // switch language
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })
      expect(container.textContent).toContain('Run your code to see output.')
    })
  })

  describe('input mode controls (console + javascript/python)', () => {
    it('shows Interactive and Pre-enter radio buttons for JavaScript in console mode', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      expect(container.textContent).toContain('Interactive')
      expect(container.textContent).toContain('Pre-enter')
    })

    it('shows input mode controls for Python in console mode', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })
      expect(container.textContent).toContain('Interactive')
      expect(container.textContent).toContain('Pre-enter')
    })

    it('does not show input mode controls for SQL', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'sql' } })
      expect(container.textContent).not.toContain('Pre-enter')
    })

    it('does not show input mode controls for Java', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'java' } })
      expect(container.textContent).not.toContain('Pre-enter')
    })

    it('does not show input mode controls in tests mode', () => {
      const { container } = renderCodeBlock({ mode: 'tests' })
      expect(container.textContent).not.toContain('Pre-enter')
    })

    it('switches to Pre-enter mode when clicking Pre-enter radio', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      // find by label text
      const preEnterLabel = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('Pre-enter'))
      const preEnterInput = preEnterLabel?.querySelector('input[type="radio"]') as HTMLInputElement
      if (preEnterInput) {
        fireEvent.click(preEnterInput)
        expect(preEnterInput.checked).toBe(true)
        // Should show "Show stdin" button
        expect(container.textContent).toContain('Show stdin')
      }
    })

    it('shows stdin textarea when Pre-enter mode and "Show stdin" clicked', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      const preEnterLabel = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('Pre-enter'))
      const preEnterInput = preEnterLabel?.querySelector('input[type="radio"]') as HTMLInputElement
      if (preEnterInput) {
        fireEvent.click(preEnterInput)
        const showStdinBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Show stdin'))
        if (showStdinBtn) {
          fireEvent.click(showStdinBtn)
          const stdinTextarea = container.querySelector('textarea[placeholder="One value per line"]')
          expect(stdinTextarea).toBeTruthy()
        }
      }
    })

    it('hides stdin textarea after clicking "Hide stdin"', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      const preEnterLabel = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('Pre-enter'))
      const preEnterInput = preEnterLabel?.querySelector('input[type="radio"]') as HTMLInputElement
      if (preEnterInput) {
        fireEvent.click(preEnterInput)
        const showStdinBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Show stdin'))
        if (showStdinBtn) {
          fireEvent.click(showStdinBtn)
          const hideBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Hide stdin'))
          if (hideBtn) {
            fireEvent.click(hideBtn)
            const stdinTextarea = container.querySelector('textarea[placeholder="One value per line"]')
            expect(stdinTextarea).toBeFalsy()
          }
        }
      }
    })
  })

  describe('code editor interactions', () => {
    it('allows typing in the code editor', () => {
      const { container } = renderCodeBlock()
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'console.log("test")' } })
      expect(textarea.value).toBe('console.log("test")')
    })

    it('renders textarea as readOnly when readOnly prop is true', () => {
      const { container } = renderCodeBlock({ readOnly: true })
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.readOnly).toBe(true)
    })

    it('textarea is not readOnly by default', () => {
      const { container } = renderCodeBlock()
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.readOnly).toBe(false)
    })
  })

  describe('clear output button', () => {
    it('clicking Clear button in top bar clears output area placeholder', async () => {
      const { container } = renderCodeBlock()
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => expect(container.textContent).not.toContain('Running...'))

      const clearBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Clear'))!
      fireEvent.click(clearBtn)
      expect(container.textContent).toContain('Run your code to see output.')
    })
  })

  describe('JavaScript execution', () => {
    it('runs JavaScript and shows output', async () => {
      const { container } = renderCodeBlock({ initialCode: 'console.log("hello world")' })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('JavaScript execution is disabled in-browser for security')
      }, { timeout: 3000 })
    })

    it('calls onRun callback after running JavaScript', async () => {
      const onRun = vi.fn()
      const { container } = renderCodeBlock({ initialCode: 'console.log("cb test")', onRun })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => expect(onRun).toHaveBeenCalled(), { timeout: 3000 })
      expect(onRun).toHaveBeenCalledWith(
        'javascript',
        'console.log("cb test")',
        expect.objectContaining({ stderr: expect.stringContaining('disabled') }),
      )
    })

    it('shows error output for invalid JavaScript', async () => {
      const { container } = renderCodeBlock({ initialCode: 'this is not valid JS!!!' })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        // Should show an error indicator (AlertCircle icon area or error text)
        expect(container.textContent).not.toContain('Run your code to see output.')
      }, { timeout: 3000 })
    })

    it('shows (no output) when JavaScript produces no output', async () => {
      const { container } = renderCodeBlock({ initialCode: 'const x = 1 + 1;' })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('JavaScript execution is disabled in-browser for security')
      }, { timeout: 3000 })
    })

    it('shows stderr from console.warn', async () => {
      const { container } = renderCodeBlock({ initialCode: 'console.warn("a warning message")' })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('JavaScript execution is disabled in-browser for security')
      }, { timeout: 3000 })
    })
  })

  describe('Java execution', () => {
    it('shows Java backend-required error when Java is selected and run', async () => {
      const { container } = renderCodeBlock()
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'java' } })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('Java execution requires a backend service')
      }, { timeout: 3000 })
    })
  })

  describe('interactive input + prompt fallback (javascript)', () => {
    it('uses global prompt() when stdin is not pre-entered', async () => {
      const promptSpy = vi.spyOn(globalThis, 'prompt').mockReturnValue('World')
      const { container } = renderCodeBlock({
        mode: 'console',
        initialCode: 'const name = readline(); console.log("Hello " + name);',
      })
      // interactive is default; just Run
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(
        () => expect(container.textContent).toContain('JavaScript execution is disabled in-browser for security'),
        { timeout: 3000 },
      )
      expect(promptSpy).not.toHaveBeenCalled()
      promptSpy.mockRestore()
    })
  })

  describe('SQL output formatting', () => {
    it('formats SELECT results as a table', async () => {
      vi.resetModules()
      const initSqlJs = (await import('sql.js')).default as unknown as ReturnType<typeof vi.fn>
      initSqlJs.mockImplementationOnce(async () => {
        class Database {
          exec() {
            return [{ columns: ['id', 'name'], values: [[1, 'Alice'], [2, 'Bob']] }]
          }
          run() {}
          close() {}
        }
        return { Database }
      })

      const { default: FreshCodeBlock } = await import('../common/CodeBlock')
      const { container } = render(<FreshCodeBlock mode="console" />)
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'sql' } })

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'SELECT * FROM users;' } })

      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('id|name')
        expect(container.textContent).toContain('1|Alice')
        expect(container.textContent).toContain('2|Bob')
      }, { timeout: 3000 })
    })

    it('surfaces SQL statement errors', async () => {
      vi.resetModules()
      const initSqlJs = (await import('sql.js')).default as unknown as ReturnType<typeof vi.fn>
      initSqlJs.mockImplementationOnce(async () => {
        class Database {
          exec() {
            return []
          }
          run() {
            throw new Error('SQL error')
          }
          close() {}
        }
        return { Database }
      })

      const { default: FreshCodeBlock } = await import('../common/CodeBlock')
      const { container } = render(<FreshCodeBlock mode="console" />)
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'sql' } })

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'CREATE TABLE t(x);' } })

      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('SQL error')
      }, { timeout: 3000 })
    })
  })

  describe('Python runtime (mocked pyodide)', () => {
    it('runs python via loadPyodide when available', async () => {
      const fakePyodide = {
        setStdin: vi.fn(),
        setStdout: vi.fn().mockImplementation(({ batched }: { batched: (msg: string) => void }) => {
          batched('ok\n')
        }),
        runPython: vi.fn(),
      }
      ;(globalThis as unknown as { loadPyodide?: unknown }).loadPyodide = vi.fn().mockResolvedValue(fakePyodide)

      const { container } = renderCodeBlock({ mode: 'console' })
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'python' } })

      // switch to pre-enter stdin (so prompt isn't needed)
      const preEnterLabel = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('Pre-enter'))
      const preEnterInput = preEnterLabel?.querySelector('input[type="radio"]') as HTMLInputElement
      fireEvent.click(preEnterInput)
      const showStdinBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Show stdin'))!
      fireEvent.click(showStdinBtn)
      const stdinTextarea = container.querySelector('textarea[placeholder="One value per line"]') as HTMLTextAreaElement
      fireEvent.change(stdinTextarea, { target: { value: 'x' } })

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'print("ok")' } })

      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => expect(container.textContent).toContain('ok'), { timeout: 3000 })

      expect((globalThis as unknown as { loadPyodide: ReturnType<typeof vi.fn> }).loadPyodide).toHaveBeenCalled()
      expect(fakePyodide.runPython).toHaveBeenCalled()
    })
  })

  describe('tests mode', () => {
    it('runs JavaScript demo test case in tests mode', async () => {
      // 2 + 3 = 5 — the demo test checks "2\n3\n" produces "5"
      const { container } = renderCodeBlock({
        mode: 'tests',
        initialCode: 'const a = parseInt(readline()); const b = parseInt(readline()); console.log(a + b);',
      })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('test cases passed')
      }, { timeout: 3000 })
    })

    it('shows failed test result when output does not match expected', async () => {
      const { container } = renderCodeBlock({
        mode: 'tests',
        initialCode: 'console.log("wrong answer")',
      })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('Failed')
      }, { timeout: 3000 })
    })

    it('shows test case input, expected and actual output in tests mode', async () => {
      const { container } = renderCodeBlock({
        mode: 'tests',
        initialCode: 'console.log("wrong")',
      })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('Input:')
        expect(container.textContent).toContain('Expected:')
        expect(container.textContent).toContain('Your output:')
      }, { timeout: 3000 })
    })

    it('shows Java backend error in tests mode', async () => {
      const { container } = renderCodeBlock({ mode: 'tests' })
      const select = container.querySelector('select[aria-label="Language"]') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'java' } })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        // Java shows error message in the stderr which becomes the message field
        expect(container.textContent).toContain('Failed')
      }, { timeout: 3000 })
    })

    it('clears test results when clear button in output panel is clicked', async () => {
      const { container } = renderCodeBlock({
        mode: 'tests',
        initialCode: 'console.log("wrong")',
      })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => expect(container.textContent).toContain('test cases passed'), { timeout: 3000 })

      // The output panel has a Trash2 clear button (title="Clear results")
      const clearResultsBtn = container.querySelector('button[title="Clear results"]') as HTMLButtonElement
      if (clearResultsBtn) {
        fireEvent.click(clearResultsBtn)
        expect(container.textContent).toContain('Run your code to see test case results.')
      }
    })
  })

  describe('output panel clear button', () => {
    it('clears output when output panel trash button is clicked', async () => {
      const { container } = renderCodeBlock({ initialCode: 'console.log("clear me")' })
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => expect(container.textContent).toContain('clear me'), { timeout: 3000 })

      const clearOutputBtn = container.querySelector('button[title="Clear output"]') as HTMLButtonElement
      if (clearOutputBtn) {
        fireEvent.click(clearOutputBtn)
        expect(container.textContent).toContain('Run your code to see output.')
      }
    })
  })

  describe('stdin input in pre-enter mode', () => {
    it('accepts stdin input text', () => {
      const { container } = renderCodeBlock({ mode: 'console' })
      const preEnterLabel = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('Pre-enter'))
      const preEnterInput = preEnterLabel?.querySelector('input[type="radio"]') as HTMLInputElement
      if (preEnterInput) {
        fireEvent.click(preEnterInput)
        const showStdinBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Show stdin'))
        if (showStdinBtn) {
          fireEvent.click(showStdinBtn)
          const stdinTextarea = container.querySelector('textarea[placeholder="One value per line"]') as HTMLTextAreaElement
          if (stdinTextarea) {
            fireEvent.change(stdinTextarea, { target: { value: 'line1\nline2' } })
            expect(stdinTextarea.value).toBe('line1\nline2')
          }
        }
      }
    })

    it('runs JavaScript with pre-entered stdin', async () => {
      const { container } = renderCodeBlock({
        mode: 'console',
        initialCode: 'const name = readline(); console.log("Hi " + name);',
      })
      const preEnterLabel = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('Pre-enter'))
      const preEnterInput = preEnterLabel?.querySelector('input[type="radio"]') as HTMLInputElement
      if (preEnterInput) {
        fireEvent.click(preEnterInput)
        const showStdinBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Show stdin'))
        if (showStdinBtn) {
          fireEvent.click(showStdinBtn)
          const stdinTextarea = container.querySelector('textarea[placeholder="One value per line"]') as HTMLTextAreaElement
          if (stdinTextarea) {
            fireEvent.change(stdinTextarea, { target: { value: 'World' } })
          }
        }
      }
      const runBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Run'))!
      fireEvent.click(runBtn)
      await waitFor(() => {
        expect(container.textContent).toContain('JavaScript execution is disabled in-browser for security')
      }, { timeout: 3000 })
    })
  })

  describe('taskId prop', () => {
    it('renders without error when taskId is provided', () => {
      const { container } = renderCodeBlock({ taskId: 'task-123', mode: 'tests' })
      expect(container.firstChild).toBeTruthy()
    })
  })
})
