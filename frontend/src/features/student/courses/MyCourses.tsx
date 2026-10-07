// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, Lock } from "lucide-react";
import { getMyCoursesApi } from "@/lib/api/organizations";
import type { ApiEnrolledCourse } from "@/lib/api/organizations";
import { getStoredOrganizations } from "@/lib/auth";
import { getRoleBasePath } from "@/lib/constants";
import CourseGrid from "./components/CourseGrid";
import CourseGridSkeleton from "@/components/course/CourseGridSkeleton";
import RoadmapSkeleton from "@/components/course/RoadmapSkeleton";
import DetailedRoadmap from "./components/DetailedRoadmap";

function CourseUnavailable({ onBack }: { readonly onBack: () => void }) {
  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7 text-slate-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-2">
        Course Unavailable
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        This course is no longer available. It may have been archived by your
        organization.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="px-5 py-2 rounded-xl bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 transition-colors"
      >
        Back to My Courses
      </button>
    </div>
  );
}

function CourseListView({
  courses,
  onOpen,
  loading = false,
}: {
  readonly courses: ApiEnrolledCourse[];
  readonly onOpen: (id: number | string) => void;
  readonly loading?: boolean;
}) {
  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in transition-all duration-700">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-brand-teal font-semibold text-xs uppercase tracking-widest leading-none">
          <Sparkles className="h-3 w-3" /> STUDENT CENTER
        </div>
        <h1 className="text-xl font-semibold text-slate-800 tracking-tight leading-none uppercase">
          My Courses
        </h1>
        <p className="text-slate-500 font-medium text-sm">
          Welcome back. Your continuous learning journey starts here.
        </p>
      </header>

      {loading ? (
        <CourseGridSkeleton />
      ) : (
        <CourseGrid courses={courses} onOpen={onOpen} />
      )}
    </div>
  );
}

export default function StudentMyCourses() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<ApiEnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = getStoredOrganizations()[0]?.id?.toString() || "1";

  useEffect(() => {
    getMyCoursesApi(orgId)
      .then((data) => setCourses(data.filter((c) => c.status !== "Archived")))
      .finally(() => setLoading(false));
  }, [orgId]);

  const backToList = () => navigate(`${getRoleBasePath()}/my-courses`);
  const selectedCourse =
    typeof courseId === "string"
      ? courses.find((c) => String(c.id) === courseId)
      : undefined;

  const renderBody = () => {
    // While the enrolled-courses list is loading, show a skeleton shaped like the
    // destination view — the roadmap for a deep-linked course, else the grid.
    if (loading) {
      return typeof courseId === "string" ? (
        <RoadmapSkeleton />
      ) : (
        <CourseListView courses={[]} onOpen={() => {}} loading />
      );
    }
    if (typeof courseId !== "string") {
      return (
        <CourseListView
          courses={courses}
          onOpen={(id) => navigate(`${getRoleBasePath()}/my-courses/${id}`)}
        />
      );
    }
    if (!selectedCourse) return <CourseUnavailable onBack={backToList} />;
    return (
      <DetailedRoadmap
        id={courseId}
        course={selectedCourse}
        onExit={backToList}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FBFA] px-6 lg:px-10 pb-10 pt-3 lg:pt-4 font-sans selection:bg-brand-teal selection:text-white">
      {renderBody()}
    </div>
  );
}
