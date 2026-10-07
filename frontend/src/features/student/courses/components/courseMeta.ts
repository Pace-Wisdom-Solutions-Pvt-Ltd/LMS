// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { config } from "@/config";

/** Resolve a possibly-relative content URL to an absolute one. */
export const toAbsUrl = (u: string) => {
  const r = String(u ?? "").trim();
  if (!r) return "";
  if (r.startsWith("http") || r.startsWith("blob:")) return r;
  return r.startsWith("/") ? `${config.api.baseUrl}${r}` : r;
};

/** Extract an 11-char YouTube video id from a watch/embed/share URL. */
export const parseYid = (u: string) => {
  const ytRegex = /(?:v=|\/embed\/|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/;
  return u ? ytRegex.exec(u)?.[1] || null : null;
};

/** A quiz attached to a roadmap node. */
export interface RoadmapQuiz {
  id: number
  name?: string
  questions?: unknown[]
  /** Minimum score (%) required to pass this quiz. */
  pass_percentage?: number | null
  /** Hard gate: student must pass before continuing to the next node. */
  must_pass_to_continue?: boolean
  [key: string]: unknown
}

/** A guidance bullet (quick outline / focus area) shown inside a node. */
export interface RoadmapGuidanceItem {
  id: number | string
  text: string
}

/** The current student's submission summary for a task node. */
export interface RoadmapTaskSubmission {
  status?: string
  can_resubmit?: boolean
  [key: string]: unknown
}

/**
 * The loosely-shaped node the roadmap API returns. A node may be a heading,
 * learning material, task, quiz, or coding exercise, so most fields are
 * optional and several appear in both nested and flattened forms.
 */
export interface RoadmapNodeData {
  id: number
  title?: string
  description?: string | null
  content_type?: string | null
  content_url?: string | null
  content_file?: string | null
  node_type?: string | null
  attachment?: string | null
  learning_material?: {
    content_type?: string | null
    content_url?: string | null
    content_file?: string | null
    attachment?: string | null
  } | null
  task?: {
    title?: string
    description?: string | null
    attachment?: string | null
    allow_pdf?: boolean
    allow_code_block?: boolean
    allow_link?: boolean
    allow_paragraph?: boolean
    allow_screenshot?: boolean
    allow_file?: boolean
  } | null
  task_title?: string
  task_attachment?: string | null
  task_allow_link?: boolean
  task_allow_code_block?: boolean
  task_allow_paragraph?: boolean
  task_allow_pdf?: boolean
  task_allow_screenshot?: boolean
  task_allow_file?: boolean
  quiz_name?: string
  questions_input?: unknown
  quizzes?: RoadmapQuiz[]
  coding_questions?: unknown[]
  is_completed?: boolean
  progress?: {
    status?: string
    last_accessed?: string | null
    quiz_score?: number | null
  }
  task_submission?: RoadmapTaskSubmission | null
  quick_outline?: RoadmapGuidanceItem[]
  focus_areas?: RoadmapGuidanceItem[]
  // Capability flags from the roadmap list endpoint (see ApiRoadmapNode). When
  // present, they drive categorisation instead of the (now-absent) nested
  // content objects above, which only arrive via the node-detail endpoint.
  has_learning_material?: boolean
  has_task?: boolean
  has_quiz?: boolean
  has_assessment?: boolean
  has_coding_questions?: boolean
  /** Whether the student may open this node (prerequisites satisfied). */
  is_accessible?: boolean
}

/**
 * Normalise a roadmap node (which can be a heading, learning material, task,
 * quiz, or coding exercise) into a flat, predictable shape the UI can render.
 */
export const getMeta = (c: RoadmapNodeData) => {
  const lm = c.learning_material || null;
  const task = c.task || null;

  // The roadmap list endpoint now returns boolean capability flags instead of
  // the nested content objects. When any flag is present we trust the flags for
  // categorisation; otherwise we fall back to detecting content inline (the
  // shape the node-detail endpoint still returns, and older list responses).
  const flagsProvided =
    c.has_learning_material !== undefined ||
    c.has_task !== undefined ||
    c.has_quiz !== undefined ||
    c.has_assessment !== undefined ||
    c.has_coding_questions !== undefined;

  const contentIsTask =
    !!task ||
    !!c.task_title ||
    !!c.task_allow_link ||
    !!c.task_allow_code_block ||
    !!c.task_allow_paragraph ||
    !!c.task_allow_pdf ||
    !!c.task_allow_screenshot ||
    !!c.task_allow_file;
  const contentIsQuiz =
    !!c.quiz_name ||
    !!c.questions_input ||
    (Array.isArray(c.quizzes) && c.quizzes.length > 0);
  const isTask = flagsProvided ? !!c.has_task : contentIsTask;
  const isQuiz = flagsProvided
    ? !!c.has_quiz && !isTask
    : contentIsQuiz;
  const isAssessment = flagsProvided
    ? !!c.has_assessment && !isTask && !isQuiz
    : false;
  const isHeading = flagsProvided
    ? !isTask && !isQuiz && !isAssessment && !c.has_learning_material
    : !lm && !contentIsTask && !contentIsQuiz;

  // Whether the student may open this node. The roadmap endpoint provides
  // `is_accessible`; when absent (node-detail/older responses) treat as open
  // and let the caller apply its own sequential-unlock fallback.
  const accessProvided = c.is_accessible !== undefined;
  const isAccessible = c.is_accessible !== false;

  const type = (c.content_type || lm?.content_type || "").toLowerCase();
  const url = toAbsUrl(
    c.content_url ||
      lm?.content_url ||
      c.content_file ||
      lm?.content_file ||
      "",
  );
  const title = c.task_title || c.quiz_name || c.title || "";

  const yid = parseYid(url);
  const isVideo = type === "video" || type === "youtube" || !!yid;

  // Task capabilities — check both flat fields and nested task object
  const allowPdf = !!task?.allow_pdf || !!c.task_allow_pdf;
  const allowCodeBlock = !!task?.allow_code_block || !!c.task_allow_code_block;
  const allowLink = !!task?.allow_link || !!c.task_allow_link;
  const allowParagraph = !!task?.allow_paragraph || !!c.task_allow_paragraph;
  const allowScreenshot = !!task?.allow_screenshot || !!c.task_allow_screenshot;
  const allowFile = !!task?.allow_file || !!c.task_allow_file;
  const taskTitle = task?.title || c.task_title || "";

  // Instructor-provided attachment (reference file) — can hang off a task node,
  // a learning-material node, or the node itself. Resolve to an absolute URL.
  const attachment = toAbsUrl(
    task?.attachment ||
      c.task_attachment ||
      lm?.attachment ||
      c.attachment ||
      "",
  );

  const quizzes = c.quizzes || [];
  const isDone = c.is_completed || c.progress?.status === "Completed";
  const quizScore = c.progress?.quiz_score ?? null;
  const taskSubmission = c.task_submission ?? null;

  return {
    type,
    url,
    title,
    taskTitle,
    isTask,
    isQuiz,
    isAssessment,
    isHeading,
    isAccessible,
    accessProvided,
    yid,
    isVideo,
    allowPdf,
    allowCodeBlock,
    allowLink,
    allowParagraph,
    allowScreenshot,
    allowFile,
    quizzes,
    isDone,
    quizScore,
    taskSubmission,
    attachment,
  };
};

export type NodeMeta = ReturnType<typeof getMeta>;
