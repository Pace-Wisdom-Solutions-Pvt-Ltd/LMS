// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { FileText, Play } from "lucide-react";
import type { NodeMeta } from "./courseMeta";

/** Small thumbnail shown next to a collapsed node (video frame or file icon). */
export default function ThumbnailPreview({ meta }: { readonly meta: NodeMeta }) {
  return (
    <div className="h-12 w-20 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0 shadow-inner overflow-hidden relative transition-all duration-500">
      {meta.isVideo && meta.yid ? (
        <>
          <img
            src={`https://img.youtube.com/vi/${meta.yid}/mqdefault.jpg`}
            alt=""
            className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-all duration-700"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors">
            <Play className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-0.5">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-sans">
            {meta.type || "ITEM"}
          </span>
        </div>
      )}
    </div>
  );
}
