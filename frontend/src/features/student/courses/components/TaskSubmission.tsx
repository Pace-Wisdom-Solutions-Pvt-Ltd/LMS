// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Sparkles,
  FileText,
  UploadCloud,
  X,
  Link2,
  FileCheck2,
} from "lucide-react";
import { submitTaskApi, getTaskSubmissionsApi } from "@/lib/api/organizations";
import type { TaskSubmissionStatus } from "@/lib/api/organizations";
import { showToast } from "@/lib/toastApi";
import type { NodeMeta } from "./courseMeta";

/**
 * A task submission as the student sees it — the record returned by the
 * submissions API plus the loosely-typed summary embedded in node meta.
 * Every field is optional so both sources satisfy it.
 */
export interface StudentTaskSubmission {
  id?: number;
  status?: TaskSubmissionStatus | string;
  can_resubmit?: boolean;
  payload?: string | null;
  submission_file?: string | null;
  feedback?: string;
  awarded_score?: number | null;
  submitted_at?: string;
}

/** Human-readable file size, e.g. 1.4 MB. */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const PAYLOAD_LABELS: Record<string, string> = {
  link: "Link",
  paragraph: "Answer",
  code: "Code",
  value: "Submission",
};

const statusBadgeCls = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700";
    case "Rejected":
      return "bg-red-100 text-red-600";
    case "Graded":
      return "bg-blue-100 text-blue-600";
    case "Pending":
      return "bg-amber-50 text-amber-600";
    case "Needs Manual Review":
      return "bg-purple-50 text-purple-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const parsePayload = (payload: unknown): Record<string, string> => {
  if (!payload) return {};
  if (typeof payload === "object") return payload as Record<string, string>;
  try {
    return JSON.parse(payload as string);
  } catch {
    return { value: payload as string };
  }
};

