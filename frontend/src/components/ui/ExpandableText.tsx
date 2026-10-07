// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";

interface ExpandableTextProps {
  text?: string | null;
  maxLength?: number;
  className?: string;
  toggleClassName?: string;
}

/** Truncates long text with a "Read more" / "Read less" toggle. */
export default function ExpandableText({
  text,
  maxLength = 200,
  className = "",
  toggleClassName = "",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > maxLength;
  const displayText =
    isLong && !expanded ? `${text.slice(0, maxLength).trimEnd()}...` : text;

  return (
    <p className={`text-justify ${className}`}>
      {displayText}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={`ml-1.5 font-semibold text-brand-teal hover:underline not-italic ${toggleClassName}`}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </p>
  );
}
