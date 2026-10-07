// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, XCircle, Sparkles, Timer } from "lucide-react";
import { submitQuizApi, getNodeQuizReviewApi } from "@/lib/api/organizations";
import type {
  ApiQuizAnswer,
  ApiQuizSubmissionResult,
  ApiNodeQuizReview,
} from "@/lib/api/organizations";
import { getStoredOrganizations } from "@/lib/auth";
import { showToast } from "@/lib/toastApi";
import QuizReview from "./QuizReview";
import QuestionStepper from "@/components/common/QuestionStepper";
import type { RoadmapQuiz } from "./courseMeta";

interface QuizOption {
  id: number;
  option_text: string;
  is_correct?: boolean;
}
interface QuizQuestion {
  id: number;
  question_text: string;
  allow_multiple_correct?: boolean;
  options?: QuizOption[];
}
/** A narrowed view of the loosely-typed roadmap quiz, for the fields this component reads. */
type TypedQuiz = RoadmapQuiz & {
  questions?: QuizQuestion[];
  retake_limit?: number | null;
  timer_minutes?: number | null;
  quiz_timer_minutes?: number | null;
};

/**
 * Answers are reviewable only when the node-detail response carries `is_correct`
 * on options — the backend adds it once the student has passed the quiz.
 */
function hasRevealedAnswers(quizzes: readonly ApiNodeQuizReview[]): boolean {
  return quizzes.some((quiz) =>
    quiz?.questions?.some((q) =>
      q?.options?.some((o) => typeof o?.is_correct === "boolean"),
    ),
  );
}

/** Whether a submission passed: trust the backend `passed`, else compare the
 * computed percentage against the quiz's passing threshold (no threshold → pass). */
function isAttemptPassed(
  res: ApiQuizSubmissionResult,
  passPercentage: number | null,
): boolean {
  if (typeof res.passed === "boolean") return res.passed;
  if (passPercentage == null) return true;
  const pct =
    res.total_questions > 0
      ? (res.correct_answers / res.total_questions) * 100
      : 0;
  return pct >= passPercentage;
}

