// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Lock } from "lucide-react";
import {
  getStudentNodeDetailApi,
  type ApiStudentNodeDetail,
} from "@/lib/api/organizations";
import { getMeta, type NodeMeta, type RoadmapNodeData } from "./courseMeta";
import CurriculumHeading from "./CurriculumHeading";
import ThumbnailPreview from "./ThumbnailPreview";
import GuidanceSection from "./GuidanceSection";
import VideoPlayer from "./VideoPlayer";
import NodeCompletionArea from "./NodeCompletionArea";
import LearningContentViewer from "@/components/course/LearningContentViewer";

/**
 * Whether a roadmap node already carries its full content inline. The roadmap
 * list endpoint now returns only capability flags, so new-shape nodes have no
 * inline content and must be fetched on open; older/detail responses embed it.
 */
function hasInlineContent(n: RoadmapNodeData): boolean {
  return (
    !!n.learning_material ||
    !!n.task ||
    !!n.content_url ||
    !!n.content_file ||
    !!n.task_title ||
    !!n.quiz_name ||
    (Array.isArray(n.quizzes) && n.quizzes.length > 0) ||
    (Array.isArray(n.coding_questions) && n.coding_questions.length > 0)
  );
}

type CategoryDisplay = { type: string; styles: string };

function categoryDisplay(meta: NodeMeta): CategoryDisplay {
  if (meta.isTask) return { type: "TASK", styles: "bg-indigo-50 text-indigo-600" };
  if (meta.isQuiz)
    return { type: "QUIZ", styles: "bg-emerald-50 text-emerald-600" };
  if (meta.isAssessment)
    return { type: "ASSESSMENT", styles: "bg-amber-50 text-amber-600" };
  return { type: "LEARNING", styles: "bg-blue-50 text-blue-600" };
}

function taskFormatChips(meta: NodeMeta): string[] {
  if (!meta.isTask) return [];
  return [
    meta.allowLink && "Link",
    meta.allowParagraph && "Essay",
    meta.allowPdf && "PDF",
    meta.allowScreenshot && "Screenshot",
    meta.allowCodeBlock && "Code",
    meta.allowFile && "File",
  ].filter((c): c is string => Boolean(c));
}

function submissionBadgeCls(status?: string) {
  if (status === "Approved") return "bg-emerald-100 text-emerald-700";
  if (status === "Rejected") return "bg-red-100 text-red-600";
  return "bg-amber-50 text-amber-600";
}

/** Dispatches a roadmap node to a heading or an interactive task card. */
export default function CurriculumNode({
  node,
  orgId,
  courseId,
  moduleId,
  isOpen,
  isDone,
  isLocked,
  onToggle,
  onDone,
  onTaskSubmitted,
}: Readonly<{
  node: RoadmapNodeData;
  orgId: string;
  courseId: string;
  moduleId: string;
  isOpen: boolean;
  isDone: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onDone: () => void;
  onTaskSubmitted: () => void;
}>) {
  const meta = getMeta(node);

  if (meta.isHeading) {
    return (
      <CurriculumHeading title={meta.title} description={node.description ?? undefined} />
    );
  }

  return (
    <CurriculumTaskNode
      node={node}
      orgId={orgId}
      courseId={courseId}
      moduleId={moduleId}
      meta={meta}
      isOpen={isOpen}
      isDone={isDone}
      isLocked={isLocked}
      onToggle={onToggle}
      onDone={onDone}
      onTaskSubmitted={onTaskSubmitted}
    />
  );
}

