// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { CheckCircle, Sparkles } from "lucide-react";
import type { RoadmapNodeData } from "./courseMeta";

/** "Quick Outline" + "Focus Areas" guidance shown inside an expanded node. */
type GuidanceItem = { id: string | number; text: string };

/** The node-detail payload carries these as lists, though RoadmapNodeData doesn't declare them. */
type GuidanceNode = RoadmapNodeData & {
  quick_outline?: unknown;
  focus_areas?: unknown;
};

function asGuidanceItems(value: unknown): GuidanceItem[] {
  return Array.isArray(value) ? (value as GuidanceItem[]) : [];
}

export default function GuidanceSection({ node }: { readonly node: GuidanceNode }) {
  const outline = asGuidanceItems(node.quick_outline);
  const focusAreas = asGuidanceItems(node.focus_areas);
  const hasOutline = outline.length > 0;
  const hasFocus = focusAreas.length > 0;

  if (!hasOutline && !hasFocus) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-4 border-b border-slate-100/60">
      {hasOutline && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-brand-teal">
            <CheckCircle className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              Quick Outline
            </span>
          </div>
          <ul className="space-y-1.5">
            {outline.map((item) => (
              <li
                key={item.id}
                className="text-xs font-medium text-slate-800 leading-relaxed pr-4 flex items-start gap-2"
              >
                <span className="h-1 w-1 rounded-full bg-brand-teal/40 mt-1.5 shrink-0" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasFocus && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              Focus Areas
            </span>
          </div>
          <ul className="space-y-1.5">
            {focusAreas.map((item) => (
              <li
                key={item.id}
                className="text-xs font-medium text-slate-800 leading-relaxed italic flex items-start gap-2"
              >
                <span className="h-1 w-1 rounded-full bg-indigo-200 mt-1.5 shrink-0" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
