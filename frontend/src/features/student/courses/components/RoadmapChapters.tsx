// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import type { ApiRoadmapModule, ApiRoadmapNode } from "@/lib/api/organizations";
import { getMeta } from "./courseMeta";
import CurriculumSection from "./CurriculumSection";

type SectionProps = Readonly<{
  orgId: string;
  courseId: string;
  moduleId: string;
  localDone: Record<number, boolean>;
  onNodeDone: (nid: number) => void;
  onUpdated: () => void;
}>;

type ChapterGroup = {
  key: string;
  chapter: NonNullable<ApiRoadmapModule["chapters"]>[number] | null;
  nodes: ApiRoadmapNode[];
  /** 1-based chapter number shown on the card. */
  number: number;
  /** Last item before this group in the level, which gates its first item. */
  precedingNode: ApiRoadmapNode | null;
};

/** Nodes outside any chapter first, then one group per chapter in chapter order. */
function groupByChapter(module: ApiRoadmapModule): ChapterGroup[] {
  const chapters = module.chapters ?? [];
  const known = new Set(chapters.map((c) => c.id));
  const loose = module.nodes.filter((n) => n.chapter == null || !known.has(n.chapter));
  const groups: ChapterGroup[] = [];
  let previous: ApiRoadmapNode | null = null;
  if (loose.length > 0) {
    groups.push({ key: "loose", chapter: null, nodes: loose, number: 0, precedingNode: null });
    previous = loose.at(-1) ?? null;
  }
  chapters.forEach((c, idx) => {
    const nodes = module.nodes.filter((n) => n.chapter === c.id);
    groups.push({ key: `chapter-${c.id}`, chapter: c, nodes, number: idx + 1, precedingNode: previous });
    previous = nodes.at(-1) ?? previous;
  });
  return groups;
}

function ChapterCard({
  group,
  ...section
}: SectionProps & { readonly group: ChapterGroup }) {
  const [open, setOpen] = useState(true);
  const chapter = group.chapter;
  const completable = group.nodes.filter((n) => !getMeta(n).isHeading);
  const done = completable.filter((n) => getMeta(n).isDone || section.localDone[n.id]).length;
  const allDone = completable.length > 0 && done === completable.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid="roadmap-chapter">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-slate-50/60 hover:bg-slate-50 cursor-pointer"
      >
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-brand-teal uppercase tracking-widest">
            Chapter {group.number}
          </span>
          <h5 className="text-sm font-bold text-slate-800 leading-tight">{chapter?.title}</h5>
          {chapter?.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{chapter.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Chapter completed" />
          ) : null}
          <span className="text-[11px] font-semibold text-slate-400">
            {done}/{completable.length} done
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="px-2 pb-2">
          <CurriculumSection
            nodes={group.nodes}
            precedingNode={group.precedingNode}
            emptyText="No items in this chapter yet."
            {...section}
          />
        </div>
      )}
    </div>
  );
}

/** A level's items split into chapter cards, unlocking in order across chapters. */
export default function RoadmapChapters({
  module,
  ...section
}: SectionProps & { readonly module: ApiRoadmapModule }) {
  return (
    <div className="space-y-3 pt-1">
      {groupByChapter(module).map((group) =>
        group.chapter ? (
          <ChapterCard key={group.key} group={group} {...section} />
        ) : (
          <CurriculumSection key={group.key} nodes={group.nodes} {...section} />
        ),
      )}
    </div>
  );
}
