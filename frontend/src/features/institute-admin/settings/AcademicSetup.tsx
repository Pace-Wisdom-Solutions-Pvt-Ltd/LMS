// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import PageCard from '@/components/ui/PageCard'
import Dropdown from '@/components/ui/Dropdown'
import Modal from '@/components/ui/Modal'
import { showToast } from '@/lib/toastApi'
import { useStoreRefresh } from '../useStoreRefresh'
import {
  getDepartments,
  getJobRoles,
  getSkills,
  getTrainingCycles,
  getSkillsMappings,
  addDepartment,
  updateDepartment,
  addJobRole,
  updateJobRole,
  addSkill,
  addTrainingCycle,
  updateTrainingCycle,
  addSkillsMapping,
  updateSkillsMapping,
  getDepartmentName,
  getJobRoleName,
  getSkillName,
  type Department,
  type JobRole,
  type JobRoleLevel,
  type TrainingCycle,
  type SkillsMapping,
  type TrainingCycleStatus,
} from '../store'
import { getStaffApi, type ApiStaff } from '@/lib/api/organizations'
import { getStoredOrganizations } from '@/lib/auth'
import { Pencil } from 'lucide-react'

type Tab = 'departments' | 'job-roles' | 'skills-mapping' | 'training-cycle'

const JOB_LEVELS: JobRoleLevel[] = ['Junior', 'Mid', 'Senior']
const CYCLE_STATUSES: TrainingCycleStatus[] = ['current', 'past', 'upcoming']

