// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  Clock,
  AlertTriangle,
  BookOpen,
  Users,
  CheckCircle2,
  GraduationCap,
  ArrowLeft,
  ChevronDown,
  Play,
  CheckSquare,
  HelpCircle,
  FileText,
  User,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import { toTitleCase } from "@/lib/format";
import { getStoredOrganizations } from "@/lib/auth";
import {
  getBatchesOverviewApi,
  getBatchCoursesOverviewApi,
  getBatchCourseStudentsApi,
  getBatchStudentRoadmapApi,
  type ApiBatchOverview,
  type ApiBatchCourseOverview,
  type ApiBatchStudentOverview,
  type ApiBatchRoadmapModule,
  type ApiBatchRoadmapNode,
} from "@/lib/api/organizations";
import { showToast } from "@/lib/toastApi";

/* ── Helpers ── */

function useOrgId() {
  const id = getStoredOrganizations()[0]?.id;
  return id ? String(id) : "";
}

type ReviewStatus = "reviewed" | "pending" | "overdue" | "none";

function parseReviewStatus(s: string): ReviewStatus {
  const l = s?.toLowerCase().trim() ?? "";
  if (!l) return "none";
  if (l.includes("overdue")) return "overdue";
  if (l.includes("pending") || l.includes("awaiting")) return "pending";
  // "No Submissions" / "Not Started" — nothing has been submitted, so nothing to review.
  if (l.includes("no submission") || l.includes("not started")) return "none";
  return "reviewed";
}

/* ── Shared badge components ── */

function StatusBadge({ label }: { label: string }) {
  const status = parseReviewStatus(label);
  if (status === "overdue")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
        <AlertTriangle className="h-3 w-3" />
        {label || "Overdue"}
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <Clock className="h-3 w-3" />
        {label || "Awaiting Review"}
      </span>
    );
  if (status === "none")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
        <FileText className="h-3 w-3" />
        {label || "No Submissions"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-3 w-3" />
      {label || "Reviewed"}
    </span>
  );
}

type SortDir = "asc" | "desc";

