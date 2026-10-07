// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { CheckCircle, FileText } from "lucide-react";
import { getTaskSubmissionsApi } from "@/lib/api/organizations";
import type { NodeMeta } from "./courseMeta";
import TaskSubmission, { type StudentTaskSubmission } from "./TaskSubmission";
import QuizSection from "./QuizSection";

/**
 * Renders the interactive part of an open node — coding exercise, task
 * submission, quiz, resource link, and/or the "mark as completed" control —
 * based on the node's resolved meta.
 */
export default function NodeCompletionArea({
  nodeId,
  courseId,
  moduleId,
  isDone,
  meta,
  onDone,
  onTaskSubmitted,
}: Readonly<{
  nodeId: number;
  courseId: string;
  moduleId: string;
  isDone: boolean;
  meta: NodeMeta;
  onDone: () => Promise<void> | void;
  onTaskSubmitted: () => void;
}>) {
  const [submissions, setSubmissions] = useState<StudentTaskSubmission[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (meta.isTask) {
      getTaskSubmissionsApi(nodeId).then(setSubmissions).catch(console.error);
    }
  }, [nodeId, meta.isTask]);

  const handleLocalDone = async () => {
    setIsCompleting(true);
    try {
      await onDone();
    } finally {
      setIsCompleting(false);
    }
  };

  const hasSubmission = meta.taskSubmission != null || submissions.length > 0;
  const taskNotSubmitted = meta.isTask && !hasSubmission;
  const markLabel = isCompleting ? "MARKING..." : "MARK AS COMPLETED";

  return (
    <div
      className={`p-4 rounded-2xl space-y-4 transition-all duration-700 ${isDone ? "bg-emerald-50/20" : "bg-slate-50/50"}`}
    >
      {meta.isTask && (
        <TaskSubmission
          nodeId={nodeId}
          meta={meta}
          submissions={submissions}
          setSubmissions={setSubmissions}
          onTaskSubmitted={onTaskSubmitted}
        />
      )}

      {meta.isQuiz && (
        <QuizSection
          quizzes={meta.quizzes}
          onDone={onDone}
          isDone={isDone}
          quizScore={meta.quizScore}
          nodeId={nodeId}
          courseId={courseId}
          moduleId={moduleId}
        />
      )}

      {!meta.isVideo && meta.url && (
        <div className="flex justify-center">
          <a
            href={meta.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-slate-800 text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <FileText className="h-4 w-4 text-brand-teal" /> View Document
            Resource
          </a>
        </div>
      )}

      {!meta.isQuiz && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
          <div>
            <button
              onClick={handleLocalDone}
              disabled={isDone || isCompleting || taskNotSubmitted}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg transition-all ${isDone ? "bg-brand-teal text-white cursor-default" : "bg-slate-900 text-white hover:bg-brand-teal"} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CheckCircle
                className={`h-3.5 w-3.5 ${isCompleting ? "animate-spin" : ""}`}
              />
              {isDone ? "Completed" : markLabel}
            </button>
            {taskNotSubmitted && (
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Submit your task first to mark as complete.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
