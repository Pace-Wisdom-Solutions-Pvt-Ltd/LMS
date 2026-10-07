// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useRef } from 'react'
import { Play, Loader2, Terminal, AlertCircle, Trash2 } from 'lucide-react'
import initSqlJs from 'sql.js'

export type CodeLanguage = 'javascript' | 'python' | 'sql' | 'java'

export type CodeRunMode = 'console' | 'tests'

const LANGUAGES: { id: CodeLanguage; label: string; fileExt: string; fileName: string }[] = [
  { id: 'javascript', label: 'JavaScript', fileExt: '.js', fileName: 'script.js' },
  { id: 'python', label: 'Python', fileExt: '.py', fileName: 'main.py' },
  { id: 'sql', label: 'SQL', fileExt: '.sql', fileName: 'script.sql' },
  { id: 'java', label: 'Java', fileExt: '.java', fileName: 'Main.java' },
]

const DEFAULT_CODE: Record<CodeLanguage, string> = {
  javascript: `// Write your JavaScript here
// Use readline() - with Interactive mode, a prompt appears when needed
const name = readline();
console.log("Hello,", name);

const nums = [1, 2, 3, 4, 5];
console.log("Sum:", nums.reduce((a, b) => a + b, 0));
`,
  python: `# Write your Python here
# Use input() - with Interactive mode, a prompt appears when needed
name = input("Enter name: ")
print("Hello,", name)

nums = [1, 2, 3, 4, 5]
print("Sum:", sum(nums))
`,
  sql: `-- Write your SQL here
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, score REAL);
INSERT INTO users VALUES (1, 'Alice', 85.5);
INSERT INTO users VALUES (2, 'Bob', 92.0);
INSERT INTO users VALUES (3, 'Carol', 78.5);

SELECT * FROM users;
SELECT name, score FROM users WHERE score >= 80 ORDER BY score DESC;
`,
  java: `// Write your Java here (use class Main)
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : nums) sum += n;
        System.out.println("Sum: " + sum);
        System.out.println("5! = " + factorial(5));
    }
    static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}
`,
}

// --- JavaScript: run in-browser ---
function runJavaScript(code: string, stdinLines: string[] | null): { stdout: string; stderr: string } {
  const base = 'JavaScript execution is disabled in-browser for security. Please run via backend.'
  const hint = stdinLines ? ' (stdin provided)' : ''
  const hasCode = code.trim().length > 0
  return { stdout: hasCode ? '' : '(no output)', stderr: base + hint }
}

// --- Python: Pyodide (load from CDN) ---
let pyodidePromise: Promise<{
  runPython: (code: string) => void
  setStdout: (opts: { batched: (msg: string) => void }) => void
  setStdin: (handler: { stdin: () => string | undefined } | null) => void
}> | null = null

async function getPyodide() {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = (async () => {
    const loadPyodide = (globalThis as unknown as { loadPyodide?: () => Promise<unknown> }).loadPyodide
    if (!loadPyodide) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js'
      script.async = true
      document.head.appendChild(script)
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Pyodide'))
      })
    }
    const pyodide = await (globalThis as unknown as { loadPyodide: (opts?: { indexURL?: string }) => Promise<unknown> }).loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/',
    })
    return pyodide as {
      runPython: (code: string) => void
      setStdout: (opts: { batched: (msg: string) => void }) => void
      setStdin: (handler: { stdin: () => string | undefined } | null) => void
    }
  })()
  return pyodidePromise
}

async function runPython(
  code: string,
  stdinText: string | null
): Promise<{ stdout: string; stderr: string; error?: string }> {
  const out: string[] = []
  const stdinLines = stdinText?.split('\n') ?? []
  let stdinIdx = 0
  try {
    const pyodide = await getPyodide()
    pyodide.setStdin(
      stdinLines.length > 0
        ? {
            stdin: () => (stdinIdx < stdinLines.length ? stdinLines[stdinIdx++] : undefined),
          }
        : null
    )
    pyodide.setStdout({
      batched: (msg) => {
        out.push(msg.endsWith('\n') ? msg : msg + '\n')
      },
    })
    pyodide.runPython(code)
    return { stdout: out.join('').trimEnd(), stderr: '' }
  } catch (e) {
    return { stdout: out.join('').trim(), stderr: e instanceof Error ? e.message : String(e), error: e instanceof Error ? e.message : String(e) }
  }
}

