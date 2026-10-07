// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/** A non-completable section heading within a module's node list. */
export default function CurriculumHeading({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <div className="pt-3 pb-2 first:pt-0 ml-1">
      <h5 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-1">
        {title}
      </h5>
      {description && (
        <p className="text-xs font-semibold text-slate-600 italic leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