function SortableHeader<T extends string>({
  label,
  field,
  activeField,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  field: T;
  activeField: T | null;
  dir: SortDir;
  onSort: (field: T) => void;
  align?: "left" | "center";
}) {
  const isActive = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 group/sort ${align === "center" ? "justify-center" : ""} ${
        isActive ? "text-brand-teal" : "text-slate-400 hover:text-slate-600"
      } transition-colors`}
      aria-label={`Sort by ${label} ${isActive && dir === "asc" ? "descending" : "ascending"}`}
    >
      {label}
      {isActive ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/sort:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

function ModuleProgress({ progress, pct }: { progress: string; pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const barColor =
    clamped >= 70
      ? "bg-emerald-500"
      : clamped >= 40
        ? "bg-amber-400"
        : "bg-red-400";
  const textColor =
    clamped >= 70
      ? "text-emerald-600"
      : clamped >= 40
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div
      className="min-w-36 space-y-1"
      title={`${clamped}% evaluated · ${progress} tasks evaluated`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className={`text-xs font-bold shrink-0 ${textColor}`}>
          {clamped}%
        </span>
      </div>
      <p className="text-[11px] text-slate-400">{progress} tasks evaluated</p>
    </div>
  );
}

/* ── Level 4: Roadmap panel ── */

function NodeTypeIcon({ type }: { type: string }) {
  const t = type?.toLowerCase();
  if (t === "material") return <Play className="h-4 w-4 text-indigo-400" />;
  if (t === "task") return <CheckSquare className="h-4 w-4 text-brand-teal" />;
  if (t === "quiz") return <HelpCircle className="h-4 w-4 text-amber-400" />;
  return <FileText className="h-4 w-4 text-slate-400" />;
}

function NodeStatusChip({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "completed")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  if (s === "submitted")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <Clock className="h-3 w-3" />
        Submitted
      </span>
    );
  if (s === "pending" || s === "pending review")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <Clock className="h-3 w-3" />
        Pending Review
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200">
      Not Started
    </span>
  );
}

function RoadmapNode({ node }: { node: ApiBatchRoadmapNode }) {
  return (
    <div className="relative flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="absolute -left-5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-slate-200" />
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          <NodeTypeIcon type={node.node_type} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {node.title}
          </p>
          <p className="text-[11px] text-slate-400 capitalize">
            {node.node_type}
          </p>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <NodeStatusChip status={node.status} />
        {(node.submitted_at || node.completed_at) && (
          <span className="text-[10px] text-slate-400">
            {node.submitted_at
              ? `Submitted ${new Date(node.submitted_at).toLocaleDateString()}`
              : `Completed ${new Date(node.completed_at!).toLocaleDateString()}`}
          </span>
        )}
      </div>
    </div>
  );
}

function RoadmapPanel({
  orgId,
  batchId,
  courseId,
  student,
  courseTitle,
  teachers,
  reviewStatus,
  onClose,
}: {
  orgId: string;
  batchId: number;
  courseId: number;
  student: ApiBatchStudentOverview;
  courseTitle: string;
  teachers: Array<{ id: number; name: string; email: string }>;
  reviewStatus: string;
  onClose: () => void;
}) {
  const [modules, setModules] = useState<ApiBatchRoadmapModule[]>([]);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  // Key of the request that last settled; loading until it matches the current student.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const requestKey = [orgId, batchId, courseId, student.student_id].join("|");
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    getBatchStudentRoadmapApi(orgId, batchId, courseId, student.student_id)
      .then((res) => {
        setModules(res.modules ?? []);
        if (res.modules?.[0]) setExpandedModule(res.modules[0].id);
      })
      .catch(() => showToast("Failed to load roadmap.", "error"))
      .finally(() => setLoadedKey(requestKey));
  }, [orgId, batchId, courseId, student.student_id, requestKey]);

  const trainerName = teachers[0]?.name ?? student.trainer_name;

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FBFA] overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-teal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Progress
        </button>
        <span className="text-xs text-slate-400 font-medium">
          Read-only · Org Admin view
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Student header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-brand-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-800">
                {toTitleCase(student.name)}
              </h2>
              <p className="text-sm text-slate-400">{student.email}</p>
            </div>
            <StatusBadge label={reviewStatus} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                Course
              </p>
              <p className="font-semibold text-slate-700">{courseTitle}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                Trainer
              </p>
              <p className="font-semibold text-slate-700">{trainerName}</p>
            </div>
          </div>
        </div>

        {/* Overdue alert */}
        {parseReviewStatus(reviewStatus) === "overdue" && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <p className="text-sm font-semibold">
              {reviewStatus} — trainer review required immediately.
            </p>
          </div>
        )}

        {/* Curriculum */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
          </div>
        ) : (
          <div className="space-y-4">
            {modules.length === 0 && (
              <p className="text-center text-slate-400 py-12">
                No curriculum modules found.
              </p>
            )}
            {modules.map((mod, idx) => {
              const isOpen = expandedModule === mod.id;
              const done = mod.nodes.filter(
                (n) => n.status?.toLowerCase() === "completed",
              ).length;
              return (
                <section key={mod.id} className="space-y-1.5">
                  <div className="flex items-center gap-3 px-1">
                    <span className="h-6 w-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      {mod.title} Phase
                    </h3>
                  </div>
                  <div
                    className={`bg-white rounded-2xl overflow-hidden shadow-sm ${isOpen ? "shadow-lg" : "hover:shadow-md"}`}
                  >
                    <button
                      onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isOpen ? "bg-brand-teal text-white shadow-md" : "bg-slate-50 text-slate-400"}`}
                        >
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-0.5 block">
                            Module Objective
                          </span>
                          <h4 className="text-sm font-semibold text-slate-800">
                            {mod.title}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">
                          {done}/{mod.nodes.length} done
                        </span>
                        <div
                          className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-brand-teal" : "text-slate-300"}`}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-0 bg-slate-50/20">
                        <div className="space-y-2 relative pl-8">
                          <div className="absolute left-3.25 top-2 bottom-2 w-px bg-slate-100" />
                          {mod.nodes.map((node) => (
                            <RoadmapNode key={node.id} node={node} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */

type View = "batches" | "courses" | "students";

export default function CourseProgress() {
  const orgId = useOrgId();

  const [view, setView] = useState<View>("batches");
  const [batches, setBatches] = useState<ApiBatchOverview[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState<ApiBatchOverview | null>(
    null,
  );
  const [courses, setCourses] = useState<ApiBatchCourseOverview[]>([]);
  const [batchName, setBatchName] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [selectedCourse, setSelectedCourse] =
    useState<ApiBatchCourseOverview | null>(null);
  const [students, setStudents] = useState<ApiBatchStudentOverview[]>([]);
  const [teachers, setTeachers] = useState<
    Array<{ id: number; name: string; email: string }>
  >([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [roadmapStudent, setRoadmapStudent] =
    useState<ApiBatchStudentOverview | null>(null);
  const [batchSearch, setBatchSearch] = useState("");
  const [batchSortField, setBatchSortField] = useState<
    "batch" | "period" | null
  >(null);
  const [batchSortDir, setBatchSortDir] = useState<SortDir>("asc");

  const toggleBatchSort = (field: "batch" | "period") => {
    if (batchSortField === field) {
      setBatchSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setBatchSortField(field);
      setBatchSortDir("asc");
    }
  };

  /* ── Fetch level 1 ── */
  useEffect(() => {
    if (!orgId) return;
    setBatchesLoading(true);
    getBatchesOverviewApi(orgId)
      .then(setBatches)
      .catch(() => showToast("Failed to load batches.", "error"))
      .finally(() => setBatchesLoading(false));
  }, [orgId]);

  /* ── Level 2: click a batch ── */
  const handleBatchClick = useCallback(
    async (batch: ApiBatchOverview) => {
      setSelectedBatch(batch);
      setView("courses");
      setCoursesLoading(true);
      try {
        const res = await getBatchCoursesOverviewApi(orgId, batch.id);
        setCourses(res.courses ?? []);
        setBatchName(res.batch_name);
      } catch {
        showToast("Failed to load courses.", "error");
      } finally {
        setCoursesLoading(false);
      }
    },
    [orgId],
  );

  /* ── Level 3: click a course ── */
  const handleCourseClick = useCallback(
    async (course: ApiBatchCourseOverview) => {
      if (!selectedBatch) return;
      setSelectedCourse(course);
      setView("students");
      setStudentsLoading(true);
      try {
        const res = await getBatchCourseStudentsApi(
          orgId,
          selectedBatch.id,
          course.id,
        );
        setStudents(res.students ?? []);
        setTeachers(res.teachers ?? []);
      } catch {
        showToast("Failed to load students.", "error");
      } finally {
        setStudentsLoading(false);
      }
    },
    [orgId, selectedBatch],
  );

  const goBack = () => {
    if (view === "students") {
      setView("courses");
      setSelectedCourse(null);
    } else if (view === "courses") {
      setView("batches");
      setSelectedBatch(null);
      setCourses([]);
    }
  };

  // Prefer the course's teacher roster; fall back to the per-student trainer name.
  const trainerLabel =
    teachers
      .map((t) => t.name)
      .filter(Boolean)
      .join(", ") ||
    students[0]?.trainer_name ||
    "";

  const totalOverdue =
    view === "courses"
      ? courses.reduce((s, c) => s + (c.overdue_reviews_count ?? 0), 0)
      : students.filter((s) => parseReviewStatus(s.review_status) === "overdue")
          .length;

  /* ── Roadmap panel overlay ── */
  if (roadmapStudent && selectedCourse && selectedBatch) {
    return (
      <RoadmapPanel
        orgId={orgId}
        batchId={selectedBatch.id}
        courseId={selectedCourse.id}
        student={roadmapStudent}
        courseTitle={selectedCourse.title}
        teachers={teachers}
        reviewStatus={roadmapStudent.review_status}
        onClose={() => setRoadmapStudent(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header + breadcrumb */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-2">
          {view !== "batches" && (
            <BackButton
              label={
                view === "courses"
                  ? "Batches"
                  : batchName || selectedBatch?.name || "Back"
              }
              onClick={goBack}
            />
          )}
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {view === "batches" && "Course Progress & Review"}
            {view === "courses" && (batchName || selectedBatch?.name)}
            {view === "students" && selectedCourse?.title}
          </h1>
        </div>

        {/* Search — batches level only */}
        {view === "batches" && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              placeholder="Search batches…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none bg-white"
            />
          </div>
        )}
      </div>

      {/* Overdue alert */}
      {totalOverdue > 0 && view !== "batches" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-semibold">
            {totalOverdue} {view === "courses" ? "course" : "student"}{" "}
            submission{totalOverdue > 1 ? "s" : ""} pending review for more than
            2 days — trainer action required.
          </p>
        </div>
      )}

      {/* ── LEVEL 1: BATCHES ── */}
      {view === "batches" &&
        (() => {
          if (batchesLoading)
            return (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
              </div>
            );
          const filteredBatches = batches.filter((b) =>
            b.name.toLowerCase().includes(batchSearch.toLowerCase()),
          );
          if (batches.length === 0)
            return (
              <p className="text-center text-slate-400 py-16">
                No batches found.
              </p>
            );
          if (filteredBatches.length === 0)
            return (
              <p className="text-center text-slate-400 py-16">
                No batches match "
                <span className="font-medium text-slate-600">
                  {batchSearch}
                </span>
                ".
              </p>
            );
          const fmtDate = (d?: string | null) => {
            if (!d) return null;
            return new Date(d).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          };
          const sortedBatches = batchSortField
            ? [...filteredBatches].sort((a, b) => {
                let cmp = 0;
                if (batchSortField === "batch") {
                  cmp = a.name.localeCompare(b.name);
                } else {
                  const aTime = a.start_date
                    ? new Date(a.start_date).getTime()
                    : -Infinity;
                  const bTime = b.start_date
                    ? new Date(b.start_date).getTime()
                    : -Infinity;
                  cmp = aTime - bTime;
                }
                return batchSortDir === "asc" ? cmp : -cmp;
              })
            : filteredBatches;
          return (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {/* Summary bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs text-slate-500 font-medium">
                  {filteredBatches.length}{" "}
                  {filteredBatches.length === 1 ? "batch" : "batches"}
                  {batchSearch && ` matching "${batchSearch}"`}
                </p>
                <p className="text-xs text-slate-400">
                  {filteredBatches.filter((b) => b.is_active).length} active
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40">
                      <th className="text-left py-2.5 px-5 text-[11px] font-semibold uppercase tracking-wider">
                        <SortableHeader
                          label="Batch"
                          field="batch"
                          activeField={batchSortField}
                          dir={batchSortDir}
                          onSort={toggleBatchSort}
                        />
                      </th>
                      <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider">
                        <SortableHeader
                          label="Period"
                          field="period"
                          activeField={batchSortField}
                          dir={batchSortDir}
                          onSort={toggleBatchSort}
                        />
                      </th>
                      <th className="text-center py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Courses
                      </th>
                      <th className="text-center py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="text-center py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Overdue Reviews
                      </th>
                      <th className="py-2.5 px-4 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedBatches.map((batch) => {
                      const overdue = batch.overdue_reviews_count ?? 0;
                      const isActive = batch.is_active;
                      return (
                        <tr
                          key={batch.id}
                          onClick={() => handleBatchClick(batch)}
                          className="hover:bg-brand-teal/[0.03] cursor-pointer group transition-colors"
                        >
                          {/* Batch name + date as subtitle */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-brand-teal/10" : "bg-slate-100"}`}
                              >
                                <GraduationCap
                                  className={`h-4 w-4 ${isActive ? "text-brand-teal" : "text-slate-400"}`}
                                />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-[13px] group-hover:text-brand-teal transition-colors leading-snug">
                                  {batch.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* Period */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {batch.start_date || batch.end_date ? (
                              <div className="text-[12px] text-slate-500 leading-snug">
                                <span>{fmtDate(batch.start_date) ?? "?"}</span>
                                <span className="text-slate-300 mx-1.5">→</span>
                                <span>{fmtDate(batch.end_date) ?? "?"}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          {/* Courses */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg">
                              <BookOpen className="h-3.5 w-3.5" />
                              <span className="text-[12px] font-bold">
                                {batch.courses_count}
                              </span>
                            </div>
                          </td>
                          {/* Students */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-[12px] font-bold">
                                {batch.students_count}
                              </span>
                            </div>
                          </td>
                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                              />
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {/* Overdue */}
                          <td className="py-3 px-4 text-center">
                            {overdue > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-500">
                                <AlertTriangle className="h-3 w-3" />
                                {overdue} overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-50 text-slate-400">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                All clear
                              </span>
                            )}
                          </td>
                          {/* Arrow */}
                          <td className="py-3 px-4 text-right">
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      {/* ── LEVEL 2: COURSES ── */}
      {view === "courses" &&
        (coursesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
          </div>
        ) : courses.length === 0 ? (
          <p className="text-center text-slate-400 py-16">
            No courses in this batch.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => handleCourseClick(course)}
                className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-teal hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                  </div>
                  {(course.overdue_reviews_count ?? 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                      <AlertTriangle className="h-3 w-3" />
                      {course.overdue_reviews_count} overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      All reviewed
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-[15px] mb-1 group-hover:text-brand-teal transition-colors">
                  {course.title}
                </h3>
                {course.trainer_name && (
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Trainer:{" "}
                    {course.trainer_name}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {course.students_enrolled_count} enrolled
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-brand-teal transition-colors">
                    <span>View students</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}

      {/* ── LEVEL 3: STUDENTS ── */}
      {view === "students" &&
        selectedCourse &&
        (studentsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
          </div>
        ) : (
          <div>
            {/* Course meta */}
            <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 flex-wrap">
              {trainerLabel && (
                <>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" /> Trainer:{" "}
                    <strong className="text-slate-800">{trainerLabel}</strong>
                  </span>
                  <span className="text-slate-200">|</span>
                </>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                {students.length} enrolled
              </span>
            </div>

            {students.length === 0 ? (
              <p className="text-center text-slate-400 py-16">
                No students enrolled in this course.
              </p>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Student
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Course
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Trainer
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Progress
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Review Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const rs = parseReviewStatus(student.review_status);
                        return (
                          <tr
                            key={student.student_id}
                            onClick={() => setRoadmapStudent(student)}
                            className={`border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/50 ${rs === "overdue" ? "bg-red-50/30" : ""}`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-brand-teal flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {(student.name?.[0] ?? "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800 text-[13px]">
                                    {toTitleCase(student.name)}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {student.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 text-[13px]">
                              {student.course_title}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 text-[13px]">
                              {student.trainer_name}
                            </td>
                            <td className="py-3.5 px-4">
                              <ModuleProgress
                                progress={student.progress}
                                pct={student.evaluation_percentage ?? 0}
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge label={student.review_status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