// --- SQL: sql.js ---
let sqlJsPromise: ReturnType<typeof initSqlJs> | null = null

async function getSqlJs() {
  if (sqlJsPromise) return sqlJsPromise
  sqlJsPromise = initSqlJs({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.14.0/dist/${file}`,
  })
  return sqlJsPromise
}

function executeSqlStatements(
  db: InstanceType<(Awaited<ReturnType<typeof getSqlJs>>)['Database']>,
  stmts: string[],
): { stdout: string; error?: string } {
  const stringifySqlValue = (v: unknown) => (v == null ? 'NULL' : safeStringify(v) || 'NULL')
  const isSelectStatement = (stmt: string) => /^\s*SELECT\b/i.test(stmt)

  const appendSelectResults = (lines: string[], results: { columns?: string[]; values?: unknown[][] }[]) => {
    for (const r of results) {
      const cols = r.columns ?? []
      if (cols.length === 0) continue
      lines.push(cols.join('|'), cols.map(() => '---').join('|'))
      for (const row of r.values ?? []) lines.push(row.map(stringifySqlValue).join('|'))
    }
  }

  const runStatement = (lines: string[], stmt: string): string | undefined => {
    const stmtWithSemi = stmt.endsWith(';') ? stmt : stmt + ';'
    try {
      if (isSelectStatement(stmt)) {
        appendSelectResults(lines, db.exec(stmtWithSemi))
        return
      }
      db.run(stmtWithSemi)
      return
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }

  const lines: string[] = []
  for (const stmt of stmts) {
    const err = runStatement(lines, stmt)
    if (err) return { stdout: lines.join('\n'), error: err }
  }

  return { stdout: lines.join('\n').trim() || '(no output)' }
}

async function runSql(code: string): Promise<{ stdout: string; stderr: string; error?: string }> {
  try {
    const SQL = await getSqlJs()
    const db = new SQL.Database()
    const stmts = code
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
    const { stdout, error } = executeSqlStatements(db, stmts)
    db.close()
    return error ? { stdout, stderr: '', error } : { stdout, stderr: '' }
  } catch (e) {
    return { stdout: '', stderr: '', error: e instanceof Error ? e.message : String(e) }
  }
}

// --- Java: no in-browser runtime, so code can be written and submitted but not run here ---
function runJava(): { stdout: string; stderr: string; error: string } {
  return {
    stdout: '',
    stderr: '',
    error: 'Java execution requires a backend service. Your code can be written and submitted here—it will be validated when you submit the task.',
  }
}

type CodeBlockProps = Readonly<{
  initialCode?: string
  onRun?: (language: CodeLanguage, code: string, output: { stdout: string; stderr: string }) => void
  readOnly?: boolean
  /** How to run code: 'console' (local) or 'tests' (backend testcase flow). */
  mode?: CodeRunMode
  /** Optional task identifier to send to the backend when mode === 'tests'. */
  taskId?: string
}>

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return value.toString()
  try {
    const json = JSON.stringify(value)
    if (typeof json === 'string') return json
    return Object.prototype.toString.call(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

export default function CodeBlock({
  initialCode,
  onRun,
  readOnly = false,
  mode = 'console',
  taskId,
}: CodeBlockProps) {
  const [language, setLanguage] = useState<CodeLanguage>('javascript')
  const [code, setCode] = useState(initialCode ?? DEFAULT_CODE.javascript)
  const [inputMode, setInputMode] = useState<'interactive' | 'preenter'>('interactive')
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)
  const [output, setOutput] = useState<{ stdout: string; stderr: string; error?: string } | null>(null)
  const [testResult, setTestResult] = useState<{
    total: number
    passed: number
    results: {
      id?: string
      visibility?: string
      status: 'passed' | 'failed' | 'error'
      input?: string
      expected_output?: string
      actual_output?: string
      message?: string
    }[]
  } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null)
  const initialCodeRef = useRef(initialCode)

  const handleLanguageChange = useCallback((l: CodeLanguage) => {
    setLanguage(l)
    if (!initialCodeRef.current) setCode(DEFAULT_CODE[l])
    setOutput(null)
  }, [])

  const runDemoTestCase = useCallback(async () => {
    const demoInput = '2\n3\n'
    const expected = '5'

    if (language === 'javascript') {
      const stdinLines = demoInput.split('\n').map((s) => s.trimEnd())
      const result = runJavaScript(code, stdinLines)
      return { stdout: result.stdout, stderr: result.stderr, demoInput, expected }
    }
    if (language === 'python') {
      const result = await runPython(code, demoInput)
      return { stdout: result.stdout, stderr: result.stderr, demoInput, expected }
    }
    if (language === 'sql') {
      const result = await runSql(code)
      return { stdout: result.stdout, stderr: result.stderr, demoInput, expected }
    }

    const result = runJava()
    return { stdout: result.stdout, stderr: result.stderr || result.error, demoInput, expected }
  }, [code, language])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setOutput(null)
    setTestResult(null)
    setTestError(null)
    setLoadingMsg(null)

    if (mode === 'tests') {
      // Demo-only testcase flow: run a single hard-coded testcase in-browser
      try {
        setLoadingMsg(taskId ? `Running demo test case (${taskId})...` : 'Running demo test case...')
        const { stdout, stderr, demoInput, expected } = await runDemoTestCase()

        const normalizedOut = stdout.trim()
        const normalizedExpected = expected.trim()
        const passed = normalizedOut === normalizedExpected && !stderr

        setTestResult({
          total: 1,
          passed: passed ? 1 : 0,
          results: [
            {
              id: 'demo-1',
              visibility: 'public',
              status: passed ? 'passed' : 'failed',
              input: demoInput,
              expected_output: expected,
              actual_output: stdout || '(no output)',
              message: stderr || undefined,
            },
          ],
        })
      } catch (e) {
        setTestError(e instanceof Error ? e.message : 'Error while running demo test case.')
      }
    } else {
      const runConsole = async () => {
        if (language === 'javascript') {
          const stdinLines = inputMode === 'preenter' ? stdin.split('\n').map((s) => s.trimEnd()) : null
          const result = runJavaScript(code, stdinLines)
          setOutput(result)
          onRun?.(language, code, result)
          return
        }
        if (language === 'python') {
          setLoadingMsg('Loading Python runtime (~6MB, first run only)...')
          const result = await runPython(code, inputMode === 'preenter' ? stdin : null)
          setOutput(result)
          if (!result.error) onRun?.(language, code, { stdout: result.stdout, stderr: result.stderr })
          return
        }
        if (language === 'sql') {
          setLoadingMsg('Loading SQL engine...')
          const result = await runSql(code)
          setOutput(result)
          if (!result.error) onRun?.(language, code, { stdout: result.stdout, stderr: result.stderr })
          return
        }
        const result = runJava()
        setOutput(result)
      }
      await runConsole()
    }

    setLoadingMsg(null)
    setRunning(false)
  }, [code, language, onRun, inputMode, stdin, mode, taskId, runDemoTestCase])

  const langConfig = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0]

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Programiz-style top bar: filename + Run + Clear */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <span className="font-mono text-sm font-medium text-slate-700">{langConfig.fileName}</span>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
            className="ml-1 cursor-pointer border-0 bg-transparent py-0 pr-5 text-sm font-medium text-slate-600 focus:ring-0"
            aria-label="Language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run
            </button>
            <button
              type="button"
              onClick={() => setOutput(null)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Input: Interactive / Pre-enter (console mode only) */}
      {mode === 'console' && (language === 'python' || language === 'javascript') && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
          <span className="text-xs font-medium text-slate-500">Input:</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === 'interactive'}
              onChange={() => setInputMode('interactive')}
              className="h-3.5 w-3.5 border-slate-300 text-brand-teal"
            />
            <span className="text-xs text-slate-600">Interactive</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === 'preenter'}
              onChange={() => setInputMode('preenter')}
              className="h-3.5 w-3.5 border-slate-300 text-brand-teal"
            />
            <span className="text-xs text-slate-600">Pre-enter</span>
          </label>
          {inputMode === 'preenter' && (
            <button
              type="button"
              onClick={() => setShowStdin(!showStdin)}
              className="text-xs text-brand-teal hover:underline"
            >
              {showStdin ? 'Hide' : 'Show'} stdin
            </button>
          )}
          {inputMode === 'preenter' && showStdin && (
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="One value per line"
              className="ml-2 min-w-[200px] flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400"
              rows={2}
              spellCheck={false}
            />
          )}
        </div>
      )}

      {/* Editor + Output side-by-side on wide screens, stacked on small */}
      <div className="flex flex-col lg:flex-row min-h-[320px]">
        {/* Editor panel */}
        <div className="flex flex-1 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r lg:min-w-0">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100/80 px-3 py-1.5">
            <span className="text-xs font-medium text-slate-500">{langConfig.fileName}</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            readOnly={readOnly}
            placeholder="Write your code here..."
            className="min-h-[200px] flex-1 resize-none border-0 bg-slate-900 p-4 font-mono text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:ring-0 focus:outline-none"
            spellCheck={false}
            style={{ tabSize: 4 }}
          />
        </div>

        {/* Output / Test results panel */}
        <div className="flex min-h-[140px] flex-1 flex-col border-t border-slate-200 bg-slate-800 lg:min-w-[280px]">
          <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Terminal className="h-4 w-4 text-slate-400" />
              {mode === 'tests' ? 'Test results' : 'Output'}
            </span>
            <button
              type="button"
              onClick={() => {
                setOutput(null)
                setTestResult(null)
                setTestError(null)
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              title={mode === 'tests' ? 'Clear results' : 'Clear output'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono text-sm min-h-[80px] max-h-[280px]">
            {running && (
              <span className="text-slate-400">{loadingMsg ?? 'Running...'}</span>
            )}
            {!running && mode === 'tests' && (
              <>
                {testError && (
                  <div className="flex items-start gap-2 text-red-300 mb-3">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{testError}</span>
                  </div>
                )}
                {testResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-200 font-medium">
                        {testResult.passed} / {testResult.total} test cases passed
                      </span>
                    </div>
                    <div className="space-y-2">
                      {testResult.results.map((r, idx) => (
                        <div
                          key={r.id ?? idx}
                          className={`rounded-lg border px-3 py-2 text-xs ${
                            r.status === 'passed'
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                              : 'border-red-500/60 bg-red-500/10 text-red-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">
                              Test {idx + 1}{' '}
                              {r.visibility === 'hidden' && (
                                <span className="ml-1 text-[10px] uppercase tracking-wide opacity-80">
                                  Hidden
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-wide">
                              {r.status === 'passed' ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          {r.visibility !== 'hidden' && (
                            <div className="space-y-1 mt-1">
                              {r.input != null && (
                                <div>
                                  <span className="font-semibold">Input:</span>{' '}
                                  <span className="whitespace-pre-wrap">{r.input}</span>
                                </div>
                              )}
                              {r.expected_output != null && (
                                <div>
                                  <span className="font-semibold">Expected:</span>{' '}
                                  <span className="whitespace-pre-wrap">{r.expected_output}</span>
                                </div>
                              )}
                              {r.actual_output != null && (
                                <div>
                                  <span className="font-semibold">Your output:</span>{' '}
                                  <span className="whitespace-pre-wrap">{r.actual_output}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {r.message && (
                            <div className="mt-1 text-[11px] opacity-90 whitespace-pre-wrap">
                              {r.message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!testResult && !testError && (
                  <span className="text-slate-500">
                    Run your code to see test case results.
                  </span>
                )}
              </>
            )}
            {!running && mode !== 'tests' && output?.error && (
              <div className="flex items-start gap-2 text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{output.error}</span>
              </div>
            )}
            {!running && mode !== 'tests' && output && !output.error && (
              <>
                {output.stdout && (
                  <pre className="whitespace-pre-wrap text-emerald-200">{output.stdout}</pre>
                )}
                {output.stderr && (
                  <pre className="whitespace-pre-wrap text-amber-300 mt-1">{output.stderr}</pre>
                )}
                {!output.stdout && !output.stderr && (
                  <span className="text-slate-400">(no output)</span>
                )}
              </>
            )}
            {!running && mode !== 'tests' && !output && (
              <span className="text-slate-500">Run your code to see output.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
