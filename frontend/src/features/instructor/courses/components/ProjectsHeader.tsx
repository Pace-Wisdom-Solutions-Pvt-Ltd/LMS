// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

interface ProjectsHeaderProps {
  onCreate: () => void
}

export default function ProjectsHeader({ onCreate }: ProjectsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <p className="text-slate-600">
        Create and manage projects (task groups) and tasks.
      </p>
      <button
        onClick={onCreate}
        className="px-4 py-2.5 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 shrink-0 transition-opacity active:scale-[0.99]"
      >
        Create Project
      </button>
    </div>
  )
}