/** Task submission form (per allowed format) plus submission history. */
export default function TaskSubmission({
  nodeId,
  meta,
  submissions,
  setSubmissions,
  onTaskSubmitted,
}: Readonly<{
  nodeId: number;
  meta: NodeMeta;
  submissions: StudentTaskSubmission[];
  setSubmissions: (subs: StudentTaskSubmission[]) => void;
  onTaskSubmitted: () => void;
}>) {
  const [submitting, setSubmitting] = useState(false);
  const [linkVal, setLinkVal] = useState("");
  const [paraVal, setParaVal] = useState("");
  const [codeVal, setCodeVal] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const hasInput = linkVal.trim() || paraVal.trim() || codeVal.trim() || !!file;

  // Combine the allowed file extensions into a single accept string
  const fileAccept = [
    meta.allowPdf ? ".pdf" : "",
    meta.allowScreenshot ? "image/*" : "",
    meta.allowFile ? "*" : "",
  ]
    .filter(Boolean)
    .join(",");

  // Build a JSON payload from whichever text fields are filled in
  const buildPayload = () => {
    const obj: Record<string, string> = {};
    if (meta.allowLink && linkVal.trim()) obj.link = linkVal.trim();
    if (meta.allowParagraph && paraVal.trim()) obj.paragraph = paraVal.trim();
    if (meta.allowCodeBlock && codeVal.trim()) obj.code = codeVal.trim();
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payloadStr = buildPayload();
      await submitTaskApi(nodeId, {
        payload: payloadStr ?? undefined,
        submission_file: file,
      });
      showToast("Task submitted successfully!", "success");
      setLinkVal("");
      setParaVal("");
      setCodeVal("");
      setFile(null);
      const fresh = await getTaskSubmissionsApi(nodeId);
      setSubmissions(fresh);
      onTaskSubmitted();
    } catch (err) {
      console.error("Failed to submit task:", err);
      showToast("Failed to submit task.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const latest: StudentTaskSubmission | null =
    submissions.length > 0
      ? submissions[0]
      : (meta.taskSubmission as StudentTaskSubmission | null);
  const canResubmit =
    latest?.status === "Rejected" && (latest?.can_resubmit ?? false);
  const showForm = !latest || canResubmit;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm p-4 animate-in fade-in duration-500">
        {showForm ? (
          <SubmissionForm
            nodeId={nodeId}
            meta={meta}
            canResubmit={canResubmit}
            submitting={submitting}
            hasInput={!!hasInput}
            fileAccept={fileAccept}
            linkVal={linkVal}
            paraVal={paraVal}
            codeVal={codeVal}
            file={file}
            onLinkChange={setLinkVal}
            onParaChange={setParaVal}
            onCodeChange={setCodeVal}
            onFileChange={setFile}
            onSubmit={handleSubmit}
          />
        ) : (
          <SubmissionStatus latest={latest} />
        )}
      </div>

      {submissions.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Submission History
          </h5>
          <div className="space-y-2">
            {submissions.map((sub, idx) => (
              <SubmissionHistoryItem
                key={sub.id}
                sub={sub}
                number={submissions.length - idx}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionStatus({
  latest,
}: {
  readonly latest: StudentTaskSubmission;
}) {
  const isPending =
    latest.status === "Pending" || latest.status === "Needs Manual Review";
  const isApproved = latest.status === "Approved";
  const isRejectedNoRetry =
    latest.status === "Rejected" && !latest.can_resubmit;

  let toneBg = "bg-red-50";
  let iconBg = "bg-red-100";
  if (isApproved) {
    toneBg = "bg-emerald-50";
    iconBg = "bg-emerald-100";
  } else if (isPending) {
    toneBg = "bg-amber-50";
    iconBg = "bg-amber-100";
  }

  let title = "Submission Rejected";
  if (isApproved) title = "Submission Approved";
  else if (isPending) title = "Under Review";

  let detail = "Your submission was rejected.";
  if (isApproved) detail = "Your work has been approved by the trainer.";
  else if (isPending) detail = "Your submission is being reviewed by the trainer.";
  else if (isRejectedNoRetry) detail = "No more resubmission attempts allowed.";

  return (
    <div className="space-y-3">
      <div className={`flex items-start gap-3 py-3 px-2 rounded-xl ${toneBg}`}>
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {isApproved ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : isPending ? (
            <Sparkles className="w-5 h-5 text-amber-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
          {latest.feedback && (
            <p className="text-xs text-slate-700 italic mt-1.5 border-t border-slate-100 pt-1.5">
              "{latest.feedback}"
            </p>
          )}
          {latest.awarded_score != null && (
            <p className="text-xs font-bold text-brand-teal mt-1">
              Score: {latest.awarded_score} / 100
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionForm({
  nodeId,
  meta,
  canResubmit,
  submitting,
  hasInput,
  fileAccept,
  linkVal,
  paraVal,
  codeVal,
  file,
  onLinkChange,
  onParaChange,
  onCodeChange,
  onFileChange,
  onSubmit,
}: Readonly<{
  nodeId: number;
  meta: NodeMeta;
  canResubmit: boolean;
  submitting: boolean;
  hasInput: boolean;
  fileAccept: string;
  linkVal: string;
  paraVal: string;
  codeVal: string;
  file: File | null;
  onLinkChange: (v: string) => void;
  onParaChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onFileChange: (f: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}>) {
  const hasFileFormat = meta.allowPdf || meta.allowScreenshot || meta.allowFile;
  let submitLabel = "Submit for Review";
  if (canResubmit) submitLabel = hasFileFormat ? "Re-upload Submission" : "Resubmit";

  const fileLabel = [
    meta.allowPdf && "PDF",
    meta.allowScreenshot && "Screenshot",
    meta.allowFile && "File",
  ]
    .filter(Boolean)
    .join(" / ");

  // Show a subtle "or" divider only when the student can pick between a
  // typed input and a file upload.
  const showOrDivider =
    hasFileFormat &&
    (meta.allowLink || meta.allowParagraph || meta.allowCodeBlock);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-800">
          {meta.taskTitle || "Task Submission"}
        </p>
        <p className="text-xs text-slate-400">
          Add your work below, then submit it for the trainer to review.
        </p>
      </div>

      {meta.allowLink && (
        <div className="space-y-1.5">
          <label
            htmlFor={`link-${nodeId}`}
            className="block text-xs font-medium text-slate-600"
          >
            Submission link
          </label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id={`link-${nodeId}`}
              type="url"
              value={linkVal}
              onChange={(e) => onLinkChange(e.target.value)}
              placeholder="https://github.com/... or a Drive link"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Paste a public GitHub, Drive, or hosted link to your solution.
          </p>
        </div>
      )}

      {meta.allowParagraph && (
        <div className="space-y-1.5">
          <label
            htmlFor={`para-${nodeId}`}
            className="block text-xs font-medium text-slate-600"
          >
            Written answer
          </label>
          <textarea
            id={`para-${nodeId}`}
            value={paraVal}
            onChange={(e) => onParaChange(e.target.value)}
            placeholder="Write your answer here..."
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </div>
      )}

      {meta.allowCodeBlock && (
        <div className="space-y-1.5">
          <label
            htmlFor={`code-${nodeId}`}
            className="block text-xs font-medium text-slate-600"
          >
            Code
          </label>
          <textarea
            id={`code-${nodeId}`}
            value={codeVal}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="// Paste your code here..."
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-sm text-green-400 outline-none transition-all placeholder:text-slate-600 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </div>
      )}

      {showOrDivider && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
            or
          </span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
      )}

      {hasFileFormat && (
        <FileDropzone
          nodeId={nodeId}
          label={fileLabel}
          fileAccept={fileAccept}
          file={file}
          onFileChange={onFileChange}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || !hasInput}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-900"
        >
          {submitting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Submitting…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </button>
        {!hasInput && !submitting && (
          <span className="text-[11px] text-slate-400">
            Add a link, answer, or file to enable submission.
          </span>
        )}
      </div>
    </form>
  );
}

/** Drag-and-drop file picker with selected-file preview and remove. */
function FileDropzone({
  nodeId,
  label,
  fileAccept,
  file,
  onFileChange,
}: Readonly<{
  nodeId: number;
  label: string;
  fileAccept: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
}>) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileChange(dropped);
  };

  if (file) {
    return (
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-3 rounded-lg border border-brand-teal/30 bg-brand-teal/5 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
            <FileCheck2 className="h-5 w-5 text-brand-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">
              {file.name}
            </p>
            <p className="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            aria-label="Remove file"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-slate-600">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-all ${
          dragging
            ? "border-brand-teal bg-brand-teal/5"
            : "border-slate-200 bg-slate-50 hover:border-brand-teal/40 hover:bg-brand-teal/5"
        }`}
      >
        <input
          id={`file-${nodeId}`}
          type="file"
          accept={fileAccept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            dragging ? "bg-brand-teal/15" : "bg-white"
          }`}
        >
          <UploadCloud
            className={`h-5 w-5 ${dragging ? "text-brand-teal" : "text-slate-400"}`}
          />
        </div>
        <p className="text-sm font-medium text-slate-600">
          <span className="text-brand-teal">Click to upload</span> or drag &amp;
          drop
        </p>
        <p className="text-[11px] text-slate-400">
          {label} · up to 10 MB
        </p>
      </div>
    </div>
  );
}

function SubmissionHistoryItem({
  sub,
  number,
}: {
  readonly sub: StudentTaskSubmission;
  readonly number: number;
}) {
  const parsed = parsePayload(sub.payload);

  return (
    <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm text-xs">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="font-bold text-slate-500">#{number}</span>
          <span>·</span>
          <span>
            {sub.submitted_at
              ? new Date(sub.submitted_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {sub.awarded_score != null && (
            <span className="px-1.5 py-0.5 rounded bg-brand-teal/10 text-brand-teal text-[9px] font-bold">
              {sub.awarded_score}/100
            </span>
          )}
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${statusBadgeCls(sub.status ?? "")}`}
          >
            {sub.status}
          </span>
        </div>
      </div>
      {/* Payload */}
      {Object.entries(parsed).map(([key, val]) => (
        <div key={key} className="mb-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">
            {PAYLOAD_LABELS[key] ?? key}:
          </span>
          <span className="text-slate-600 break-all line-clamp-2">
            {String(val)}
          </span>
        </div>
      ))}
      {sub.submission_file && (
        <a
          href={sub.submission_file}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-brand-teal hover:underline font-semibold"
        >
          <FileText className="h-3 w-3" /> View File
        </a>
      )}
      {sub.feedback && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Feedback:{" "}
          </span>
          <span className="text-slate-600 italic">"{sub.feedback}"</span>
        </div>
      )}
    </div>
  );
}
