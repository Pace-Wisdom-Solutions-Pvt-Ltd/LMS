// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import { getCourses } from '../store'
import CreateCourseModal from '../modals/CreateCourseModal'
import ProjectsHeader from './components/ProjectsHeader'
import ProjectList from './components/ProjectList'

export default function InstructorMyCourses() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(getCourses())
  const [createOpen, setCreateOpen] = useState(false)

  const openProject = (id: string) => navigate(`/trainer/projects/${id}`)

  return (
    <>
      <PageCard title="Projects">
        <ProjectsHeader onCreate={() => setCreateOpen(true)} />
        <ProjectList projects={projects} onOpen={openProject} />
      </PageCard>

      {createOpen && (
        <CreateCourseModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setProjects(getCourses())
            openProject(id)
          }}
        />
      )}
    </>
  )
}
