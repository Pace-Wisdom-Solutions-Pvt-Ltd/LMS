// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { BookOpen, BookMarked, ChevronRight } from "lucide-react";
import type { ApiEnrolledCourse } from "@/lib/api/organizations";

function CourseCard({
  course,
  onOpen,
}: {
  readonly course: ApiEnrolledCourse;
  readonly onOpen: () => void;
}) {
  const pctDone = Number.parseFloat(course.completion_percentage).toFixed(0);

  return (
    <button
      onClick={onOpen}
      data-testid="course-card-btn"
      className="group relative bg-white rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-4 text-left"
    >
      <div className="w-full aspect-[16/10] bg-slate-50 rounded-2xl mb-6 overflow-hidden relative shadow-inner">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-10">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur shadow-xl text-xs font-semibold text-brand-teal tracking-tight uppercase">
            {pctDone}% DONE
          </span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-800 mb-2 leading-tight group-hover:text-brand-teal transition-colors tracking-tight uppercase">
        {course.title}
      </h3>
      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-6 font-medium">
        {course.description}
      </p>
      <div className="flex items-center justify-between pt-5 mt-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-400 uppercase">
            AS
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Active enrollment
          </span>
        </div>
        <ChevronRight className="h-5 w-5 text-brand-teal group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100/50">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-300 mb-4 mx-auto">
        <BookMarked className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-tight mb-2">
        No Courses Found
      </h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
        Enrolled courses appear here.
      </p>
    </div>
  );
}

/** Grid of enrolled course cards (or an empty state). */
export default function CourseGrid({
  courses,
  onOpen,
}: {
  readonly courses: ApiEnrolledCourse[];
  readonly onOpen: (id: number | string) => void;
}) {
  if (courses.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} onOpen={() => onOpen(c.id)} />
      ))}
    </div>
  );
}
