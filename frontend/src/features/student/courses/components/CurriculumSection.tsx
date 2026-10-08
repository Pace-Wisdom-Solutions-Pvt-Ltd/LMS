// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { completeModuleNodeApi } from "@/lib/api/organizations";
import { getMeta, type RoadmapNodeData } from "./courseMeta";
import CurriculumNode from "./CurriculumNode";

/** Ordered list of nodes within an expanded module, with sequential locking. */
export default function CurriculumSection({
  nodes,
  orgId,
  courseId,
  moduleId,
  localDone,
  onNodeDone,
  onUpdated,
  precedingNode,
  emptyText = "No items configured in this level yet.",
}: {
  readonly nodes: RoadmapNodeData[];
  readonly orgId: string;
  readonly courseId: string;
  readonly moduleId: string;
  readonly localDone: Record<number, boolean>;
  readonly onNodeDone: (nid: number) => void;
  readonly onUpdated: () => void;
  /**
   * Last item of the previous chapter in the same level. Unlocking runs across
   * the whole level, so the first item here waits for it to be completed.
   */
  readonly precedingNode?: RoadmapNodeData | null;
  readonly emptyText?: string;
}) {
  const [activeNode, setActiveNode] = useState<number | null>(null);

  const handleDone = async (nid: number) => {
    try {
      await completeModuleNodeApi(nid);
      onNodeDone(nid);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-10 text-center text-slate-300 italic font-medium text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-1 relative pl-8 overflow-hidden">
      {/* Visual Timeline Bar - Cleaned to zero border */}
      <div className="absolute left-[13px] top-4 bottom-10 w-[1px] bg-slate-100" />

      {nodes.map((n, idx) => {
        const meta = getMeta(n);
        const isThisNodeDone = meta.isDone || !!localDone[n.id];

        // Locking. Headings act as section boundaries — the first content node
        // after a heading always opens, and each subsequent node unlocks once
        // the previous one in the same section is complete. Find the nearest
        // content predecessor without crossing a heading (a new section start).
        let isLocked: boolean;
        if (meta.isHeading) {
          isLocked = false; // headings are never locked
        } else {
          // The immediate predecessor gates this node — unless it's a heading,
          // in which case this is a section entry and always opens.
          const prev = idx > 0 ? nodes[idx - 1] : (precedingNode ?? null);
          const prevMeta = prev ? getMeta(prev) : null;
          const isPrevDone =
            prev && prevMeta && !prevMeta.isHeading
              ? prevMeta.isDone || !!localDone[prev.id]
              : true; // no content predecessor → section entry, always open
          const sequentiallyLocked = !isPrevDone && !isThisNodeDone;

          // The roadmap endpoint reports `is_accessible`, but a node whose only
          // prerequisite is a heading (which has no completable content) comes
          // back inaccessible and would stay locked forever. So lock a node only
          // when the server locks it AND the section's sequence hasn't reached
          // it yet; otherwise fall back to the sequential unlock alone.
          isLocked = meta.accessProvided
            ? !meta.isAccessible && sequentiallyLocked
            : sequentiallyLocked;
        }

        return (
          <CurriculumNode
            key={n.id}
            node={n}
            orgId={orgId}
            courseId={courseId}
            moduleId={moduleId}
            isOpen={activeNode === n.id}
            isDone={isThisNodeDone}
            isLocked={isLocked}
            onToggle={() => {
              if (!isLocked) setActiveNode(activeNode === n.id ? null : n.id);
            }}
            onDone={() => handleDone(n.id)}
            onTaskSubmitted={onUpdated}
          />
        );
      })}
    </div>
  );
}
