// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, Lock, Award, Download, Eye } from "lucide-react";
import {
  getCourseRoadmapApi,
  type ApiEnrolledCourse,
  type ApiRoadmapModule,
  type ApiRoadmapNode,
} from "@/lib/api/organizations";
import {
  getCourseCertificateApi,
  type ApiCertificate,
} from "@/lib/api/certificates";
import { getStoredOrganizations } from "@/lib/auth";
import { showToast } from "@/lib/toastApi";
import BackButton from "@/components/ui/BackButton";
import ExpandableText from "@/components/ui/ExpandableText";
import RoadmapSkeleton from "@/components/course/RoadmapSkeleton";
import { getMeta } from "./courseMeta";
import CurriculumSection from "./CurriculumSection";
import RoadmapChapters from "./RoadmapChapters";
import CourseCompletionModal from "./CourseCompletionModal";
import CertificateModal from "@/components/certificate/CertificateModal";

type DoneMap = Record<number, boolean>;

const completableNodes = (nodes: ApiRoadmapNode[]) =>
  nodes.filter((n) => !getMeta(n).isHeading);

/** A node counts as done if completed server-side or locally this session. */
const isNodeDoneAnywhere = (n: ApiRoadmapNode, localDone: DoneMap) => {
  const meta = getMeta(n);
  if (meta.isHeading) return true; // headings can't be completed, don't block unlock
  return meta.isDone || !!localDone[n.id];
};

/**
 * A module unlocks when the server marks it accessible. The roadmap endpoint now
 * reports `is_accessible` per module (prerequisites satisfied) — trust it when
 * present. When the field is absent (older responses) fall back to the legacy
 * sequential rule: the previous module is fully done, or this one has progress.
 */
const isModuleLocked = (
  modules: ApiRoadmapModule[],
  idx: number,
  localDone: DoneMap,
) => {
  if (idx === 0) return false;

  const module = modules[idx];
  if (module.is_accessible !== undefined) return !module.is_accessible;

  const prev = completableNodes(modules[idx - 1].nodes);
  const isPrevModuleDone =
    prev.length > 0 && prev.every((n) => isNodeDoneAnywhere(n, localDone));
  const moduleHasProgress = completableNodes(module.nodes).some((n) =>
    isNodeDoneAnywhere(n, localDone),
  );
  return !isPrevModuleDone && !moduleHasProgress;
};

