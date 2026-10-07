// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { Course } from '../../store'
import ProjectCard from './ProjectCard'

interface ProjectListProps {
  projects: Course[]
  onOpen: (id: string) => void
}

export default function ProjectList({ projects, onOpen }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <p className="text-slate-500 py-8 text-center">
        No projects yet. Create your first project to get started.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={() => onOpen(project.id)}
        />
      ))}
    </div>
  )
}