export default function QuizSection({
  quizzes,
  onDone,
  isDone,
  quizScore,
  nodeId,
  courseId,
  moduleId,
}: {
  readonly quizzes: RoadmapQuiz[];
  readonly onDone: () => void;
  readonly isDone: boolean;
  readonly quizScore: number | null;
  readonly nodeId: number;
  readonly courseId: string;
  readonly moduleId: string;
}) {
  const [started, setStarted] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({}); // questionId → optionId or optionIds
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiQuizSubmissionResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0); // currently-viewed question within the active quiz
  const [attempt, setAttempt] = useState(0); // bumped on retake to force a re-shuffle + timer restart
  const [reviewing, setReviewing] = useState(false);
  // Quizzes fetched from the node-detail endpoint, which includes `is_correct`
  // on options once the student has passed. The roadmap data (`quizzes` prop)
  // never carries it, so answer review must come from this fetch.
  const [reviewQuizzes, setReviewQuizzes] = useState<ApiNodeQuizReview[] | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest handleSubmit, so the countdown effect can auto-submit on timeout
  // without listing handleSubmit as a dependency — otherwise answering a
  // question (which recreates handleSubmit) would restart the timer.
  const handleSubmitRef = useRef<
    (currentAnswers?: Record<number, number | number[]>) => Promise<void>
  >(async () => {});

  const quiz = quizzes[currentQuiz] as TypedQuiz | undefined;
  const questions: QuizQuestion[] = started ? shuffledQuestions : quiz?.questions || [];

  // Pass-gate config for the active quiz.
  const mustPass = quiz?.must_pass_to_continue === true;
  const passPercentage: number | null =
    typeof quiz?.pass_percentage === "number" ? quiz.pass_percentage : null;

  const passedThisAttempt = result
    ? isAttemptPassed(result, passPercentage)
    : false;

  // Once the node is completed (or the student just passed), pull node detail to
  // see if answers were revealed. If not passed, the backend omits `is_correct`
  // and review simply stays unavailable.
  useEffect(() => {
    if (!isDone && !passedThisAttempt) return;
    if (reviewQuizzes) return;
    const orgId = getStoredOrganizations()[0]?.id?.toString() || "1";
    let cancelled = false;
    getNodeQuizReviewApi(orgId, courseId, moduleId, nodeId)
      .then((qs) => {
        if (!cancelled) setReviewQuizzes(qs);
      })
      .catch(() => {
        /* review is best-effort; ignore fetch errors */
      });
    return () => {
      cancelled = true;
    };
  }, [isDone, passedThisAttempt, reviewQuizzes, courseId, moduleId, nodeId]);

  const answersRevealed = hasRevealedAnswers(reviewQuizzes ?? []);

  // Shuffle questions and options when quiz starts
  useEffect(() => {
    if (!started || !quiz) return;
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const raw: QuizQuestion[] = quiz?.questions ?? [];
    const shuffled = shuffle(raw).map((q) => ({
      ...q,
      options: shuffle(q.options || []),
    }));
    setShuffledQuestions(shuffled);
    setQIdx(0);
  }, [started, quiz, attempt]);
  const isAnswered = (q: QuizQuestion) => {
    const a = answers[q.id];
    return Array.isArray(a) ? a.length > 0 : a !== undefined;
  };
  const allAnswered = questions.length > 0 && questions.every(isAnswered);

  const handleSubmit = useCallback(
    async (currentAnswers?: Record<number, number | number[]>) => {
      if (!quiz) return;
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        const answerSource = currentAnswers ?? answers;
        const payload: ApiQuizAnswer[] = Object.entries(answerSource).map(
          ([qId, optId]) => {
            if (Array.isArray(optId)) {
              return { question: Number(qId), selected_options: optId };
            }
            return { question: Number(qId), selected_option: optId };
          },
        );
        const res = await submitQuizApi(quiz.id, payload);
        setResult(res);
        // A "must pass to continue" quiz only completes the node when passed;
        // otherwise the student stays put and retakes. Any other quiz completes
        // on submission regardless of score.
        const passPct =
          typeof quiz?.pass_percentage === "number" ? quiz.pass_percentage : null;
        const gated = quiz?.must_pass_to_continue === true;
        if (!gated || isAttemptPassed(res, passPct)) {
          showToast("Quiz submitted successfully.", "success");
          onDone();
        } else {
          showToast(
            "You need to pass this quiz before continuing. Please retake it.",
            "warning",
          );
        }
      } catch {
        showToast("Failed to submit quiz.", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [quiz, answers, onDone],
  );

  // Keep the ref pointed at the latest handleSubmit without retriggering the
  // countdown effect below.
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Start countdown when the quiz begins (or restarts on retake). Deliberately
  // does NOT depend on handleSubmit — that closure changes on every answer, and
  // depending on it would reset the timer each time a question is answered.
  useEffect(() => {
    if (!started || !quiz) return;
    const timerMinutes = quiz.quiz_timer_minutes ?? quiz.timer_minutes ?? null;
    if (!timerMinutes || timerMinutes <= 0) return;
    const totalSeconds = timerMinutes * 60;
    setTimeLeft(totalSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          showToast("Time is up. Your quiz has been submitted.", "warning");
          handleSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, quiz, attempt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Restart the current quiz for a fresh attempt. Bumping `attempt` re-runs the
  // shuffle + timer effects even though `started` is already true.
  const handleRetake = () => {
    setResult(null);
    setAnswers({});
    setTimeLeft(null);
    setStarted(true);
    setAttempt((a) => a + 1);
  };

  if (reviewing) {
    return (
      <QuizReview
        quizzes={reviewQuizzes ?? []}
        onBack={() => setReviewing(false)}
      />
    );
  }

  if (result) {
    const pct =
      result.total_questions > 0
        ? Math.round((result.correct_answers / result.total_questions) * 100)
        : 0;
    const passed = isAttemptPassed(result, passPercentage);
    // Retake availability: allowed by default; if the quiz sets a retake_limit,
    // stop once the student has used up their attempts.
    const retakeLimit =
      typeof quiz?.retake_limit === "number" ? quiz.retake_limit : null;
    const attemptNo = result.attempt_number ?? attempt + 1;
    const canRetake = retakeLimit == null || attemptNo < retakeLimit;
    return (
      <div
        className={`bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4 animate-in fade-in duration-500 ${passed ? "" : "border border-red-200"}`}
      >
        <div
          className={`h-16 w-16 rounded-full flex items-center justify-center ${passed ? "bg-brand-teal/10" : "bg-red-50"}`}
        >
          {passed ? (
            <CheckCircle className="h-8 w-8 text-brand-teal" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )}
        </div>
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
          {passed ? "Quiz Submitted" : "Quiz Not Passed"}
        </h4>
        <div
          className={`text-3xl font-bold ${passed ? "text-brand-teal" : "text-red-500"}`}
        >
          {pct}%
        </div>
        <p className="text-xs text-slate-500 uppercase tracking-widest">
          {result.correct_answers} / {result.total_questions} correct
        </p>
        {passPercentage !== null && (
          <p className="text-[11px] text-slate-400">
            Passing score: {passPercentage}%
          </p>
        )}

        {/* Failed: offer a retake. Answers stay hidden until the quiz is passed. */}
        {!passed && (
          <>
            <p className="text-xs text-red-600 text-center max-w-xs">
              {mustPass
                ? `You must score at least ${passPercentage ?? 0}% to continue.`
                : "You didn't reach the passing score."}{" "}
              {canRetake
                ? "Retake the quiz to try again."
                : "You've used all your attempts."}
            </p>
            {canRetake && (
              <button
                type="button"
                onClick={handleRetake}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-emerald-700 shadow-md transition-all"
              >
                Retake Quiz
              </button>
            )}
          </>
        )}

        {/* Passed: allow reviewing the correct answers. */}
        {passed && answersRevealed && (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-brand-teal shadow-md transition-all"
          >
            Review Answers
          </button>
        )}
      </div>
    );
  }

  if (!started) {
    const totalQ = quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0);
    const threshold =
      typeof quizzes[0]?.pass_percentage === "number"
        ? quizzes[0].pass_percentage
        : 50;
    const failed = isDone && quizScore !== null && quizScore < threshold;
    // Retake is offered on a failed quiz only when the quiz allows more than one
    // attempt (retake_limit > 1). Unset ⇒ allowed by default.
    const retakeLimit =
      typeof quiz?.retake_limit === "number" ? quiz.retake_limit : null;
    const retakeEnabled = retakeLimit == null || retakeLimit > 1;
    return (
      <div
        className={`rounded-xl shadow-sm px-5 py-4 flex items-center gap-4 animate-in fade-in duration-500 ${failed ? "bg-red-50 border border-red-200" : "bg-white"}`}
      >
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${failed ? "bg-red-100" : isDone ? "bg-brand-teal/10" : "bg-emerald-50"}`}
        >
          {isDone ? (
            failed ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-brand-teal" />
            )
          ) : (
            <Sparkles className="h-5 w-5 text-emerald-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-bold uppercase tracking-tight ${failed ? "text-red-700" : "text-slate-800"}`}
          >
            {isDone ? "Quiz Completed" : "Quiz Ready"}
          </p>
          {isDone && quizScore !== null ? (
            <p className="text-xs text-slate-500 mt-0.5">
              Score:{" "}
              <span
                className={`font-bold ${failed ? "text-red-600" : "text-brand-teal"}`}
              >
                {quizScore}%
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} ·{" "}
              {totalQ} questions
              {(() => {
                const first = quizzes[0] as TypedQuiz | undefined;
                const tm = first?.timer_minutes ?? first?.quiz_timer_minutes;
                return tm ? ` · ${tm} min` : "";
              })()}
            </p>
          )}
        </div>
        {!isDone && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-emerald-700 transition-all shrink-0"
          >
            Start
          </button>
        )}
        {/* Failed: offer a retake (when enabled) instead of answer review. */}
        {isDone && failed && retakeEnabled && (
          <button
            type="button"
            onClick={handleRetake}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-emerald-700 transition-all shrink-0"
          >
            Retake
          </button>
        )}
        {/* Passed: allow reviewing the correct answers. */}
        {isDone && !failed && answersRevealed && (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-brand-teal transition-all shrink-0"
          >
            Review
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-800">{quiz?.name}</h4>
        <div className="flex items-center gap-3 shrink-0">
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm border ${
                timeLeft <= 60
                  ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                  : timeLeft <= 300
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Timer className="h-4 w-4 shrink-0" />
              {formatTime(timeLeft)}
            </div>
          )}
          {quizzes.length > 1 && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Quiz {currentQuiz + 1} of {quizzes.length}
            </span>
          )}
        </div>
      </div>

      {/* Questions — one at a time */}
      {questions.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading questions…
        </div>
      ) : (
      <QuestionStepper
        count={questions.length}
        current={qIdx}
        onNavigate={setQIdx}
        getState={(i) => (isAnswered(questions[i]) ? "answered" : "unanswered")}
        submitAction={
          currentQuiz < quizzes.length - 1 ? (
            <button
              type="button"
              disabled={!allAnswered}
              onClick={() => {
                setCurrentQuiz((c) => c + 1);
                setAnswers({});
              }}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-brand-teal transition-all disabled:opacity-40"
            >
              Next Quiz →
            </button>
          ) : (
            <button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={() => handleSubmit()}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-emerald-700 shadow-md transition-all disabled:opacity-40"
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          )
        }
        renderQuestion={(i) => {
          const q = questions[i];
          if (!q) return null;
          const isMulti = q.allow_multiple_correct === true;
          const multiSelected: number[] =
            isMulti && Array.isArray(answers[q.id])
              ? (answers[q.id] as number[])
              : [];
          return (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                <span className="text-brand-teal mr-2">{i + 1}.</span>
                {q.question_text}
              </p>
              {isMulti && (
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Select all that apply
                </p>
              )}
              <div className="space-y-2">
                {(q.options || []).map((opt) => {
                  const selected = isMulti
                    ? multiSelected.includes(opt.id)
                    : answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (isMulti) {
                          const prev = multiSelected;
                          const next = prev.includes(opt.id)
                            ? prev.filter((id) => id !== opt.id)
                            : [...prev, opt.id];
                          setAnswers((a) => ({ ...a, [q.id]: next }));
                        } else {
                          setAnswers((a) => ({ ...a, [q.id]: opt.id }));
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                        selected
                          ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                          : "border-slate-100 bg-slate-50/50 text-slate-700 hover:border-brand-teal/40 hover:bg-brand-teal/5"
                      }`}
                    >
                      <span
                        className={`shrink-0 h-4 w-4 rounded${isMulti ? "" : "-full"} border-2 flex items-center justify-center transition-colors ${selected ? "border-brand-teal bg-brand-teal" : "border-slate-300"}`}
                      >
                        {selected && (
                          <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      {opt.option_text}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }}
      />
      )}
    </div>
  );
}
