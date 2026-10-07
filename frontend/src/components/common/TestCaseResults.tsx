// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

/**
 * A single test-case result. Deliberately loose so it accepts both shapes the
 * backend returns: the "run" shape (`input_data` / `stdout`) and the stored
 * "submission" shape (`input` / `actual_output`).
 */
export interface TestCaseResult {
  test_case_id?: number
  input_data?: string
  input?: string
  expected_output?: string
  stdout?: string
  stderr?: string
  actual_output?: string
  verdict?: string
  passed?: boolean
  is_sample?: boolean
}

const isPass = (tc: TestCaseResult): boolean =>
  tc.verdict ? tc.verdict === 'Accepted' : !!tc.passed

const caseInput = (tc: TestCaseResult): string => tc.input_data ?? tc.input ?? ''
const caseOutput = (tc: TestCaseResult): string => tc.actual_output ?? tc.stdout ?? ''

type TestCaseResultsProps = Readonly<{
  results: TestCaseResult[]
  /** Show a skeleton (e.g. while a submission is still being evaluated). */
  loading?: boolean
  loadingCount?: number
  className?: string
}>

/**
 * LeetCode-style test-case panel: a "N/M passed" summary, a row of pass/fail
 * chips, and an expandable input / expected / your-output detail for the
 * selected case. Shared by the Run and Submit views of both coding flows.
 */
export default function TestCaseResults({
  results,
  loading = false,
  loadingCount = 3,
  className = '',
}: TestCaseResultsProps) {
  // Open the first case by default so a result is visible immediately.
  const [selected, setSelected] = useState<number | null>(0)

  if (loading) {
    return (
      <div className={className}>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">
          Test Cases
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: loadingCount }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-500"
            >
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              Test case {i + 1}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!results || results.length === 0) return null

  const passedCount = results.filter(isPass).length
  const allPassed = passedCount === results.length
  const sel = selected != null ? results[selected] : undefined

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
          Test Cases
        </p>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            allPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}
        >
          {passedCount}/{results.length} passed
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {results.map((tc, i) => {
          const pass = isPass(tc)
          const isSel = selected === i
          let chipCls: string
          if (pass) {
            chipCls = isSel
              ? 'bg-emerald-200 border-emerald-400 text-emerald-800 ring-2 ring-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          } else {
            chipCls = isSel
              ? 'bg-red-200 border-red-400 text-red-800 ring-2 ring-red-300'
              : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
          }
          return (
            <button
              key={tc.test_case_id ?? i}
              type="button"
              onClick={() => setSelected(isSel ? null : i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${chipCls}`}
            >
              {pass ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 shrink-0" />
              )}
              Test case {i + 1}
            </button>
          )
        })}
      </div>

      {sel && (
        <div
          className={`mt-3 rounded-xl border text-xs overflow-hidden ${
            isPass(sel) ? 'border-emerald-200' : 'border-red-200'
          }`}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 border-b ${
              isPass(sel) ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}
          >
            {isPass(sel) ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            )}
            <span
              className={`font-semibold ${isPass(sel) ? 'text-emerald-700' : 'text-red-700'}`}
            >
              Test case {(selected ?? 0) + 1} — {sel.verdict ?? (isPass(sel) ? 'Accepted' : 'Wrong Answer')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 bg-white">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
                Input
              </p>
              <pre className="font-mono text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap min-h-10">
                {caseInput(sel) || '—'}
              </pre>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
                Expected Output
              </p>
              <pre className="font-mono text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap min-h-10">
                {sel.expected_output ?? '—'}
              </pre>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
                Your Output
              </p>
              <pre
                className={`font-mono rounded-lg px-3 py-2 whitespace-pre-wrap min-h-10 ${
                  isPass(sel) ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {caseOutput(sel) || '(empty)'}
              </pre>
            </div>
          </div>
          {sel.stderr && (
            <div className="px-4 pb-4 bg-white">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-red-400 mb-1">
                Error
              </p>
              <pre className="font-mono text-red-700 bg-red-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                {sel.stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
