// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type {
  Dispatch,
  RefObject,
  SetStateAction,
  SyntheticEvent,
} from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ResourceContentField, {
  type ResourceContentType,
} from "@/components/course/ResourceContentField";
import type { SubmissionFormat } from "../store";
import {
  SUBMISSION_FORMATS,
  type NodeEditModalState,
} from "./courseBuilderProgramHelpers";

/** Maps a submission format id to its boolean field on {@link NodeEditModalState}. */
const TASK_FORMAT_FIELDS = {
  link: "taskAllowLink",
  paragraph: "taskAllowParagraph",
  pdf: "taskAllowPdf",
  screenshot: "taskAllowScreenshot",
  codeblock: "taskAllowCodeBlock",
  file: "taskAllowFile",
} as const satisfies Record<SubmissionFormat, keyof NodeEditModalState>;

const TEXTAREA_CLASS =
  "w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm";

export type ProgramModalState = {
  moduleId: string;
  apiNodeId?: string;
  localDraftClientId?: string;
  /** Local “no levels” course program id */
  flatProgramId?: string;
};

export type ProgramForm = { title: string; description: string };

export type LevelEditModalState = {
  moduleId: number;
  courseId: string | number;
  prevTitle: string;
  title: string;
};

function programModalTitle(s: ProgramModalState): string {
  if (s.apiNodeId) return "Edit Chapter";
  if (s.localDraftClientId) return "Edit draft chapter";
  if (s.flatProgramId) return "Edit Chapter";
  return "Add Chapter";
}

function programSaveLabel(s: ProgramModalState): string {
  return s.localDraftClientId || s.flatProgramId || s.apiNodeId
    ? "Save"
    : "Add";
}

// ── Add / Edit Chapter (program) ──────────────────────────────────────────
export function ProgramModal({
  state,
  form,
  onChange,
  onSubmit,
  onClose,
}: Readonly<{
  state: ProgramModalState;
  form: ProgramForm;
  onChange: Dispatch<SetStateAction<ProgramForm>>;
  onSubmit: (e: SyntheticEvent) => void;
  onClose: () => void;
}>) {
  return (
    <Modal open onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-base font-bold text-slate-800 mb-4">
        {programModalTitle(state)}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="phase-title"
          label="Chapter Title"
          value={form.title}
          onChange={(e) => onChange((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <div>
          <label
            htmlFor="phase-description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="phase-description"
            value={form.description}
            onChange={(e) =>
              onChange((p) => ({ ...p, description: e.target.value }))
            }
            className={`${TEXTAREA_CLASS} min-h-[90px]`}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {programSaveLabel(state)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Level ─────────────────────────────────────────────────────────────
export function LevelEditModal({
  state,
  setState,
  onSubmit,
  onClose,
}: Readonly<{
  state: LevelEditModalState;
  setState: Dispatch<SetStateAction<LevelEditModalState | null>>;
  onSubmit: (e: SyntheticEvent) => void;
  onClose: () => void;
}>) {
  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4">Edit level</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="level-name"
          label="Level name"
          value={state.title}
          onChange={(e) =>
            setState((p) => (p ? { ...p, title: e.target.value } : p))
          }
        />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Update level
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Content Item ──────────────────────────────────────────────────────
export function NodeEditContentModal({
  state,
  setState,
  onSubmit,
  onClose,
}: Readonly<{
  state: NodeEditModalState;
  setState: Dispatch<SetStateAction<NodeEditModalState | null>>;
  onSubmit: (e: SyntheticEvent) => void;
  onClose: () => void;
}>) {
  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4">Edit item</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="node-title"
          label="Title"
          value={state.title}
          onChange={(e) =>
            setState((p) => (p ? { ...p, title: e.target.value } : p))
          }
        />
        <div>
          <label
            htmlFor="node-description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="node-description"
            value={state.description}
            onChange={(e) =>
              setState((p) => (p ? { ...p, description: e.target.value } : p))
            }
            className={`${TEXTAREA_CLASS} min-h-[90px]`}
          />
        </div>
        <ResourceContentField
          idPrefix="node-content"
          type={state.contentType as ResourceContentType}
          onTypeChange={(v) =>
            setState((p) => (p ? { ...p, contentType: v } : p))
          }
          url={state.contentUrl}
          onUrlChange={(url) =>
            setState((p) => (p ? { ...p, contentUrl: url } : p))
          }
        />
        <div>
          <label
            htmlFor="node-focus-areas"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            What should learners focus on?
          </label>
          <textarea
            id="node-focus-areas"
            value={state.focusAreas}
            onChange={(e) =>
              setState((p) => (p ? { ...p, focusAreas: e.target.value } : p))
            }
            className={`${TEXTAREA_CLASS} min-h-[72px]`}
          />
        </div>
        <Input
          id="node-outline"
          label="Quick outline (optional)"
          value={state.quickOutline}
          onChange={(e) =>
            setState((p) => (p ? { ...p, quickOutline: e.target.value } : p))
          }
          placeholder="Example: What is Python? · Overview · Troubleshooting"
        />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Task ──────────────────────────────────────────────────────────────
export function NodeEditTaskModal({
  state,
  setState,
  newFile,
  setNewFile,
  fileInputRef,
  onSubmit,
  onClose,
}: Readonly<{
  state: NodeEditModalState;
  setState: Dispatch<SetStateAction<NodeEditModalState | null>>;
  newFile: File | null;
  setNewFile: Dispatch<SetStateAction<File | null>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (e: SyntheticEvent) => void;
  onClose: () => void;
}>) {
  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base font-bold text-slate-800 mb-4">Edit Task</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="task-edit-title"
          label="Title"
          value={state.taskTitle}
          onChange={(e) =>
            setState((p) => (p ? { ...p, taskTitle: e.target.value } : p))
          }
        />
        <div>
          <label
            htmlFor="task-edit-desc"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="task-edit-desc"
            rows={3}
            value={state.taskDescription}
            onChange={(e) =>
              setState((p) =>
                p ? { ...p, taskDescription: e.target.value } : p,
              )
            }
            placeholder="Instructions or details for students…"
            className={`${TEXTAREA_CLASS} resize-none`}
          />
        </div>
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-1">
            Attachment{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {newFile
                ? "Change file"
                : state.taskAttachmentUrl
                  ? "Replace file"
                  : "Choose file"}
            </Button>
            {newFile ? (
              <span className="text-xs text-slate-500 truncate max-w-[180px]">
                {newFile.name}
              </span>
            ) : state.taskAttachmentUrl ? (
              <a
                href={state.taskAttachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-teal truncate max-w-[180px] hover:underline"
              >
                View current file →
              </a>
            ) : null}
          </div>
        </div>
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-2">
            Submission formats
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SUBMISSION_FORMATS.map((f) => {
              const field = TASK_FORMAT_FIELDS[f.id];
              const checked = Boolean(state[field]);
              return (
                <label
                  key={f.id}
                  className="flex items-center gap-2 text-xs p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setState((p) => (p ? { ...p, [field]: !checked } : p))
                    }
                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                  />
                  <span>{f.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Generic confirm dialog ─────────────────────────────────────────────────
export function ConfirmModal({
  open,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: Readonly<{
  open: boolean;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-sm">
      <h2 className="text-base font-bold text-slate-800 mb-3">
        Confirm action
      </h2>
      <p className="text-sm text-slate-600 mb-4">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  );
}