export default function AcademicSetup() {
  const refresh = useStoreRefresh()
  const [tab, setTab] = useState<Tab>('departments')
  const [staff, setStaff] = useState<ApiStaff[]>([])

  useEffect(() => {
    const orgId = getStoredOrganizations()[0]?.id?.toString()
    if (!orgId) return
    getStaffApi(orgId).then(setStaff).catch(() => {})
  }, [])

  const staffName = (id: string): string => {
    const s = staff.find((x) => x.user_detail.id === id)
    return s ? `${s.user_detail.first_name} ${s.user_detail.last_name}` : id
  }

  const departments = getDepartments()
  const jobRoles = getJobRoles()
  const skills = getSkills()
  const trainingCycles = getTrainingCycles()
  const skillsMappings = getSkillsMappings()

  const [newSkillName, setNewSkillName] = useState('')

  // Department Create/Edit modal
  const [deptModal, setDeptModal] = useState<Department | null | 'add'>(null)
  const [deptForm, setDeptForm] = useState({
    name: '',
    parentId: '' as string,
    managerId: '' as string,
    status: 'active' as 'active' | 'inactive',
    maxLearners: '' as number | '',
  })

  const openDeptModal = (d?: Department) => {
    if (d) {
      setDeptForm({
        name: d.name,
        parentId: d.parentId ?? '',
        managerId: d.managerId ?? '',
        status: d.status,
        maxLearners: d.maxLearners ?? '',
      })
      setDeptModal(d)
    } else {
      setDeptForm({ name: '', parentId: '', managerId: '', status: 'active', maxLearners: '' })
      setDeptModal('add')
    }
  }

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptForm.name.trim()) {
      showToast('Department name is required.', 'warning')
      return
    }
    const payload = {
      name: deptForm.name.trim(),
      parentId: deptForm.parentId || undefined,
      managerId: deptForm.managerId || undefined,
      status: deptForm.status,
      maxLearners: deptForm.maxLearners === '' ? undefined : Number(deptForm.maxLearners),
    }
    if (deptModal && deptModal !== 'add') {
      updateDepartment(deptModal.id, payload)
      showToast('Department updated.', 'success')
    } else {
      addDepartment(payload)
      showToast('Department added.', 'success')
    }
    setDeptModal(null)
    refresh()
  }

  // Job Role Create/Edit modal
  const [roleModal, setRoleModal] = useState<JobRole | null | 'add'>(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    level: 'Junior' as JobRoleLevel,
    requiredSkillIds: [] as string[],
    status: 'active' as 'active' | 'inactive',
  })

  const toggleRoleSkill = (skillId: string) => {
    setRoleForm((p) => ({
      ...p,
      requiredSkillIds: p.requiredSkillIds.includes(skillId)
        ? p.requiredSkillIds.filter((id) => id !== skillId)
        : [...p.requiredSkillIds, skillId],
    }))
  }

  const openRoleModal = (r?: JobRole) => {
    if (r) {
      setRoleForm({
        name: r.name,
        level: r.level,
        requiredSkillIds: [...r.requiredSkillIds],
        status: r.status,
      })
      setRoleModal(r)
    } else {
      setRoleForm({ name: '', level: 'Junior', requiredSkillIds: [], status: 'active' })
      setRoleModal('add')
    }
  }

  const handleSaveJobRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleForm.name.trim()) {
      showToast('Role name is required.', 'warning')
      return
    }
    const payload = {
      name: roleForm.name.trim(),
      level: roleForm.level,
      requiredSkillIds: roleForm.requiredSkillIds,
      status: roleForm.status,
    }
    if (roleModal && roleModal !== 'add') {
      updateJobRole(roleModal.id, payload)
      showToast('Job role updated.', 'success')
    } else {
      addJobRole(payload)
      showToast('Job role added.', 'success')
    }
    setRoleModal(null)
    refresh()
  }

  // Skills Mapping Create/Edit
  const [mappingModal, setMappingModal] = useState<SkillsMapping | null | 'add'>(null)
  const [mappingForm, setMappingForm] = useState({
    departmentId: '' as string,
    jobRoleId: '' as string,
    skillIds: [] as string[],
    trainerIds: [] as string[],
    contentOwnerIds: [] as string[],
  })

  const toggleMappingSkill = (id: string) => {
    setMappingForm((p) => ({ ...p, skillIds: p.skillIds.includes(id) ? p.skillIds.filter((x) => x !== id) : [...p.skillIds, id] }))
  }
  const toggleMappingTrainer = (id: string) => {
    setMappingForm((p) => ({ ...p, trainerIds: p.trainerIds.includes(id) ? p.trainerIds.filter((x) => x !== id) : [...p.trainerIds, id] }))
  }
  const toggleMappingContentOwner = (id: string) => {
    setMappingForm((p) => ({ ...p, contentOwnerIds: p.contentOwnerIds.includes(id) ? p.contentOwnerIds.filter((x) => x !== id) : [...p.contentOwnerIds, id] }))
  }

  const openMappingModal = (m?: SkillsMapping) => {
    if (m) {
      setMappingForm({
        departmentId: m.departmentId ?? '',
        jobRoleId: m.jobRoleId ?? '',
        skillIds: [...m.skillIds],
        trainerIds: [...m.trainerIds],
        contentOwnerIds: [...m.contentOwnerIds],
      })
      setMappingModal(m)
    } else {
      setMappingForm({ departmentId: '', jobRoleId: '', skillIds: [], trainerIds: [], contentOwnerIds: [] })
      setMappingModal('add')
    }
  }

  const handleSaveSkillsMapping = (e: React.FormEvent) => {
    e.preventDefault()
    const byDept = !!mappingForm.departmentId
    const byRole = !!mappingForm.jobRoleId
    if (!byDept && !byRole) {
      showToast('Select a Department or Job Role.', 'warning')
      return
    }
    if (mappingForm.skillIds.length === 0) {
      showToast('Select at least one skill.', 'warning')
      return
    }
    const payload = {
      departmentId: byDept ? mappingForm.departmentId : undefined,
      jobRoleId: byRole ? mappingForm.jobRoleId : undefined,
      skillIds: mappingForm.skillIds,
      trainerIds: mappingForm.trainerIds,
      contentOwnerIds: mappingForm.contentOwnerIds,
    }
    if (mappingModal && mappingModal !== 'add') {
      updateSkillsMapping(mappingModal.id, payload)
      showToast('Skills mapping updated.', 'success')
    } else {
      addSkillsMapping(payload)
      showToast('Skills assigned.', 'success')
    }
    setMappingModal(null)
    refresh()
  }

  // Training Cycle Create/Edit modal
  const [cycleModal, setCycleModal] = useState<TrainingCycle | null | 'add'>(null)
  const [cycleForm, setCycleForm] = useState({
    startDate: '',
    endDate: '',
    compliancePeriodName: '',
    status: 'current' as TrainingCycleStatus,
  })

  const openCycleModal = (c?: TrainingCycle) => {
    if (c) {
      setCycleForm({
        startDate: c.startDate,
        endDate: c.endDate,
        compliancePeriodName: c.compliancePeriodName,
        status: c.status,
      })
      setCycleModal(c)
    } else {
      setCycleForm({ startDate: '', endDate: '', compliancePeriodName: '', status: 'current' })
      setCycleModal('add')
    }
  }

  const handleSaveTrainingCycle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cycleForm.startDate || !cycleForm.endDate || !cycleForm.compliancePeriodName.trim()) {
      showToast('Start date, end date, and compliance period name are required.', 'warning')
      return
    }
    const payload = {
      startDate: cycleForm.startDate,
      endDate: cycleForm.endDate,
      compliancePeriodName: cycleForm.compliancePeriodName.trim(),
      status: cycleForm.status,
    }
    if (cycleModal && cycleModal !== 'add') {
      updateTrainingCycle(cycleModal.id, payload)
      showToast('Training cycle updated.', 'success')
    } else {
      addTrainingCycle(payload)
      showToast('Training cycle added.', 'success')
    }
    setCycleModal(null)
    refresh()
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'departments', label: 'Department / Team Management' },
    { id: 'job-roles', label: 'Job Roles / Levels' },
    { id: 'skills-mapping', label: 'Skills & Competencies Mapping' },
    { id: 'training-cycle', label: 'Training Cycle / Fiscal Year' },
  ]

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Training Structure</h1>
        <p className="text-slate-600 mt-1">Department/team management, job roles, skills mapping, training cycle.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-brand-teal text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Department / Team Management ── */}
      {tab === 'departments' && (
        <PageCard title="Department / Team Management">
          <p className="text-slate-600 text-sm mb-4">Define organization structure. Create or edit departments.</p>
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-slate-600">Action: Create/Edit Department</span>
            <button
              onClick={() => openDeptModal()}
              className="px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg transition-all"
            >
              Create Department
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Department Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Parent Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Manager (Trainer)</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Max Learners</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{d.name}</td>
                    <td className="py-3 px-4 text-slate-600">{d.parentId ? getDepartmentName(d.parentId) : '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{d.managerId ? staffName(d.managerId) : '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{d.status}</td>
                    <td className="py-3 px-4 text-slate-600">{d.maxLearners ?? '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openDeptModal(d)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      {/* ── Job Roles / Levels ── */}
      {tab === 'job-roles' && (
        <PageCard title="Job Roles / Levels">
          <p className="text-slate-600 text-sm mb-4">Map job roles to required competencies.</p>
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-slate-600">Action: Create/Edit Job Role</span>
            <button
              onClick={() => openRoleModal()}
              className="px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg transition-all"
            >
              Create Job Role
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Role Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Level</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Required Skills</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {jobRoles.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{r.name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.level}</td>
                    <td className="py-3 px-4 text-slate-600">{r.requiredSkillIds.map(getSkillName).join(', ') || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{r.status}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openRoleModal(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      {/* ── Skills & Competencies Mapping ── */}
      {tab === 'skills-mapping' && (
        <PageCard title="Skills & Competencies Mapping">
          <p className="text-slate-600 text-sm mb-4">Assign skills to a department or job role, then assign trainers and content owners.</p>
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
            <input
              type="text"
              placeholder="New skill name"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="min-w-[160px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (newSkillName.trim()) {
                  addSkill({ name: newSkillName.trim() })
                  setNewSkillName('')
                  refresh()
                  showToast('Skill added.', 'success')
                }
              }}
              className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300"
            >
              Add skill
            </button>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-600">Action: Assign Skills</span>
            <button
              onClick={() => openMappingModal()}
              className="px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg transition-all"
            >
              Assign skills
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Department / Job Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Skills</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Trainers</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Content Owners</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {skillsMappings.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {m.departmentId && getDepartmentName(m.departmentId)}
                      {!m.departmentId && m.jobRoleId && getJobRoleName(m.jobRoleId)}
                      {!m.departmentId && !m.jobRoleId && '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.skillIds.map(getSkillName).join(', ') || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{m.trainerIds.map(staffName).join(', ') || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{m.contentOwnerIds.map(staffName).join(', ') || '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openMappingModal(m)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      {/* ── Training Cycle / Fiscal Year ── */}
      {tab === 'training-cycle' && (
        <PageCard title="Training Cycle / Fiscal Year">
          <p className="text-slate-600 text-sm mb-4">View and manage training/compliance cycles.</p>
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-slate-600">Action: Training Cycle View</span>
            <button
              onClick={() => openCycleModal()}
              className="px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold hover:shadow-lg transition-all"
            >
              Add training cycle
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Start Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">End Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Compliance Period Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {trainingCycles.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-600">{c.startDate}</td>
                    <td className="py-3 px-4 text-slate-600">{c.endDate}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{c.compliancePeriodName}</td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{c.status}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openCycleModal(c)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      {/* ── Modals ── */}
      {deptModal && (
        <Modal open onClose={() => setDeptModal(null)} maxWidth="max-w-md">
          <h2 className="text-base font-bold text-slate-800 mb-4">
            {deptModal === 'add' ? 'Create Department' : 'Edit Department'}
          </h2>
          <form onSubmit={handleSaveDepartment} className="space-y-4">
            <div>
              <label htmlFor="dept-name" className="block text-[13px] font-bold text-slate-700 mb-1.5">Department Name *</label>
              <input
                id="dept-name"
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Engineering"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div>
              <Dropdown
                label="Parent Department (hierarchy)"
                value={deptForm.parentId}
                options={[
                  { value: '', label: 'No parent' },
                  ...departments
                    .filter((d) => deptModal === 'add' || d.id !== (deptModal as Department).id)
                    .map((d) => ({ value: d.id, label: d.name })),
                ]}
                onChange={(v) => setDeptForm((p) => ({ ...p, parentId: v }))}
                placeholder="Select parent"
              />
            </div>
            <div>
              <Dropdown
                label="Manager (dropdown from Trainers)"
                value={deptForm.managerId}
                options={[{ value: '', label: 'No manager' }, ...staff.map((s) => ({ value: s.user_detail.id, label: `${s.user_detail.first_name} ${s.user_detail.last_name}` }))]}
                onChange={(v) => setDeptForm((p) => ({ ...p, managerId: v }))}
                placeholder="Select manager"
              />
            </div>
            <div>
              <Dropdown
                label="Status"
                value={deptForm.status}
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                onChange={(v) => setDeptForm((p) => ({ ...p, status: v as 'active' | 'inactive' }))}
              />
            </div>
            <div>
              <label htmlFor="dept-max-learners" className="block text-[13px] font-bold text-slate-700 mb-1.5">Max Learners (optional quota)</label>
              <input
                id="dept-max-learners"
                type="number"
                value={deptForm.maxLearners === '' ? '' : deptForm.maxLearners}
                onChange={(e) => setDeptForm((p) => ({ ...p, maxLearners: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0 }))}
                placeholder="Optional"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold">
                {deptModal === 'add' ? 'Create' : 'Save'}
              </button>
              <button type="button" onClick={() => setDeptModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {roleModal && (
        <Modal open onClose={() => setRoleModal(null)} maxWidth="max-w-md">
          <h2 className="text-base font-bold text-slate-800 mb-4">
            {roleModal === 'add' ? 'Create Job Role' : 'Edit Job Role'}
          </h2>
          <form onSubmit={handleSaveJobRole} className="space-y-4">
            <div>
              <label htmlFor="role-name" className="block text-[13px] font-bold text-slate-700 mb-1.5">Role Name * (e.g. Manager, Engineer)</label>
              <input
                id="role-name"
                type="text"
                value={roleForm.name}
                onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Software Engineer"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div>
              <Dropdown
                label="Level (Junior / Mid / Senior)"
                value={roleForm.level}
                options={JOB_LEVELS.map((l) => ({ value: l, label: l }))}
                onChange={(v) => setRoleForm((p) => ({ ...p, level: v as JobRoleLevel }))}
              />
            </div>
            <div>
              <span className="block text-[13px] font-bold text-slate-700 mb-2">Required Skills (multi-select)</span>
              <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-xl">
                {skills.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleForm.requiredSkillIds.includes(s.id)}
                      onChange={() => toggleRoleSkill(s.id)}
                      className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                    />
                    <span className="text-sm text-slate-700">{s.name}</span>
                  </label>
                ))}
                {skills.length === 0 && <span className="text-slate-500 text-sm">Add skills in Skills & Competencies tab first.</span>}
              </div>
            </div>
            <div>
              <Dropdown
                label="Status"
                value={roleForm.status}
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                onChange={(v) => setRoleForm((p) => ({ ...p, status: v as 'active' | 'inactive' }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold">
                {roleModal === 'add' ? 'Create' : 'Save'}
              </button>
              <button type="button" onClick={() => setRoleModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {mappingModal && (
        <Modal open onClose={() => setMappingModal(null)} maxWidth="max-w-lg">
          <h2 className="text-base font-bold text-slate-800 mb-4">
            {mappingModal === 'add' ? 'Assign Skills' : 'Edit Skills Mapping'}
          </h2>
          <form onSubmit={handleSaveSkillsMapping} className="space-y-4">
            <p className="text-sm text-slate-600">Select Department or Job Role</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Dropdown
                  label="Department"
                  value={mappingForm.departmentId}
                  options={[{ value: '', label: '—' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                  onChange={(v) => setMappingForm((p) => ({ ...p, departmentId: v, jobRoleId: v ? '' : p.jobRoleId }))}
                  placeholder="Select department"
                />
              </div>
              <div>
                <Dropdown
                  label="Job Role"
                  value={mappingForm.jobRoleId}
                  options={[{ value: '', label: '—' }, ...jobRoles.map((r) => ({ value: r.id, label: `${r.name} (${r.level})` }))]}
                  onChange={(v) => setMappingForm((p) => ({ ...p, jobRoleId: v, departmentId: v ? '' : p.departmentId }))}
                  placeholder="Select job role"
                />
              </div>
            </div>
            <div>
              <span className="block text-[13px] font-bold text-slate-700 mb-2">Skills (multi-select)</span>
              <div className="flex flex-wrap gap-3 max-h-28 overflow-y-auto p-2 border border-slate-200 rounded-xl">
                {skills.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mappingForm.skillIds.includes(s.id)}
                      onChange={() => toggleMappingSkill(s.id)}
                      className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                    />
                    <span className="text-sm text-slate-700">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-[13px] font-bold text-slate-700 mb-2">Assign Trainers / Content Owners</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Trainers</p>
                  <div className="flex flex-wrap gap-2">
                    {staff.map((s) => (
                      <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={mappingForm.trainerIds.includes(s.user_detail.id)} onChange={() => toggleMappingTrainer(s.user_detail.id)} className="rounded border-slate-300 text-brand-teal" />
                        <span className="text-xs">{s.user_detail.first_name} {s.user_detail.last_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Content Owners</p>
                  <div className="flex flex-wrap gap-2">
                    {staff.map((s) => (
                      <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={mappingForm.contentOwnerIds.includes(s.user_detail.id)} onChange={() => toggleMappingContentOwner(s.user_detail.id)} className="rounded border-slate-300 text-brand-teal" />
                        <span className="text-xs">{s.user_detail.first_name} {s.user_detail.last_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold">
                {mappingModal === 'add' ? 'Assign' : 'Save'}
              </button>
              <button type="button" onClick={() => setMappingModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {cycleModal && (
        <Modal open onClose={() => setCycleModal(null)} maxWidth="max-w-md">
          <h2 className="text-base font-bold text-slate-800 mb-4">
            {cycleModal === 'add' ? 'Add Training Cycle' : 'Edit Training Cycle'}
          </h2>
          <form onSubmit={handleSaveTrainingCycle} className="space-y-4">
            <div>
              <label htmlFor="cycle-start-date" className="block text-[13px] font-bold text-slate-700 mb-1.5">Start Date *</label>
              <input
                id="cycle-start-date"
                type="date"
                value={cycleForm.startDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCycleForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div>
              <label htmlFor="cycle-end-date" className="block text-[13px] font-bold text-slate-700 mb-1.5">End Date *</label>
              <input
                id="cycle-end-date"
                type="date"
                value={cycleForm.endDate}
                min={cycleForm.startDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCycleForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div>
              <label htmlFor="cycle-compliance-period" className="block text-[13px] font-bold text-slate-700 mb-1.5">Compliance Period Name *</label>
              <input
                id="cycle-compliance-period"
                type="text"
                value={cycleForm.compliancePeriodName}
                onChange={(e) => setCycleForm((p) => ({ ...p, compliancePeriodName: e.target.value }))}
                placeholder="e.g. FY 2026"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none"
              />
            </div>
            <div>
              <Dropdown
                label="Status (Current / Past / Upcoming)"
                value={cycleForm.status}
                options={CYCLE_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                onChange={(v) => setCycleForm((p) => ({ ...p, status: v as TrainingCycleStatus }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-brand-teal text-white font-semibold">
                {cycleModal === 'add' ? 'Add' : 'Save'}
              </button>
              <button type="button" onClick={() => setCycleModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
