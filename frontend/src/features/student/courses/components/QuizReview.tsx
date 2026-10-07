// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import type { ApiNodeQuizReview, ApiNodeQuizReviewQuestion } from "@/lib/api/organizations";
import QuestionStepper from "@/components/common/QuestionStepper";

/** A review question flattened out of its parent quiz, carrying the quiz name for context. */
type FlatReviewQuestion = ApiNodeQuizReviewQuestion & { quizName?: string };

/**
 * The set of option ids the student selected for a question. Reads the
 * per-question `selected_options` array (which supports multi-select); falls
 * back to the older per-option `is_selected` flag when that array is absent.
 */
function getSelectedIds(q: ApiNodeQuizReviewQuestion): Set<number> {
  if (Array.isArray(q.selected_options)) return new Set(q.selected_options);
  return new Set(
    (q.options ?? []).filter((o) => o.is_selected === true).map((o) => o.id),
  );
}

/**
 * Whether the student answered a question correctly, judged solely from their
 * own selection: every option they picked must be correct, and no correct option
 * left unpicked. No selection ⇒ unanswered ⇒ incorrect. Correctness is never
 * revealed for options the student didn't choose (see the render below).
 */
function isQuestionCorrect(q: ApiNodeQuizReviewQuestion): boolean {
  const opts = q.options ?? [];
  const selected = getSelectedIds(q);
  if (selected.size === 0) return false;
  const wrongPicked = opts.some((o) => selected.has(o.id) && o.is_correct !== true);
  const missedCorrect = opts.some((o) => o.is_correct === true && !selected.has(o.id));
  return !wrongPicked && !missedCorrect;
}

/**
 * Read-only answer review shown after a student passes a quiz. Highlights the
 * correct option(s) per question and, when the backend echoes it, marks which
 * option the student selected. The `is_correct` flag arrives from the node-detail
 * endpoint only once the student has passed.
 *
 * Questions are paged one at a time via the shared {@link QuestionStepper}.
 */
export default function QuizReview({
  quizzes,
  onBack,
}: Readonly<{
  quizzes: readonly ApiNodeQuizReview[];
  onBack: () => void;
}>) {
  const [current, setCurrent] = useState(0);

  const showQuizNames = quizzes.length > 1;
  const questions: FlatReviewQuestion[] = quizzes.flatMap((quiz) =>
    (quiz.questions ?? []).map((q) => ({ ...q, quizName: showQuizNames ? quiz.name : undefined })),
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800">Answer Review</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            Your answers highlighted
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No question data available.</p>
      ) : (
        <QuestionStepper
          mode="review"
          count={questions.length}
          current={current}
          onNavigate={setCurrent}
          getState={(i) => (isQuestionCorrect(questions[i]) ? "correct" : "incorrect")}
          renderQuestion={(i) => {
            const q = questions[i];
            return (
              <div className="space-y-3">
                {q.quizName && (
                  <p className="text-xs font-bold text-brand-teal uppercase tracking-widest">
                    {q.quizName}
                  </p>
                )}
                <p className="text-sm font-semibold text-slate-800">
                  <span className="text-brand-teal mr-2">{i + 1}.</span>
                  {q.question_text}
                </p>
                <div className="space-y-2">
                  {(() => {
                    const selectedIds = getSelectedIds(q);
                    return (q.options || []).map((opt) => {
                      // Only the student's own picks are surfaced: green when the
                      // picked option is correct, red when it isn't. Options the
                      // student didn't pick stay neutral — correctness is never
                      // revealed for them.
                      const selected = selectedIds.has(opt.id);
                      const rightPick = selected && opt.is_correct === true;
                      const wrongPick = selected && opt.is_correct !== true;
                      let optClass = "border-slate-100 bg-slate-50/50 text-slate-600";
                      if (rightPick) optClass = "border-emerald-300 bg-emerald-50 text-emerald-800";
                      else if (wrongPick) optClass = "border-red-300 bg-red-50 text-red-700";
                      let icon = (
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />
                      );
                      if (rightPick)
                        icon = <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />;
                      else if (wrongPick)
                        icon = <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
                      return (
                        <div
                          key={opt.id}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-3 ${optClass}`}
                        >
                          {icon}
                          <span className="flex-1">{opt.option_text}</span>
                          {selected && (
                            <span
                              className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${rightPick ? "text-emerald-600" : "text-red-500"}`}
                            >
                              Your answer
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
