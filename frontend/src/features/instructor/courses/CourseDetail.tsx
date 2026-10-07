// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import PageCard from "@/components/ui/PageCard";
import Modal from "@/components/ui/Modal";
import Dropdown from "@/components/ui/Dropdown";
import { showToast } from "@/lib/toastApi";
import { Layers, X, Pencil, Trash2 } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import { getStoredOrganizations } from "@/lib/auth";
import {
  deleteModuleNodeApi,
  getCourseByIdApi,
  getCourseModulesApi,
  getModuleNodesApi,
  updateModuleNodeApi,
  type ApiCourse,
  type ApiCourseModule,
  type ApiModuleNode,
} from "@/lib/api/organizations";
import {
  ProgramInner,
  type NodeEditModalState,
} from "./InstructorCourseBuilderProgramInner";
import {
  buildQuestionsInputJson,
  nodeHasContent,
  collectDescendantNodes,
} from "@/features/institute-admin/course-builder/courseBuilderHelpers";

function isRootModuleNode(n: ApiModuleNode): boolean {
  const pr = n.prerequisite_node;
  return pr == null || pr === undefined || Number(pr) <= 0;
}

export default function CourseDetail() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [loading, setLoading] = useState(true);

  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id;
    return id ? String(id) : "";
  }, []);

  const [apiModules, setApiModules] = useState<ApiCourseModule[]>([]);
  const [apiNodesByModule, setApiNodesByModule] = useState<
    Record<string, ApiModuleNode[]>
  >({});
  const [phaseDraftsByModule, setPhaseDraftsByModule] = useState<
    Record<
      string,
      Array<{ clientId: string; title: string; description: string }>
    >
  >({});

  const [programModalState, setProgramModalState] = useState<{
    moduleId: string;
    apiNodeId?: string;
    localDraftClientId?: string;
  } | null>(null);

  const [programForm, setProgramForm] = useState({
    title: "",
    description: "",
  });

  const [nodeEditLoading, setNodeEditLoading] = useState<number | null>(null);
  const [nodeEditModal, setNodeEditModal] = useState<NodeEditModalState | null>(
    null,
  );

  // Phase edit modal state
  const [phaseEditModal, setPhaseEditModal] = useState<{
    moduleId: string;
    nodeId: number;
    title: string;
    description: string;
  } | null>(null);
  const [phaseEditSaving, setPhaseEditSaving] = useState(false);

  // nodeEditModal rendering is handled in JSX below

  // Generic confirm dialog
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    confirmText: string;
    cancelText: string;
  }>({
    open: false,
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
  });
  const confirmResolveRef = useRef<null | ((value: boolean) => void)>(null);

  const requestConfirm = (
    message: string,
    confirmText = "OK",
    cancelText = "Cancel",
  ) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ open: true, message, confirmText, cancelText });
    });
  };

  const handleConfirmClose = (value: boolean) => {
    confirmResolveRef.current?.(value);
    confirmResolveRef.current = null;
    setConfirmModal((p) => ({ ...p, open: false }));
  };

  useEffect(() => {
    if (!orgId || !courseId) return;
    setLoading(true);
    getCourseByIdApi(orgId, courseId)
      .then(setCourse)
      .catch((err) => {
        showToast(
          err instanceof Error ? err.message : "Failed to load course.",
          "error",
        );
      })
      .finally(() => setLoading(false));

    fetchModules();
  }, [orgId, courseId]);

  const fetchModules = async () => {
    if (!orgId || !courseId) return;
    try {
      const mods = await getCourseModulesApi(orgId, courseId);
      setApiModules(mods);
      // Load nodes for each module
      mods.forEach((m) => fetchNodes(String(m.id)));
    } catch {
      setApiModules([]);
    }
  };

  const fetchNodes = async (moduleId: string | number) => {
    if (!orgId || !courseId || !moduleId) return;
    try {
      const nodes = await getModuleNodesApi(orgId, courseId, moduleId);
      setApiNodesByModule((p) => ({ ...p, [String(moduleId)]: nodes }));
    } catch {
      setApiNodesByModule((p) => ({ ...p, [String(moduleId)]: [] }));
    }
  };

  const openAddPhase = (moduleId: string) => {
    setProgramForm({ title: "", description: "" });
    setProgramModalState({ moduleId });
  };

  const handleSaveProgramDraft = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!programModalState) return;
    const title = programForm.title.trim();
    if (!title) {
      showToast("Phase title is required.", "warning");
      return;
    }
    const mid = programModalState.moduleId;
    const clientId = crypto.randomUUID();
    setPhaseDraftsByModule((prev) => ({
      ...prev,
      [mid]: [
        ...(prev[mid] ?? []),
        { clientId, title, description: programForm.description.trim() },
      ],
    }));
    setProgramModalState(null);
    showToast("Phase draft added.", "success");
  };

  const handlePhaseEditSave = async () => {
    if (!phaseEditModal || !orgId || !courseId) return;
    const title = phaseEditModal.title.trim();
    if (!title) {
      showToast("Phase title is required.", "warning");
      return;
    }
    setPhaseEditSaving(true);
    try {
      await updateModuleNodeApi(
        orgId,
        courseId,
        phaseEditModal.moduleId,
        phaseEditModal.nodeId,
        {
          title,
          description: phaseEditModal.description.trim() || "",
        },
      );
      await fetchNodes(phaseEditModal.moduleId);
      showToast("Phase updated.", "success");
      setPhaseEditModal(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update phase.",
        "error",
      );
    } finally {
      setPhaseEditSaving(false);
    }
  };

  const handlePhaseDelete = async (moduleId: string, nodeId: number) => {
    if (!(await requestConfirm("Delete this phase and all its items?"))) return;
    if (!orgId || !courseId) return;
    try {
      await deleteModuleNodeApi(orgId, courseId, moduleId, nodeId);
      await fetchNodes(moduleId);
      showToast("Phase deleted.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete phase.",
        "error",
      );
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading course curriculum...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center text-slate-500">Course not found.</div>
    );
  }

  if (course.status === "Archived") {
    return (
      <div className="w-full max-w-xl mx-auto mt-20 text-center animate-fade-in">
        <BackButton
          label="Back to Courses"
          onClick={() => navigate("/trainer/courses")}
        />
        <div className="mt-10 p-8 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 8v13H3V8" />
              <rect x="1" y="3" width="22" height="5" rx="1" />
              <path d="M10 12h4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Course Archived
          </h2>
          <p className="text-sm text-slate-500">
            This course has been archived and is no longer accessible. Contact
            your organization admin to restore it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <BackButton
        label="Back to Assigned Courses"
        onClick={() => navigate("/trainer/courses")}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 rounded-lg bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider">
              {course.status || "Draft"}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 truncate">
            {course.title}
          </h1>
          <p className="text-slate-500 mt-2 line-clamp-2 max-w-2xl">
            {course.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* Curriculum Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-teal" />
            Curriculum Builder
          </h2>
        </div>

        {apiModules.length === 0 ? (
          <PageCard title="No Modules">
            <div className="py-12 text-center">
              <Layers className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">
                No modules found. Start by adding a module above.
              </p>
            </div>
          </PageCard>
        ) : (
          apiModules.map((m, idx) => {
            const drafts = phaseDraftsByModule[String(m.id)] ?? [];
            const nodes = (apiNodesByModule[String(m.id)] ?? []).filter(
              isRootModuleNode,
            );

            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden border-l-4 border-l-brand-teal"
              >
                <div className="p-5 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {nodes.length} Phases • {drafts.length} Drafts
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Phase List */}
                  <div className="space-y-3">
                    {nodes.map((node) => {
                      // A root node carrying its own content is a regular item, not
                      // an empty chapter heading. Render it (and its full chain) as a
                      // flat list with no chapter header so nothing is hidden.
                      const moduleNodes = apiNodesByModule[String(m.id)] ?? [];
                      const isContentRoot = nodeHasContent(node);
                      const descendants = collectDescendantNodes(
                        node.id,
                        moduleNodes,
                      );
                      const childNodes = isContentRoot
                        ? [node, ...descendants]
                        : descendants;
                      return (
                        <div
                          key={node.id}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                        >
                          {!isContentRoot && (
                            <div className="flex items-start justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 leading-tight">
                                  {node.title}
                                </p>
                                {node.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {node.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhaseEditModal({
                                      moduleId: String(m.id),
                                      nodeId: node.id,
                                      title: node.title,
                                      description: node.description ?? "",
                                    })
                                  }
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-brand-teal hover:border-brand-teal/40 transition-colors"
                                  title="Edit phase"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePhaseDelete(String(m.id), node.id)
                                  }
                                  className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete phase"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="p-3">
                            <ProgramInner
                              programId={String(node.id)}
                              orgId={orgId}
                              effectiveCourseId={courseId}
                              apiCurriculum={{
                                orgId: orgId,
                                moduleId: String(m.id),
                                phaseNodeId: node.id,
                                nodesInModule: nodes.length,
                                refresh: () => fetchNodes(m.id),
                              }}
                              apiChildNodes={childNodes}
                              refresh={() => fetchNodes(m.id)}
                              requestConfirm={requestConfirm}
                              nodeEditLoading={nodeEditLoading}
                              setNodeEditLoading={setNodeEditLoading}
                              setNodeEditModal={setNodeEditModal}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Drafts */}
                    {drafts.map((d) => (
                      <ProgramInner
                        key={d.clientId}
                        programId={d.clientId}
                        orgId={orgId}
                        effectiveCourseId={courseId}
                        phaseTitle={d.title}
                        phaseDescription={d.description || undefined}
                        apiCurriculum={{
                          orgId: orgId,
                          moduleId: String(m.id),
                          phaseNodeId: null,
                          phaseDraft: {
                            title: d.title,
                            description: d.description,
                          },
                          localDraftClientId: d.clientId,
                          // First item POSTed under this draft creates the chapter
                          // node, then drops the local draft so the saved chapter
                          // (with its item) shows after the refetch.
                          onDraftCommitted: () =>
                            setPhaseDraftsByModule((p) => ({
                              ...p,
                              [String(m.id)]: (p[String(m.id)] ?? []).filter(
                                (x) => x.clientId !== d.clientId,
                              ),
                            })),
                          nodesInModule: nodes.length,
                          refresh: () => fetchNodes(m.id),
                        }}
                        refresh={() => fetchNodes(m.id)}
                        requestConfirm={requestConfirm}
                        nodeEditLoading={nodeEditLoading}
                        setNodeEditLoading={setNodeEditLoading}
                        setNodeEditModal={setNodeEditModal}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-slate-50">
                    <button
                      onClick={() => openAddPhase(String(m.id))}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border-2 border-brand-teal/30 text-brand-teal font-bold hover:bg-brand-teal/5 transition-all text-sm cursor-pointer"
                    >
                      + Add Phase
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}

      <Modal
        open={programModalState != null}
        onClose={() => setProgramModalState(null)}
      >
        <form onSubmit={handleSaveProgramDraft} className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b pb-4 mb-4">
            Add New Phase
          </h2>
          <div>
            <label
              htmlFor="phase-title"
              className="block text-sm font-bold text-slate-700 mb-1"
            >
              Phase Title
            </label>
            <input
              id="phase-title"
              autoFocus
              value={programForm.title}
              onChange={(e) =>
                setProgramForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="e.g. Introduction to React"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="phase-description"
              className="block text-sm font-bold text-slate-700 mb-1"
            >
              Description (Optional)
            </label>
            <textarea
              id="phase-description"
              value={programForm.description}
              onChange={(e) =>
                setProgramForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="What will learners achieve in this phase?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setProgramModalState(null)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-brand-teal text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-teal/20 cursor-pointer"
            >
              Add Phase Draft
            </button>
          </div>
        </form>
      </Modal>

      {/* Phase Edit Modal */}
      {phaseEditModal && (
        <Modal open onClose={() => setPhaseEditModal(null)} maxWidth="max-w-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4">
            Edit Phase
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phaseEditModal.title}
                onChange={(e) =>
                  setPhaseEditModal((p) =>
                    p ? { ...p, title: e.target.value } : p,
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
                placeholder="Phase title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={phaseEditModal.description}
                onChange={(e) =>
                  setPhaseEditModal((p) =>
                    p ? { ...p, description: e.target.value } : p,
                  )
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm resize-none"
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPhaseEditModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePhaseEditSave}
                disabled={phaseEditSaving}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-teal text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {phaseEditSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <Modal open={confirmModal.open} onClose={() => handleConfirmClose(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b pb-4 mb-4">
            Confirm Action
          </h2>
          <p className="text-slate-600">{confirmModal.message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => handleConfirmClose(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {confirmModal.cancelText}
            </button>
            <button
              onClick={() => handleConfirmClose(true)}
              className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 cursor-pointer"
            >
              {confirmModal.confirmText}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Resource/Content Modal ── */}
      {nodeEditModal &&
        nodeEditModal.nodeType !== "task" &&
        nodeEditModal.nodeType !== "quiz" && (
          <Modal
            open
            onClose={() => setNodeEditModal(null)}
            maxWidth="max-w-md"
          >
            <h2 className="text-base font-bold text-slate-800 mb-4">
              Edit item
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!orgId || !courseId) return;
                const title = nodeEditModal.title.trim();
                if (!title) {
                  showToast("Title is required.", "warning");
                  return;
                }
                try {
                  const urlProvided =
                    nodeEditModal.contentUrl.trim().length > 0;
                  await updateModuleNodeApi(
                    orgId,
                    courseId,
                    nodeEditModal.moduleId,
                    nodeEditModal.nodeId,
                    {
                      title,
                      description: nodeEditModal.description ?? "",
                      ...(nodeEditModal.contentType &&
                      nodeEditModal.contentType !==
                        nodeEditModal.originalContentType
                        ? {
                            learning_material_content_type:
                              nodeEditModal.contentType,
                          }
                        : {}),
                      ...(urlProvided
                        ? {
                            learning_material_content_url:
                              nodeEditModal.contentUrl.trim() || undefined,
                          }
                        : {}),
                      focus_areas: nodeEditModal.focusAreas.trim() || undefined,
                      quick_outline:
                        nodeEditModal.quickOutline.trim() || undefined,
                    },
                  );
                  await fetchNodes(nodeEditModal.moduleId);
                  showToast("Item updated.", "success");
                  setNodeEditModal(null);
                } catch (err) {
                  showToast(
                    err instanceof Error
                      ? err.message
                      : "Failed to update item.",
                    "error",
                  );
                }
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="node-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="node-title"
                  value={nodeEditModal.title}
                  onChange={(e) =>
                    setNodeEditModal((p) =>
                      p ? { ...p, title: e.target.value } : p,
                    )
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="node-description"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="node-description"
                  value={nodeEditModal.description}
                  onChange={(e) =>
                    setNodeEditModal((p) =>
                      p ? { ...p, description: e.target.value } : p,
                    )
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none min-h-[90px] text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <p className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </p>
                  <Dropdown
                    label=""
                    value={nodeEditModal.contentType}
                    options={[
                      { value: "link", label: "Link" },
                      { value: "video", label: "Video" },
                      { value: "pdf", label: "PDF" },
                      { value: "document", label: "Document" },
                    ]}
                    onChange={(v) =>
                      setNodeEditModal((p) =>
                        p ? { ...p, contentType: v } : p,
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="node-content-url"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {nodeEditModal.contentType === "link" ? "URL" : "File URL"}
                  </label>
                  <input
                    id="node-content-url"
                    value={nodeEditModal.contentUrl}
                    onChange={(e) =>
                      setNodeEditModal((p) =>
                        p ? { ...p, contentUrl: e.target.value } : p,
                      )
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="node-focus-areas"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  What should learners focus on?
                </label>
                <textarea
                  id="node-focus-areas"
                  value={nodeEditModal.focusAreas}
                  onChange={(e) =>
                    setNodeEditModal((p) =>
                      p ? { ...p, focusAreas: e.target.value } : p,
                    )
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none min-h-[72px] text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="node-outline"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Quick outline (optional)
                </label>
                <input
                  id="node-outline"
                  value={nodeEditModal.quickOutline}
                  onChange={(e) =>
                    setNodeEditModal((p) =>
                      p ? { ...p, quickOutline: e.target.value } : p,
                    )
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none text-sm"
                  placeholder="Example: What is Python? · Overview · Troubleshooting"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNodeEditModal(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </Modal>
        )}

      {/* ── Edit Task Modal ── */}
      {nodeEditModal?.nodeType === "task" && (
        <Modal open onClose={() => setNodeEditModal(null)} maxWidth="max-w-md">
          <h2 className="text-base font-bold text-slate-800 mb-4">Edit Task</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!orgId || !courseId) return;
              const taskTitle = nodeEditModal.taskTitle.trim();
              if (!taskTitle) {
                showToast("Title is required.", "warning");
                return;
              }
              const formats = SUBMISSION_FORMATS.filter((f) => {
                if (f.id === "link") return nodeEditModal.taskAllowLink;
                if (f.id === "paragraph")
                  return nodeEditModal.taskAllowParagraph;
                if (f.id === "pdf") return nodeEditModal.taskAllowPdf;
                if (f.id === "screenshot")
                  return nodeEditModal.taskAllowScreenshot;
                if (f.id === "codeblock")
                  return nodeEditModal.taskAllowCodeBlock;
                if (f.id === "file") return nodeEditModal.taskAllowFile;
                return false;
              });
              if (formats.length === 0) {
                showToast("Select at least one submission format.", "warning");
                return;
              }
              try {
                await updateModuleNodeApi(
                  orgId,
                  courseId,
                  nodeEditModal.moduleId,
                  nodeEditModal.nodeId,
                  {
                    title: taskTitle,
                    task_title: taskTitle,
                    task_allow_link: nodeEditModal.taskAllowLink,
                    task_allow_paragraph: nodeEditModal.taskAllowParagraph,
                    task_allow_pdf: nodeEditModal.taskAllowPdf,
                    task_allow_screenshot: nodeEditModal.taskAllowScreenshot,
                    task_allow_code_block: nodeEditModal.taskAllowCodeBlock,
                    task_allow_file: nodeEditModal.taskAllowFile,
                  },
                );
                await fetchNodes(nodeEditModal.moduleId);
                showToast("Task updated.", "success");
                setNodeEditModal(null);
              } catch (err) {
                showToast(
                  err instanceof Error ? err.message : "Failed to update task.",
                  "error",
                );
              }
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="task-edit-title"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Title
              </label>
              <input
                id="task-edit-title"
                value={nodeEditModal.taskTitle}
                onChange={(e) =>
                  setNodeEditModal((p) =>
                    p ? { ...p, taskTitle: e.target.value } : p,
                  )
                }
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div>
              <p className="block text-sm font-medium text-slate-700 mb-2">
                Submission formats
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SUBMISSION_FORMATS.map((f) => {
                  const checked =
                    f.id === "link"
                      ? nodeEditModal.taskAllowLink
                      : f.id === "paragraph"
                        ? nodeEditModal.taskAllowParagraph
                        : f.id === "pdf"
                          ? nodeEditModal.taskAllowPdf
                          : f.id === "screenshot"
                            ? nodeEditModal.taskAllowScreenshot
                            : f.id === "codeblock"
                              ? nodeEditModal.taskAllowCodeBlock
                              : nodeEditModal.taskAllowFile;
                  const key =
                    f.id === "link"
                      ? "taskAllowLink"
                      : f.id === "paragraph"
                        ? "taskAllowParagraph"
                        : f.id === "pdf"
                          ? "taskAllowPdf"
                          : f.id === "screenshot"
                            ? "taskAllowScreenshot"
                            : f.id === "codeblock"
                              ? "taskAllowCodeBlock"
                              : "taskAllowFile";
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 text-xs p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNodeEditModal((p) =>
                            p ? { ...p, [key]: !checked } : p,
                          )
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
              <button
                type="button"
                onClick={() => setNodeEditModal(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Quiz Drawer ── */}
      {nodeEditModal?.nodeType === "quiz" &&
        createPortal(
          <div className="fixed inset-0 z-[10000]">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
              onClick={() => setNodeEditModal(null)}
              aria-label="Close quiz drawer"
            />
            <dialog
              open
              className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl border-l border-slate-200 m-0 p-0 max-w-none flex flex-col"
              aria-modal="true"
            >
              <div className="h-full flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Edit Quiz
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Edit questions and options for this MCQ quiz.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNodeEditModal(null)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <div>
                    <label
                      htmlFor="quiz-edit-name"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Quiz name
                    </label>
                    <input
                      id="quiz-edit-name"
                      value={nodeEditModal.quizName}
                      onChange={(e) =>
                        setNodeEditModal((p) =>
                          p ? { ...p, quizName: e.target.value } : p,
                        )
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
                      placeholder="e.g. Python Basics Quiz"
                    />
                  </div>
                  <div className="space-y-4">
                    {nodeEditModal.quizQuestions.map((q, qi) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Question {qi + 1}
                          </p>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={q.multiSelect}
                                onChange={() =>
                                  setNodeEditModal((p) => {
                                    if (!p) return p;
                                    const qs = [...p.quizQuestions];
                                    qs[qi] = {
                                      ...qs[qi],
                                      multiSelect: !qs[qi].multiSelect,
                                      correctOptionIds: qs[
                                        qi
                                      ].correctOptionIds.slice(0, 1),
                                    };
                                    return { ...p, quizQuestions: qs };
                                  })
                                }
                                className="text-brand-teal focus:ring-brand-teal rounded"
                              />
                              <span className="text-xs text-slate-500 font-medium">
                                Multiple correct
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setNodeEditModal((p) =>
                                  p
                                    ? {
                                        ...p,
                                        quizQuestions: p.quizQuestions.filter(
                                          (_, i) => i !== qi,
                                        ),
                                      }
                                    : p,
                                )
                              }
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <input
                          value={q.text}
                          onChange={(e) =>
                            setNodeEditModal((p) => {
                              if (!p) return p;
                              const qs = [...p.quizQuestions];
                              qs[qi] = { ...qs[qi], text: e.target.value };
                              return { ...p, quizQuestions: qs };
                            })
                          }
                          placeholder="Question text"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none bg-white"
                        />
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-400">
                            {q.multiSelect
                              ? "Check all correct answers"
                              : "Select the correct answer"}
                          </p>
                          {q.options.map((opt, oi) => (
                            <div
                              key={opt.id}
                              className="flex items-center gap-2"
                            >
                              <input
                                type={q.multiSelect ? "checkbox" : "radio"}
                                name={`correct-${q.id}`}
                                checked={q.correctOptionIds.includes(opt.id)}
                                onChange={() =>
                                  setNodeEditModal((p) => {
                                    if (!p) return p;
                                    const qs = [...p.quizQuestions];
                                    const curr = qs[qi].correctOptionIds;
                                    const newIds = q.multiSelect
                                      ? curr.includes(opt.id)
                                        ? curr.filter((id) => id !== opt.id)
                                        : [...curr, opt.id]
                                      : [opt.id];
                                    qs[qi] = {
                                      ...qs[qi],
                                      correctOptionIds: newIds,
                                    };
                                    return { ...p, quizQuestions: qs };
                                  })
                                }
                                className="text-brand-teal focus:ring-brand-teal"
                                title="Mark as correct"
                              />
                              <input
                                value={opt.text}
                                onChange={(e) =>
                                  setNodeEditModal((p) => {
                                    if (!p) return p;
                                    const qs = [...p.quizQuestions];
                                    const opts = [...qs[qi].options];
                                    opts[oi] = {
                                      ...opts[oi],
                                      text: e.target.value,
                                    };
                                    qs[qi] = { ...qs[qi], options: opts };
                                    return { ...p, quizQuestions: qs };
                                  })
                                }
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none bg-white"
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNodeEditModal((p) => {
                                      if (!p) return p;
                                      const qs = [...p.quizQuestions];
                                      const opts = qs[qi].options.filter(
                                        (_, i) => i !== oi,
                                      );
                                      const validIds = qs[
                                        qi
                                      ].correctOptionIds.filter(
                                        (id) =>
                                          id !== opt.id &&
                                          opts.some((o) => o.id === id),
                                      );
                                      qs[qi] = {
                                        ...qs[qi],
                                        options: opts,
                                        correctOptionIds: validIds,
                                      };
                                      return { ...p, quizQuestions: qs };
                                    })
                                  }
                                  className="text-slate-400 hover:text-red-500 text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setNodeEditModal((p) => {
                                if (!p) return p;
                                const qs = [...p.quizQuestions];
                                const newOpt = {
                                  id: `o-${Date.now()}`,
                                  text: "",
                                };
                                qs[qi] = {
                                  ...qs[qi],
                                  options: [...qs[qi].options, newOpt],
                                };
                                return { ...p, quizQuestions: qs };
                              })
                            }
                            className="text-xs text-brand-teal hover:underline font-medium mt-1"
                          >
                            + Add option
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setNodeEditModal((p) => {
                          if (!p) return p;
                          const t = Date.now();
                          const opt0 = `o-${t}-0`;
                          const newQ = {
                            id: `q-${t}`,
                            text: "",
                            options: [
                              { id: opt0, text: "" },
                              { id: `o-${t}-1`, text: "" },
                            ],
                            correctOptionIds: [],
                            multiSelect: false,
                          };
                          return {
                            ...p,
                            quizQuestions: [...p.quizQuestions, newQ],
                          };
                        })
                      }
                      className="w-full py-2 rounded-xl border border-dashed border-brand-teal/40 text-brand-teal text-xs font-semibold hover:bg-brand-teal/5"
                    >
                      + Add question
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNodeEditModal(null)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!orgId || !courseId) return;
                      const quizName = nodeEditModal.quizName.trim();
                      if (!quizName) {
                        showToast("Quiz name is required.", "warning");
                        return;
                      }
                      if (nodeEditModal.quizQuestions.length === 0) {
                        showToast("Add at least one question.", "warning");
                        return;
                      }
                      const invalidQIdx = nodeEditModal.quizQuestions.findIndex(
                        (q) =>
                          !q.text.trim() ||
                          q.options.filter((o) => o.text.trim()).length < 2,
                      );
                      if (invalidQIdx >= 0) {
                        showToast(
                          `Question ${invalidQIdx + 1}: add question text and at least two options.`,
                          "warning",
                        );
                        return;
                      }
                      const noAnswerQIdx =
                        nodeEditModal.quizQuestions.findIndex((q) => {
                          const filled = q.options.filter((o) => o.text.trim());
                          return !filled.some((o) =>
                            q.correctOptionIds.includes(o.id),
                          );
                        });
                      if (noAnswerQIdx >= 0) {
                        showToast(
                          `Question ${noAnswerQIdx + 1}: select at least one correct answer.`,
                          "warning",
                        );
                        return;
                      }
                      try {
                        const questionsInput = buildQuestionsInputJson(
                          nodeEditModal.quizQuestions.map((q) => ({
                            text: q.text,
                            options: q.options.map((o) => o.text),
                            correctIndices: q.correctOptionIds
                              .map((id) =>
                                q.options.findIndex((o) => o.id === id),
                              )
                              .filter((i) => i >= 0),
                          })),
                        );
                        await updateModuleNodeApi(
                          orgId,
                          courseId,
                          nodeEditModal.moduleId,
                          nodeEditModal.nodeId,
                          {
                            title: quizName,
                            quiz_name: quizName,
                            questions_input: questionsInput,
                          },
                        );
                        await fetchNodes(nodeEditModal.moduleId);
                        showToast("Quiz updated.", "success");
                        setNodeEditModal(null);
                      } catch (err) {
                        showToast(
                          err instanceof Error
                            ? err.message
                            : "Failed to update quiz.",
                          "error",
                        );
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg"
                  >
                    Save Quiz
                  </button>
                </div>
              </div>
            </dialog>
          </div>,
          document.body,
        )}
    </div>
  );
}

const SUBMISSION_FORMATS = [
  { id: "link", label: "Link" },
  { id: "paragraph", label: "Paragraph" },
  { id: "pdf", label: "PDF" },
  { id: "screenshot", label: "Screenshot" },
  { id: "codeblock", label: "Code Block" },
  { id: "file", label: "File" },
];