export default function DetailedRoadmap({
  id,
  course,
  onExit,
}: {
  readonly id: string;
  readonly course?: ApiEnrolledCourse;
  readonly onExit: () => void;
}) {
  const [data, setData] = useState<ApiRoadmapModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  // Tracks nodes marked done in this session (before API re-fetch returns updated data)
  const [localDone, setLocalDone] = useState<DoneMap>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [certificate, setCertificate] = useState<ApiCertificate | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);
  // Course id the completion modal has already been evaluated for, so it is
  // announced at most once per course even as `data`/`localDone` keep changing.
  const [completionAnnouncedFor, setCompletionAnnouncedFor] = useState<
    string | null
  >(null);

  const orgId = getStoredOrganizations()[0]?.id?.toString() || "1";

  useEffect(() => {
    getCourseRoadmapApi(orgId, id)
      .then((res) => {
        setData(res.modules || []);
        if (res.modules?.[0]) {
          setExpandedId((prev) => prev || res.modules[0].id);
        }
      })
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : "Failed to load course.", "error");
      })
      .finally(() => setLoading(false));
  }, [id, tick, orgId]);

  // Compute from actual completable nodes so empty modules don't inflate/deflate %
  const allCompletable = data
    .flatMap((m) => m.nodes)
    .filter((n) => !getMeta(n).isHeading);
  const allDoneCount = allCompletable.filter(
    (n) => getMeta(n).isDone || !!localDone[n.id],
  ).length;

  const isCourseDone =
    allCompletable.length > 0 && allDoneCount === allCompletable.length;

  // Surface the completion modal once per course, the first time every
  // completable node is done (server-confirmed or marked this session).
  if (isCourseDone && completionAnnouncedFor !== id) {
    setCompletionAnnouncedFor(id);
    const seenKey = `course-completion-seen:${id}`;
    try {
      if (
        typeof window !== "undefined" &&
        window.localStorage?.getItem &&
        !window.localStorage.getItem(seenKey)
      ) {
        window.localStorage.setItem(seenKey, "1");
        setShowCompletionModal(true);
      }
    } catch {
      setShowCompletionModal(true);
    }
  }

  // Load certificate when course is complete
  useEffect(() => {
    if (isCourseDone) {
      getCourseCertificateApi(orgId, id)
        .then((cert) => setCertificate(cert))
        .catch(() => {});
    }
  }, [isCourseDone, orgId, id]);

  if (!course) return null;

  // Show the skeleton only on the first load (no data yet); background re-fetches
  // triggered by `tick` keep the already-rendered roadmap in place.
  if (loading && data.length === 0) return <RoadmapSkeleton />;

  const pct =
    allCompletable.length > 0
      ? String(Math.round((allDoneCount / allCompletable.length) * 100))
      : String(Math.round(Number.parseFloat(course.completion_percentage)));

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-in slide-in-from-bottom-4 duration-700">
      <BackButton label="Back to Courses" onClick={onExit} />

      {/* Simplified Status Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5 overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-start gap-4 relative z-10">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-semibold uppercase tracking-widest">
              Ongoing Course
            </span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase">
              {course.title}
            </h2>
            <ExpandableText
              text={course.description}
              maxLength={200}
              className="text-slate-600 text-sm font-medium italic"
            />
          </div>
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="text-xl font-bold text-slate-800 tracking-tighter leading-none">
              {pct}
            </span>
            <span className="text-xs font-semibold text-slate-300">%</span>
          </div>
        </div>
        <div className="space-y-2 relative z-10 p-4 bg-slate-50/50 rounded-xl">
          <div className="flex justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
            <span>Overall progress</span>
            <span className="text-brand-teal">{pct}% achieved</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-brand-teal rounded-full shadow-sm transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Certificate Completion Banner ── */}
      {isCourseDone && (
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-teal text-white flex items-center justify-center shrink-0 shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Course Completed!
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  100% Certified
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Your certificate of completion has been issued and is available to view and download.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCertModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              View Certificate
            </button>
            <button
              type="button"
              onClick={() => {
                setCertModalOpen(true);
                setTimeout(() => window.print(), 300);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-teal text-xs font-semibold text-white hover:bg-brand-teal/90 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Curriculum Phases */}
      <div className="space-y-8 pb-20">
        {data.map((m, idx) => (
          <RoadmapModule
            key={m.id}
            module={m}
            index={idx}
            orgId={orgId}
            courseId={id}
            isLocked={isModuleLocked(data, idx, localDone)}
            isExpanded={expandedId === m.id}
            localDone={localDone}
            onToggle={() =>
              setExpandedId(expandedId === m.id ? null : m.id)
            }
            onNodeDone={(nid) =>
              setLocalDone((prev) => ({ ...prev, [nid]: true }))
            }
            onUpdated={() => setTick((t) => t + 1)}
          />
        ))}
      </div>

      <CourseCompletionModal
        open={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        courseTitle={course.title}
        onViewCertificate={() => setCertModalOpen(true)}
      />

      <CertificateModal
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        certificate={certificate}
      />
    </div>
  );
}

function RoadmapModule({
  module: m,
  index,
  orgId,
  courseId,
  isLocked,
  isExpanded,
  localDone,
  onToggle,
  onNodeDone,
  onUpdated,
}: {
  readonly module: ApiRoadmapModule;
  readonly index: number;
  readonly orgId: string;
  readonly courseId: string;
  readonly isLocked: boolean;
  readonly isExpanded: boolean;
  readonly localDone: DoneMap;
  readonly onToggle: () => void;
  readonly onNodeDone: (nid: number) => void;
  readonly onUpdated: () => void;
}) {
  let iconBgCls = "bg-slate-50 text-slate-300";
  if (isLocked) iconBgCls = "bg-slate-100 text-slate-300";
  else if (isExpanded)
    iconBgCls = "bg-brand-teal text-white shadow-brand-teal/20 shadow-md";

  let containerCls = "shadow-sm hover:shadow-md";
  if (isLocked) containerCls = "opacity-60 cursor-not-allowed group";
  else if (isExpanded) containerCls = "shadow-lg";

  const label = isLocked ? "Locked Phase" : "Module Objective";

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <span className="h-6 w-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shadow-md">
          0{index + 1}
        </span>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {m.title} PHASE
        </h3>
      </div>

      <div
        className={`bg-white rounded-2xl overflow-hidden transition-all duration-500 ${containerCls}`}
      >
        <button
          onClick={() => {
            if (!isLocked) onToggle();
          }}
          data-testid="module-btn"
          disabled={isLocked}
          className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${iconBgCls}`}
            >
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-0.5 block">
                {label}
              </span>
              <h4 className="text-sm font-semibold text-slate-800 tracking-tight">
                {m.title}
              </h4>
            </div>
          </div>
          {isLocked ? null : (
            <div
              className={`transition-all duration-500 ${isExpanded ? "rotate-180 text-brand-teal" : "text-slate-300"}`}
            >
              <ChevronDown className="h-5 w-5" />
            </div>
          )}
        </button>

        {isExpanded && !isLocked && (
          <div className="p-5 pt-0 bg-slate-50/20 rounded-b-2xl">
            {m.chapters && m.chapters.length > 0 ? (
              <RoadmapChapters
                module={m}
                orgId={orgId}
                courseId={courseId}
                moduleId={String(m.id)}
                localDone={localDone}
                onNodeDone={onNodeDone}
                onUpdated={onUpdated}
              />
            ) : (
              <CurriculumSection
                nodes={m.nodes}
                orgId={orgId}
                courseId={courseId}
                moduleId={String(m.id)}
                localDone={localDone}
                onNodeDone={onNodeDone}
                onUpdated={onUpdated}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