function CurriculumTaskNode({
  node,
  orgId,
  courseId,
  moduleId,
  meta,
  isOpen,
  isDone,
  isLocked,
  onToggle,
  onDone,
  onTaskSubmitted,
}: Readonly<{
  node: RoadmapNodeData;
  orgId: string;
  courseId: string;
  moduleId: string;
  meta: NodeMeta;
  isOpen: boolean;
  isDone: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onDone: () => Promise<void> | void;
  onTaskSubmitted: () => void;
}>) {
  // The roadmap list only reports capability flags — the actual content is
  // fetched from the node-detail endpoint when the student opens the node. If
  // the node already carries its content inline (older/detail responses) we use
  // it directly and skip the request.
  const [detail, setDetail] = useState<ApiStudentNodeDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const needsDetail = !hasInlineContent(node);

  useEffect(() => {
    if (!isOpen || !needsDetail || detail || detailError) return;
    let cancelled = false;
    getStudentNodeDetailApi(orgId, courseId, moduleId, node.id)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setDetailError(
            err instanceof Error
              ? err.message
              : "This content is locked. Complete the previous step to unlock it.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, needsDetail, detail, detailError, orgId, courseId, moduleId, node.id]);

  // Loading is derived: we're fetching whenever the node is open, needs detail,
  // and neither the content nor an error has arrived yet.
  const detailLoading = isOpen && needsDetail && !detail && !detailError;

  // The full content used for the expanded body. Falls back to the roadmap node
  // when it already carries content inline (or before the fetch resolves).
  const effectiveNode: RoadmapNodeData = detail ?? node;
  const detailMeta = detail ? getMeta(detail) : meta;

  const category = categoryDisplay(meta);
  const formatChips = taskFormatChips(meta);
  const sub = meta.taskSubmission;
  // Collapsed quiz summary — only meaningful when the roadmap node still carries
  // quiz data inline (older responses). The flag-only shape shows no count.
  const totalQuizQuestions = meta.quizzes.reduce(
    (s, q) => s + (q.questions?.length || 0),
    0,
  );

  return (
    <div className="relative animate-in fade-in duration-500">
      <div
        className={`absolute -left-[27px] top-5 h-2.5 w-2.5 rounded-full z-10 shadow-sm transition-all duration-500 ${isDone ? "bg-brand-teal scale-125" : "bg-white shadow-inner shadow-slate-200"}`}
      />

      <div
        className={`transition-all duration-700 ${isOpen ? "bg-white shadow-lg rounded-2xl overflow-hidden" : "bg-white/40 hover:bg-white shadow-sm hover:shadow-md rounded-xl"}`}
      >
        <button
          onClick={onToggle}
          data-testid="node-btn"
          className={`w-full p-3.5 flex items-start gap-4 text-left group ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        >
          {isLocked ? (
            <div className="h-12 w-20 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="h-5 w-5 text-slate-300" />
            </div>
          ) : (
            <>{!isOpen && <ThumbnailPreview meta={meta} />}</>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${isLocked ? "bg-slate-100 text-slate-400" : category.styles}`}
              >
                {isLocked ? "LOCKED" : category.type}
              </span>
              {/* Submission status badge */}
              {!isOpen && sub && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${submissionBadgeCls(sub.status)}`}
                >
                  {sub.status}
                  {sub.status === "Rejected" && sub.can_resubmit
                    ? " · Resubmit"
                    : ""}
                </span>
              )}
              {isOpen && (
                <span className="text-[10px] font-semibold text-brand-teal uppercase tracking-widest animate-pulse">
                  Now Viewing
                </span>
              )}
            </div>
            <h6 className="text-sm font-semibold text-slate-700 tracking-tight">
              {meta.title}
            </h6>

            {/* Format chips — shown when collapsed */}
            {!isOpen && meta.isTask && formatChips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest self-center">
                  Submit via:
                </span>
                {formatChips.map((f) => (
                  <span
                    key={f}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 uppercase tracking-wide"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Quiz summary — shown when collapsed (inline quiz data only) */}
            {!isOpen && meta.isQuiz && meta.quizzes.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {meta.quizzes.length} quiz · {totalQuizQuestions}{" "}
                question{totalQuizQuestions !== 1 ? "s" : ""}
              </p>
            )}

            {/* Description — learning nodes and task nodes */}
            {!isOpen && !meta.isQuiz && (
              <p className="text-xs text-slate-600 line-clamp-2 italic font-medium leading-relaxed mt-0.5">
                {isLocked
                  ? "Complete the previous item to unlock this step."
                  : (meta.isTask ? node.task?.description : node.description) ||
                    node.description}
              </p>
            )}
          </div>
          <div
            className={`transition-all duration-500 ${isOpen ? "rotate-180 text-brand-teal" : "text-slate-200"}`}
          >
            {!isLocked && <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isOpen && detailLoading && (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400 animate-in fade-in duration-300">
            <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Loading content…
            </span>
          </div>
        )}

        {isOpen && !detailLoading && detailError && (
          <div className="m-4 mt-0 p-5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-3 animate-in fade-in duration-300">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-amber-700">
                This step is locked
              </p>
              <p className="text-xs text-amber-600 font-medium leading-relaxed">
                {detailError ||
                  "Complete the previous item to unlock this content."}
              </p>
            </div>
          </div>
        )}

        {isOpen && !detailLoading && !detailError && (
          <div className="p-4 pt-0 space-y-4 animate-in zoom-in-95 duration-500">
            {detailMeta.isTask && effectiveNode.task?.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {effectiveNode.task.description}
              </p>
            )}
            <GuidanceSection node={effectiveNode} />
            {detailMeta.attachment && (
              <LearningContentViewer
                content={{
                  contentType: "",
                  url: detailMeta.attachment,
                  title: detailMeta.taskTitle || detailMeta.title || "Attachment",
                }}
              />
            )}
            {detailMeta.isVideo && detailMeta.yid && (
              <VideoPlayer title={detailMeta.title} yid={detailMeta.yid} />
            )}
            {detailMeta.isVideo && !detailMeta.yid && detailMeta.url && (
              <div className="aspect-video w-full max-w-2xl mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl">
                <video
                  src={detailMeta.url}
                  controls
                  className="w-full h-full"
                  title={detailMeta.title}
                />
              </div>
            )}
            <NodeCompletionArea
              nodeId={node.id}
              courseId={courseId}
              moduleId={moduleId}
              isDone={isDone}
              meta={detailMeta}
              onDone={onDone}
              onTaskSubmitted={onTaskSubmitted}
            />
          </div>
        )}
      </div>
    </div>
  );
}
