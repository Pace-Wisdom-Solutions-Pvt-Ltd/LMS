// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { Course } from '../../store'

interface ProjectCardProps {
  project: Course
  onOpen: () => void
}

export default function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const taskCount = project.assessments.length

  return (
    <div
      onClick={onOpen}
      className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-brand-teal/30 cursor-pointer transition-all duration-300 animate-fade-in"
    >
      <div>
        <p className="font-medium text-slate-800">{project.name}</p>
        <p className="text-sm text-slate-500">{project.code}</p>
        {project.summary && (
          <p className="text-sm text-slate-600 mt-1">{project.summary}</p>
        )}
        {taskCount > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <span className="text-brand-teal text-sm font-medium shrink-0">View →</span>
    </div>
  )
}
