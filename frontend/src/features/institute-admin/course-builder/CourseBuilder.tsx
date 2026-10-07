// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageCard from '@/components/ui/PageCard'
import Button from '@/components/ui/Button'
import { showToast, withUploadToast } from '@/lib/toastApi'
import BackButton from '@/components/ui/BackButton'
import { getStoredOrganizations } from '@/lib/auth'
import QuizBuilderPage from './QuizBuilderPage'
import {
  createCourseApi,
  createCourseModuleApi,
  createModuleNodeApi,
  deleteCourseModuleApi,
  deleteModuleNodeApi,
  getCoursesApi,
  getCourseModulesApi,
  getModuleNodesApi,
  updateCourseApi,
  updateCourseModuleApi,
  updateModuleNodeApi,
  type ApiCourseModule,
  type ApiModuleNode,
} from '@/lib/api/organizations'
import { useStoreRefresh } from '../useStoreRefresh'
import {
  getQuestions,
  getCourseTracks,
  addCourseTrack,
  updateCourseTrack,
  getCourseLevels,
  addCourseLevel,
  updateCourseLevel,
  removeCourseLevelsByName,
  getProgramsByLevel,
  addProgram,
  updateProgram,
  getProgramResources,
  getProgramTasks,
  getProgramAssessments,
  removeProgramResource,
  removeProgramTask,
  removeProgramAssessment,
} from '../store'
import {
  buildQuestionsInputJson,
  isRootModuleNode,
  toAbsoluteContentUrl,
  toCourseStatus,
} from './courseBuilderHelpers'
import {
  ProgramInner,
  type OpenQuizContext,
} from './CourseBuilderProgramInner'
import {
  type NodeEditModalState,
  SUBMISSION_FORMATS,
} from './courseBuilderProgramHelpers'
import CourseDetailsCard, { type CourseFormState } from './CourseDetailsCard'
import CourseStructureCard from './CourseStructureCard'
import LevelProgramsSection, { type PhaseDraftRow } from './LevelProgramsSection'
import {
  ProgramModal,
  LevelEditModal,
  NodeEditContentModal,
  NodeEditTaskModal,
  ConfirmModal,
  type ProgramModalState,
  type LevelEditModalState,
} from './CourseBuilderModals'
import { newId } from '@/lib/ids'

function newClientId(prefix: string): string {
  return newId(prefix)
}

function resourceTypeToLabel(type: string): 'Link' | 'PDF' | 'Video' {
  switch (type) {
    case 'link':
      return 'Link'
    case 'pdf':
      return 'PDF'
    default:
      return 'Video'
  }
}

// ApiCurriculumContext moved to CourseBuilderProgramInner.tsx

function requireOrgAndCourseIds(
  orgId: string | undefined,
  effectiveCourseId: string | number | null | undefined,
  onMissing: (message: string) => void,
): { orgId: string; effectiveCourseId: string | number } | null {
  if (!orgId || !effectiveCourseId) {
    onMissing('Missing organization/course id.')
    return null
  }
  return { orgId, effectiveCourseId }
}

function isBlank(s: unknown): boolean {
  return typeof s !== 'string' || s.trim().length === 0
}

type LocalTrack = ReturnType<typeof getCourseTracks>[number]

function findExistingTrack(allTracks: LocalTrack[], courseId: string | undefined): LocalTrack | null {
  if (!courseId) return null
  return allTracks.find((t) => t.id === courseId) ?? null
}

function getLevelsForTrack(trackId: string): ReturnType<typeof getCourseLevels> {
  if (!trackId) return []
  return getCourseLevels(trackId)
}

export default function InstituteAdminCourseBuilder() {
  const navigate = useNavigate()
  const refresh = useStoreRefresh()
  const { courseId } = useParams()

  const allTracks = getCourseTracks()
  const existing = findExistingTrack(allTracks, courseId)

  const [courseForm, setCourseForm] = useState<CourseFormState>({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    status: toCourseStatus(existing?.status),
    useLevels: true,
    teachers: [],
    thumbnailFile: null,
    thumbnailPreview: null,
  })
  const [levelDrafts, setLevelDrafts] = useState<Array<{ id: string; value: string }>>([
    { id: newClientId('lvl'), value: '' },
  ])
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [showAddLevelForm, setShowAddLevelForm] = useState(false)

  const handleRemoveLevelDraftAt = (idx: number) => {
    setLevelDrafts((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)))
  }

  const closeAddLevelForm = () => {
    setShowAddLevelForm(false)
    setLevelDrafts([{ id: newClientId('lvl'), value: '' }])
  }

  const updateLevelDraftValueAt = (idx: number, value: string) => {
    setLevelDrafts((p) => p.map((x, i) => (i === idx ? { ...x, value } : x)))
  }

  const handleUpdateCourseMeta = async () => {
    if (!orgId || !courseId) {
      showToast('Organization not found.', 'error')
      return
    }
    setCreatingCourse(true)
    try {
      const updated = await updateCourseApi(orgId, courseId, {
        title: courseForm.name.trim(),
        description: courseForm.description.trim() || undefined,
        status: getApiCourseStatusLabel(),
        teachers: courseForm.teachers.length > 0 ? courseForm.teachers : undefined,
        thumbnail: courseForm.thumbnailFile ?? undefined,
      })
      // Reflect the persisted thumbnail URL returned by the backend and drop the
      // local file so a subsequent save doesn't re-upload it.
      setCourseForm((p) => ({
        ...p,
        thumbnailFile: null,
        thumbnailPreview: updated.thumbnail ? toAbsoluteContentUrl(updated.thumbnail) : p.thumbnailPreview,
      }))
      if (existing) {
        updateCourseTrack(existing.id, {
          name: courseForm.name.trim(),
          description: courseForm.description.trim() || undefined,
          status: courseForm.status,
        })
      }
      showToast('Course updated.', 'success')
      refresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update course.', 'error')
    } finally {
      setCreatingCourse(false)
    }
  }

  const handleSaveCourseMeta = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (isBlank(courseForm.name)) {
      showToast('Course name is required.', 'warning')
      return
    }
    if (courseId && courseId !== 'new') {
      await handleUpdateCourseMeta()
      return
    }
    // New course flow: create via API
    await handleCreateNewCourseOnly()
  }

  const track = existing ?? allTracks.find((t) => t.name === courseForm.name) ?? null
  const trackId = track?.id ?? ''

  const levels = getLevelsForTrack(trackId)
  const getOrCreateLevelId = (label: string, order: number) => {
    if (!trackId) return ''
    const found = levels.find((l) => l.name === label)
    if (found) return found.id
    const created = addCourseLevel({ trackId, name: label, order })
    refresh()
    return created.id
  }

  const [apiModules, setApiModules] = useState<ApiCourseModule[]>([])
  const [apiNodesByModule, setApiNodesByModule] = useState<Record<string, ApiModuleNode[]>>({})
  const [levelEditModal, setLevelEditModal] = useState<LevelEditModalState | null>(null)
  const isEditMode = Boolean(courseId) && courseId !== 'new'
  const createButtonLabel = creatingCourse ? 'Creating…' : 'Save Course'
  const [committingCurriculum, setCommittingCurriculum] = useState(false)
  const commitLabel = isEditMode ? 'Save Curriculum' : 'Create'
  const [nodeEditLoading, setNodeEditLoading] = useState<number | null>(null)
  const [nodeEditModal, setNodeEditModal] = useState<NodeEditModalState | null>(null)
  const nodeEditTaskFileRef = useRef<HTMLInputElement>(null)
  const [nodeEditTaskNewFile, setNodeEditTaskNewFile] = useState<File | null>(null)

  // Quiz builder page state (inline page within layout)
  const [quizPageConfig, setQuizPageConfig] = useState<{
    programId: string
    editingAssessmentId: string | null
    moduleId?: string
    phaseNodeId?: number | null
    phaseDraft?: { title: string; description: string }
    onDraftCommitted?: () => void
  } | null>(null)

  const openQuizPage = (
    programId: string,
    editingAssessmentId: string | null,
    ctx?: OpenQuizContext,
  ) => {
    setQuizPageConfig({
      programId,
      editingAssessmentId,
      moduleId: ctx?.moduleId,
      phaseNodeId: ctx?.phaseNodeId,
      phaseDraft: ctx?.phaseDraft,
      onDraftCommitted: ctx?.onDraftCommitted,
    })
  }
  const closeQuizPage = () => setQuizPageConfig(null)

  // Generic confirm dialog for all delete/remove actions in this page.
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    message: string
    confirmText: string
    cancelText: string
  }>({
    open: false,
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
  })
  const confirmResolveRef = useRef<null | ((value: boolean) => void)>(null)
  const requestConfirm = (message: string, confirmText = 'OK', cancelText = 'Cancel') => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmModal({ open: true, message, confirmText, cancelText })
    })
  }
  const handleConfirmClose = (value: boolean) => {
    confirmResolveRef.current?.(value)
    confirmResolveRef.current = null
    setConfirmModal((p) => ({ ...p, open: false }))
  }

  const openLevelEdit = (lvl: ApiCourseModule) => {
    if (!orgId || !effectiveCourseId) return
    setLevelEditModal({
      moduleId: Number(lvl.id),
      courseId: effectiveCourseId,
      prevTitle: lvl.title,
      title: lvl.title,
    })
  }

  const deleteLevel = async (lvl: ApiCourseModule) => {
    if (!orgId || !effectiveCourseId) return
    if (!(await requestConfirm('Delete this level? This cannot be undone.'))) return
    try {
      await deleteCourseModuleApi(orgId, effectiveCourseId, lvl.id)
      if (trackId) removeCourseLevelsByName(trackId, lvl.title)
      setPhaseDraftsByModule((p) => ({ ...p, [String(lvl.id)]: [] }))
      setApiNodesByModule((p) => {
        const next = { ...p }
        delete next[String(lvl.id)]
        return next
      })
      await fetchModules()
      showToast('Level deleted.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete level.', 'error')
    }
  }

  const visibleApiModules = useMemo(() => {
    // Show only levels created via this UI (local store) when available.
    // This prevents the page from showing backend "default" modules that the user didn't create here.
    if (!trackId) return apiModules
    const names = new Set(levels.map((l) => l.name.toLowerCase()))
    if (names.size === 0) return []
    return apiModules.filter((m) => names.has(String(m.title ?? '').toLowerCase()))
  }, [apiModules, levels, trackId])

  const sortedLevels = [...levels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const flatBucketLevelId = trackId ? getOrCreateLevelId('Programs', 1) : ''
  const flatPrograms = flatBucketLevelId ? getProgramsByLevel(flatBucketLevelId) : []

  const orgId = useMemo(() => {
    const id = getStoredOrganizations()[0]?.id
    return id ? String(id) : ''
  }, [])

  // Backend course id comes from the URL (Manage button uses API course.id).
  // The local store trackId is not guaranteed to match backend ids.
  const effectiveCourseId = courseId ?? null

  // When opening Manage, load course details from GET /organizations/{org_id}/courses/
  useEffect(() => {
    if (!orgId || !courseId || courseId === 'new') return
    let cancelled = false
    getCoursesApi(orgId)
      .then((list) => {
        if (cancelled) return
        const rows = Array.isArray(list) ? list : []
        const c = rows.find((x) => String(x.id) === String(courseId))
        if (c) {
          setCourseForm((prev) => ({
            ...prev,
            name: c.title ?? '',
            description: c.description ?? '',
            status:
              String(c.status ?? '').toLowerCase() === 'published' ? 'published' : 'draft',
            // Show the saved thumbnail from the backend unless the user has already
            // picked a new local file this session.
            thumbnailPreview: prev.thumbnailFile
              ? prev.thumbnailPreview
              : c.thumbnail
                ? toAbsoluteContentUrl(c.thumbnail)
                : null,
          }))
        }
      })
      .catch((err) => {
        if (!cancelled && err instanceof Error) showToast(err.message, 'error')
      })
    return () => {
      cancelled = true
    }
  }, [orgId, courseId])

  const fetchNodes = async (moduleId: string | number) => {
    if (!orgId || !effectiveCourseId || !moduleId) return
    try {
      const nodes = await getModuleNodesApi(orgId, effectiveCourseId, moduleId)
      setApiNodesByModule((p) => ({ ...p, [String(moduleId)]: nodes }))
    } catch {
      setApiNodesByModule((p) => ({ ...p, [String(moduleId)]: [] }))
    }
  }

  const fetchModules = async () => {
    if (!orgId || !effectiveCourseId) return
    try {
      const mods = await getCourseModulesApi(orgId, effectiveCourseId)
      setApiModules(mods)
      await Promise.all(mods.map((m) => fetchNodes(String(m.id))))
    } catch (err) {
      // keep UI usable even if API is unavailable
      setApiModules([])
      if (err instanceof Error) showToast(err.message, 'error')
    }
  }

  useEffect(() => {
    fetchModules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, effectiveCourseId])

  // Auto-load nodes for visible modules when managing a course.
  useEffect(() => {
    if (!orgId || !effectiveCourseId) return
    if (visibleApiModules.length === 0) return
    Promise.all(visibleApiModules.map((m) => fetchNodes(String(m.id)))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, effectiveCourseId, visibleApiModules.map((m) => m.id).join(',')])

  const addLevelField = () => setLevelDrafts((p) => [...p, { id: newClientId('lvl'), value: '' }])

  const getApiCourseStatusLabel = (): 'Published' | 'Draft' => (courseForm.status === 'published' ? 'Published' : 'Draft')

  const handleCreateNewCourseOnly = async () => {
    if (!orgId) {
      showToast('Organization not found.', 'error')
      return
    }
    if (isBlank(courseForm.name)) {
      showToast('Course name is required.', 'warning')
      return
    }
    setCreatingCourse(true)
    try {
      const created = await createCourseApi(orgId, {
        title: courseForm.name.trim(),
        description: courseForm.description.trim() || undefined,
        status: getApiCourseStatusLabel(),
        teachers: courseForm.teachers.length > 0 ? courseForm.teachers : undefined,
        thumbnail: courseForm.thumbnailFile ?? undefined,
      })
      addCourseTrack({
        name: created.title,
        description: created.description ?? undefined,
        status: toCourseStatus(created.status),
      })
      showToast('Course created.', 'success')
      navigate(`/org-admin/content/${created.id}`, { replace: true })
      refresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create course.', 'error')
    } finally {
      setCreatingCourse(false)
    }
  }

  const fetchModulesForLevelChecks = async (ids: { orgId: string; effectiveCourseId: string | number }) => {
    if (apiModules.length > 0) return apiModules
    try {
      return await getCourseModulesApi(ids.orgId, ids.effectiveCourseId)
    } catch {
      return apiModules
    }
  }

  const handleCreateLevels = async () => {
    if (!courseId) {
      if (levelEditModal || programModalState) return
      showToast('Save the course before adding levels.', 'warning')
      return
    }
    const ids = requireOrgAndCourseIds(orgId, effectiveCourseId, (m) => showToast(m, 'error'))
    if (!ids) return
    const names = levelDrafts.map((n) => n.value.trim()).filter(Boolean)
    if (names.length === 0) return

    const modulesForChecks = await fetchModulesForLevelChecks(ids)

    // avoid duplicates (case-insensitive)
    const existingNames = new Set(
      (trackId ? levels.map((l) => l.name) : modulesForChecks.map((m) => String(m.title ?? ''))).map((n) =>
        n.toLowerCase(),
      ),
    )
    const uniqueToCreate = names.filter((n) => !existingNames.has(n.toLowerCase()))

    const lastOrder = trackId
      ? sortedLevels.at(-1)?.order ?? 0
      : [...modulesForChecks]
          .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
          .at(-1)?.sequence_order ?? 0
    let nextOrder = lastOrder + 1
    try {
      for (const name of uniqueToCreate) {
        // backend API: modules == levels
        const created = await createCourseModuleApi(ids.orgId, ids.effectiveCourseId, {
          title: name,
          description: '',
          sequence_order: nextOrder,
        })
        // keep current UI/store in sync (until full course-builder is fully API-driven)
        if (trackId) addCourseLevel({ trackId, name, order: nextOrder })
        setApiModules((p) => [...p, created])
        nextOrder++
      }
      setLevelDrafts([{ id: newClientId('lvl'), value: '' }])
      refresh()
      showToast('Level(s) created.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create levels.', 'error')
    }
  }

  const [phaseDraftsByModule, setPhaseDraftsByModule] = useState<Record<string, PhaseDraftRow[]>>({})
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set())
  const togglePhase = (id: number) =>
    setCollapsedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())
  const toggleModule = (id: string) =>
    setCollapsedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  /** Scroll from a "Created levels" row down to that level in "Levels & Programs". */
  const [highlightedModuleId, setHighlightedModuleId] = useState<string | null>(null)
  const handleSelectLevel = (lvl: ApiCourseModule) => {
    const moduleId = String(lvl.id)
    // Expand the level so its programs are visible before scrolling.
    if (collapsedModules.has(moduleId)) toggleModule(moduleId)
    setHighlightedModuleId(moduleId)
    // Two frames so the scroll target has re-rendered (expanded) before we scroll.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document
          .getElementById(`level-programs-${moduleId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }),
    )
  }
  useEffect(() => {
    if (!highlightedModuleId) return
    const t = setTimeout(() => setHighlightedModuleId(null), 1600)
    return () => clearTimeout(t)
  }, [highlightedModuleId])
  const [programModalState, setProgramModalState] = useState<ProgramModalState | null>(null)
  const [programForm, setProgramForm] = useState({
    title: '',
    description: '',
  })

  const openProgramModal = (
    moduleId: string,
    opts?: { apiNodeId?: string; localDraftClientId?: string; flatProgramId?: string }
  ) => {
    if (!moduleId) return
    if (opts?.localDraftClientId) {
      const d = phaseDraftsByModule[moduleId]?.find((x) => x.clientId === opts.localDraftClientId)
      if (d) setProgramForm({ title: d.title, description: d.description })
    } else if (opts?.apiNodeId) {
      const list = apiNodesByModule[moduleId] ?? []
      const n = list.find((x) => String(x.id) === String(opts.apiNodeId))
      if (n) setProgramForm({ title: n.title, description: n.description ?? '' })
    } else if (opts?.flatProgramId) {
      const p = getProgramsByLevel(moduleId).find((x) => x.id === opts.flatProgramId)
      if (p) setProgramForm({ title: p.title, description: p.description ?? '' })
    } else {
      setProgramForm({ title: '', description: '' })
    }
    setProgramModalState({
      moduleId,
      apiNodeId: opts?.apiNodeId,
      localDraftClientId: opts?.localDraftClientId,
      flatProgramId: opts?.flatProgramId,
    })
  }

  const handleSaveProgram = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!programModalState) return
    const nextTitle = programForm.title.trim()
    if (!nextTitle) {
      showToast('Phase title is required.', 'warning')
      return
    }
    const nextDesc = programForm.description.trim() || ''
    const mid = programModalState.moduleId
    const isApiLevel = apiModules.some((m) => String(m.id) === mid)
    if (!isApiLevel) {
      if (programModalState.flatProgramId) {
        updateProgram(programModalState.flatProgramId, {
          title: nextTitle,
          description: nextDesc,
        })
        showToast('Phase updated.', 'success')
      } else {
        if (!trackId) {
          showToast('Course not saved yet. Please save it first.', 'error')
          return
        }
        addProgram({
          levelId: mid,
          trackId,
          title: nextTitle,
          description: nextDesc,
          status: 'draft',
        })
        showToast('Phase added.', 'success')
      }
      closeProgramModal()
      refresh()
      return
    }
    if (programModalState.apiNodeId) {
      if (!orgId || !effectiveCourseId) {
        showToast('Organization not found.', 'error')
        return
      }
      try {
        await updateModuleNodeApi(orgId, effectiveCourseId, mid, programModalState.apiNodeId, {
          title: nextTitle,
          description: nextDesc,
        })
        await fetchNodes(mid)
        showToast('Phase updated.', 'success')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to update phase.', 'error')
      }
      closeProgramModal()
      return
    }
    const isEditingDraft = !!programModalState.localDraftClientId
    if (!isEditingDraft && !canCreateDraftInApiLevel(mid, nextTitle)) {
      showToast('A phase with this title already exists in this level.', 'warning')
      return
    }
    if (programModalState.localDraftClientId) {
      updateDraftPhase(mid, programModalState.localDraftClientId, nextTitle, nextDesc)
      showToast('Draft phase updated.', 'success')
    } else {
      addDraftPhase(mid, nextTitle, nextDesc)
      showToast('Phase added.', 'success')
    }
    closeProgramModal()
    refresh()
  }

  const removePhaseDraft = (moduleId: string, clientId: string) => {
    setPhaseDraftsByModule((prev) => ({
      ...prev,
      [moduleId]: (prev[moduleId] ?? []).filter((d) => d.clientId !== clientId),
    }))
  }

  const openAddPhaseForModule = async (moduleId: string) => {
    await fetchNodes(moduleId)
    openProgramModal(moduleId)
  }

  const openApiPhaseEdit = async (moduleId: string, nodeId: number) => {
    await fetchNodes(moduleId)
    openProgramModal(moduleId, { apiNodeId: String(nodeId) })
  }

  const openDraftPhaseEdit = (moduleId: string, clientId: string) => {
    openProgramModal(moduleId, { localDraftClientId: clientId })
  }

  const deleteApiPhase = async (moduleId: string, nodeId: number) => {
    if (!orgId || !effectiveCourseId) return
    if (!(await requestConfirm('Delete this phase and its items?'))) return
    try {
      await deleteModuleNodeApi(orgId, effectiveCourseId, moduleId, nodeId)
      await fetchNodes(moduleId)
      showToast('Phase deleted.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete phase.', 'error')
    }
  }

  const deleteDraftPhase = async (moduleId: string, clientId: string) => {
    const ok = await requestConfirm('Delete this phase draft?')
    if (!ok) return
    removePhaseDraft(moduleId, clientId)
    showToast('Phase deleted.', 'success')
  }

  const closeProgramModal = () => setProgramModalState(null)

  const canCreateDraftInApiLevel = (mid: string, title: string): boolean => {
    const titleKey = title.trim().toLowerCase()
    const existingRoots = (apiNodesByModule[mid] ?? []).filter(isRootModuleNode)
    const alreadyOnServer = existingRoots.some((n) => String(n.title).trim().toLowerCase() === titleKey)
    const alreadyDraft = (phaseDraftsByModule[mid] ?? []).some((d) => String(d.title).trim().toLowerCase() === titleKey)
    return !(alreadyOnServer || alreadyDraft)
  }

  const updateDraftPhase = (mid: string, clientId: string, title: string, description: string) => {
    setPhaseDraftsByModule((prev) => ({
      ...prev,
      [mid]: (prev[mid] ?? []).map((d) => (d.clientId === clientId ? { ...d, title, description } : d)),
    }))
  }

  const addDraftPhase = (mid: string, title: string, description: string) => {
    const clientId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : newClientId('pd')
    setPhaseDraftsByModule((prev) => ({
      ...prev,
      [mid]: [...(prev[mid] ?? []), { clientId, title, description }],
    }))
  }

  const itemsToQuestionsInput = (assessmentId: string) => {
    const questions = getQuestions(assessmentId) ?? []
    return buildQuestionsInputJson(
      questions.map((q) => ({
        text: q.text,
        options: (q.options ?? []).map((o) => o.text),
        correctIndices: (q.options ?? []).flatMap((o, i) => (o.isCorrect ? [i] : [])),
        multiSelect: q.allowMultipleCorrect ?? false,
      })),
    )
  }

  const commitProgramItems = async (
    moduleId: string,
    prerequisiteNodeId: number,
    programId: string,
    nextOrderRef: { value: number },
    ids: { orgId: string; effectiveCourseId: string | number },
  ) => {
    const resList = getProgramResources(programId)
    for (const r of resList) {
      const typeLabel = resourceTypeToLabel(r.type)
      await createModuleNodeApi(ids.orgId, ids.effectiveCourseId, moduleId, {
        title: r.title,
        description: r.focusNotes ?? '',
        sequence_order: nextOrderRef.value++,
        prerequisite_node: prerequisiteNodeId,
        learning_material_content_type: typeLabel,
        learning_material_content_url: r.url || undefined,
        focus_areas: r.focusNotes ?? undefined,
        quick_outline: r.outline ?? undefined,
      })
    }

    const tList = getProgramTasks(programId)
    for (const t of tList) {
      const fmt = new Set(t.requiredSubmissionFormats ?? [])
      await createModuleNodeApi(ids.orgId, ids.effectiveCourseId, moduleId, {
        title: t.title,
        description: '',
        sequence_order: nextOrderRef.value++,
        prerequisite_node: prerequisiteNodeId,
        task_title: t.title,
        task_description: t.description,
        task_attachment: t.attachment ?? undefined,
        task_allow_link: fmt.has('link'),
        task_allow_paragraph: fmt.has('paragraph'),
        task_allow_pdf: fmt.has('pdf'),
        task_allow_screenshot: fmt.has('screenshot'),
        task_allow_code_block: fmt.has('codeblock'),
        task_allow_file: fmt.has('file'),
      })
    }

    const aList = getProgramAssessments(programId)
    for (const a of aList) {
      const questions = getQuestions(a.id) ?? []
      const hasMultipleCorrect = questions.some((q) => q.allowMultipleCorrect)
      await createModuleNodeApi(ids.orgId, ids.effectiveCourseId, moduleId, {
        title: a.name,
        description: '',
        sequence_order: nextOrderRef.value++,
        prerequisite_node: prerequisiteNodeId,
        quiz_name: a.name,
        quiz_timer_minutes: a.durationMinutes,
        quiz_allow_multiple_correct: hasMultipleCorrect || undefined,
        questions_input: itemsToQuestionsInput(a.id),
      })
    }

  }

  const clearQueuedLocalItems = (programIdsToClear: Set<string>) => {
    for (const pid of programIdsToClear) {
      for (const r of getProgramResources(pid)) removeProgramResource(r.id)
      for (const t of getProgramTasks(pid)) removeProgramTask(t.id)
      for (const a of getProgramAssessments(pid)) removeProgramAssessment(a.id)
    }
  }

  const commitSingleModule = async (
    m: ApiCourseModule,
    ids: ReturnType<typeof requireOrgAndCourseIds>,
    programIdsToClear: Set<string>,
  ) => {
    if (!ids || !orgId || !effectiveCourseId) return
    const moduleId = String(m.id)
    await fetchNodes(moduleId)
    const current = apiNodesByModule[moduleId] ?? []
    const nextOrderRef = { value: (current.at(-1)?.sequence_order ?? current.length) + 1 }

    for (const d of phaseDraftsByModule[moduleId] ?? []) {
      const createdPhase = await createModuleNodeApi(orgId, effectiveCourseId, moduleId, {
        title: d.title,
        description: d.description || '',
        sequence_order: nextOrderRef.value++,
      })
      const draftProgramId = `draft:${moduleId}:${d.clientId}`
      programIdsToClear.add(draftProgramId)
      await commitProgramItems(moduleId, createdPhase.id, draftProgramId, nextOrderRef, ids)
    }

    for (const p of (apiNodesByModule[moduleId] ?? []).filter(isRootModuleNode)) {
      const progId = `api-phase:${moduleId}:${p.id}`
      const hasLocalAdditions =
        getProgramResources(progId).length > 0 ||
        getProgramTasks(progId).length > 0 ||
        getProgramAssessments(progId).length > 0
      if (hasLocalAdditions) {
        programIdsToClear.add(progId)
        await commitProgramItems(moduleId, p.id, progId, nextOrderRef, ids)
      }
    }
  }

  const handleCommitCurriculum = async () => {
    if (committingCurriculum) return
    if (!orgId || !effectiveCourseId) {
      showToast('Save the course first.', 'warning')
      return
    }

    // Check if there are any pending changes to commit
    const hasDraftPhases = Object.values(phaseDraftsByModule).some((drafts) => drafts.length > 0)
    const hasLocalAdditions = apiModules.some((m) => {
      const moduleId = String(m.id)
      return (apiNodesByModule[moduleId] ?? []).filter(isRootModuleNode).some((p) => {
        const progId = `api-phase:${moduleId}:${p.id}`
        return (
          getProgramResources(progId).length > 0 ||
          getProgramTasks(progId).length > 0 ||
          getProgramAssessments(progId).length > 0
        )
      })
    })

    if (!hasDraftPhases && !hasLocalAdditions) {
      showToast('No changes to save.', 'info')
      return
    }

    setCommittingCurriculum(true)
    try {
      const ids = requireOrgAndCourseIds(orgId, effectiveCourseId, (m) => showToast(m, 'warning'))
      if (!ids) return
      const programIdsToClear = new Set<string>()

      for (const m of apiModules) {
        await commitSingleModule(m, ids, programIdsToClear)
      }

      const toastMsg = courseId && courseId !== 'new' ? 'Curriculum updated.' : 'Curriculum created.'
      showToast(toastMsg, 'success')
      setPhaseDraftsByModule({})
      clearQueuedLocalItems(programIdsToClear)
      await fetchModules()

      if (!courseId || courseId === 'new') {
        navigate('/org-admin/content')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create curriculum.', 'error')
    } finally {
      setCommittingCurriculum(false)
    }
  }

  const handleSaveLevelEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!orgId || !levelEditModal) return
    const nextTitle = levelEditModal.title.trim()
    if (!nextTitle) {
      showToast('Level name is required.', 'warning')
      return
    }
    try {
      await updateCourseModuleApi(orgId, levelEditModal.courseId, levelEditModal.moduleId, {
        title: nextTitle,
      })
      // keep visibility mapping in sync
      if (trackId) {
        const local = levels.find((l) => l.name.toLowerCase() === levelEditModal.prevTitle.toLowerCase())
        if (local) updateCourseLevel(local.id, { name: nextTitle })
      }
      await fetchModules()
      showToast('Level updated.', 'success')
      setLevelEditModal(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update level.', 'error')
    }
  }

  const handleSaveNodeContent = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!orgId || !effectiveCourseId || !nodeEditModal) return
    const title = nodeEditModal.title.trim()
    if (!title) { showToast('Title is required.', 'warning'); return }
    const fileProvided = nodeEditModal.contentType !== 'link' && !!nodeEditModal.contentFile
    const urlProvided = nodeEditModal.contentUrl.trim().length > 0
    const save = () =>
      updateModuleNodeApi(orgId, effectiveCourseId, nodeEditModal.moduleId, nodeEditModal.nodeId, {
        title,
        description: nodeEditModal.description ?? '',
        ...(nodeEditModal.contentType && nodeEditModal.contentType !== nodeEditModal.originalContentType ? { learning_material_content_type: nodeEditModal.contentType } : {}),
        // A freshly uploaded file wins over the URL field; otherwise keep the URL behaviour.
        ...(fileProvided
          ? { learning_material_content_file: nodeEditModal.contentFile ?? undefined }
          : urlProvided
            ? { learning_material_content_url: nodeEditModal.contentUrl.trim() || undefined }
            : {}),
        focus_areas: nodeEditModal.focusAreas.trim() || undefined,
        quick_outline: nodeEditModal.quickOutline.trim() || undefined,
      })
    if (fileProvided) {
      // Uploads can be slow — close the modal right away and let the toast
      // track progress in the background so the user can keep working.
      const moduleId = nodeEditModal.moduleId
      setNodeEditModal(null)
      withUploadToast('content', save, { successMessage: 'Item updated.' })
        .then(() => fetchNodes(moduleId))
        .catch(() => {})
      return
    }
    try {
      await save()
      showToast('Item updated.', 'success')
      await fetchNodes(nodeEditModal.moduleId)
      setNodeEditModal(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update item.', 'error')
    }
  }

  const handleSaveNodeTask = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!orgId || !effectiveCourseId || !nodeEditModal) return
    const taskTitle = nodeEditModal.taskTitle.trim()
    if (!taskTitle) { showToast('Title is required.', 'warning'); return }
    const formats = SUBMISSION_FORMATS.filter((f) => {
      if (f.id === 'link') return nodeEditModal.taskAllowLink
      if (f.id === 'paragraph') return nodeEditModal.taskAllowParagraph
      if (f.id === 'pdf') return nodeEditModal.taskAllowPdf
      if (f.id === 'screenshot') return nodeEditModal.taskAllowScreenshot
      if (f.id === 'codeblock') return nodeEditModal.taskAllowCodeBlock
      if (f.id === 'file') return nodeEditModal.taskAllowFile
      return false
    })
    if (formats.length === 0) { showToast('Select at least one submission format.', 'warning'); return }
    const fileProvided = !!nodeEditTaskNewFile
    const save = () =>
      updateModuleNodeApi(orgId, effectiveCourseId, nodeEditModal.moduleId, nodeEditModal.nodeId, {
        title: taskTitle,
        task_title: taskTitle,
        task_description: nodeEditModal.taskDescription || undefined,
        task_attachment: nodeEditTaskNewFile ?? undefined,
        task_allow_link: nodeEditModal.taskAllowLink,
        task_allow_paragraph: nodeEditModal.taskAllowParagraph,
        task_allow_pdf: nodeEditModal.taskAllowPdf,
        task_allow_screenshot: nodeEditModal.taskAllowScreenshot,
        task_allow_code_block: nodeEditModal.taskAllowCodeBlock,
        task_allow_file: nodeEditModal.taskAllowFile,
      })
    if (fileProvided) {
      // Uploads can be slow — close the modal right away and let the toast
      // track progress in the background so the user can keep working.
      const moduleId = nodeEditModal.moduleId
      setNodeEditModal(null)
      setNodeEditTaskNewFile(null)
      withUploadToast('attachment', save, { successMessage: 'Task updated.' })
        .then(() => fetchNodes(moduleId))
        .catch(() => {})
      return
    }
    try {
      await save()
      showToast('Task updated.', 'success')
      await fetchNodes(nodeEditModal.moduleId)
      setNodeEditModal(null)
      setNodeEditTaskNewFile(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update task.', 'error')
    }
  }

  // ── Quiz builder page (inline within layout) ─────────────────────────────
  if (quizPageConfig) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        {quizPageConfig.editingAssessmentId ? (
          <QuizBuilderPage
            mode="local-edit"
            programId={quizPageConfig.programId}
            editingAssessmentId={quizPageConfig.editingAssessmentId}
            refresh={refresh}
            onClose={closeQuizPage}
          />
        ) : (
          <QuizBuilderPage
            mode="local-add"
            programId={quizPageConfig.programId}
            apiCurriculum={undefined}
            apiIds={
              orgId && effectiveCourseId && quizPageConfig.moduleId
                ? {
                    orgId,
                    effectiveCourseId,
                    moduleId: quizPageConfig.moduleId,
                    phaseNodeId: quizPageConfig.phaseNodeId,
                    phaseDraft: quizPageConfig.phaseDraft,
                    onDraftCommitted: quizPageConfig.onDraftCommitted,
                  }
                : undefined
            }
            refresh={async () => {
              await refresh()
              if (quizPageConfig.moduleId) await fetchNodes(quizPageConfig.moduleId)
            }}
            onClose={closeQuizPage}
          />
        )}
      </div>
    )
  }

  // ── API Edit-Quiz page (inline within layout) ─────────────────────────────
  if (nodeEditModal?.nodeType === 'quiz') {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <QuizBuilderPage
          mode="api"
          orgId={orgId}
          effectiveCourseId={effectiveCourseId ?? ''}
          moduleId={nodeEditModal.moduleId}
          nodeId={nodeEditModal.nodeId}
          initialState={{
            quizName: nodeEditModal.quizName,
            quizTimerMinutes: nodeEditModal.quizTimerMinutes,
            quizQuestions: nodeEditModal.quizQuestions,
          }}
          refresh={async () => {
            await fetchNodes(nodeEditModal.moduleId)
          }}
          onClose={() => setNodeEditModal(null)}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6">
      <BackButton label="Back to Courses" onClick={() => navigate('/org-admin/content')} />

      <CourseDetailsCard
        form={courseForm}
        setForm={setCourseForm}
        isEditMode={isEditMode}
        creatingCourse={creatingCourse}
        createButtonLabel={createButtonLabel}
        onSubmit={handleSaveCourseMeta}
        onCreateNew={handleCreateNewCourseOnly}
      />

      {/* Levels setup (outside course create/edit form) */}
      <CourseStructureCard
        visibleApiModules={visibleApiModules}
        levelDrafts={levelDrafts}
        showAddLevelForm={showAddLevelForm}
        onShowAddLevelForm={() => setShowAddLevelForm(true)}
        onAddLevelField={addLevelField}
        onRemoveLevelDraftAt={handleRemoveLevelDraftAt}
        onUpdateLevelDraftValueAt={updateLevelDraftValueAt}
        onCloseAddLevelForm={closeAddLevelForm}
        onCreateLevels={handleCreateLevels}
        onEditLevel={openLevelEdit}
        onDeleteLevel={deleteLevel}
        onSelectLevel={handleSelectLevel}
      />

      {orgId && !courseId && (
        <PageCard title="Levels & Programs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
            <Button
              size="lg"
              fullWidth
              className="sm:w-auto"
              loading={creatingCourse}
              loadingText="Creating…"
              onClick={handleCreateNewCourseOnly}
            >
              Create Course
            </Button>
          </div>
        </PageCard>
      )}

      {orgId && effectiveCourseId && visibleApiModules.length > 0 && (
        <LevelProgramsSection
          visibleApiModules={visibleApiModules}
          highlightedModuleId={highlightedModuleId}
          apiNodesByModule={apiNodesByModule}
          phaseDraftsByModule={phaseDraftsByModule}
          collapsedModules={collapsedModules}
          collapsedPhases={collapsedPhases}
          toggleModule={toggleModule}
          togglePhase={togglePhase}
          onAddPhase={openAddPhaseForModule}
          onEditDraftPhase={openDraftPhaseEdit}
          onDeleteDraftPhase={deleteDraftPhase}
          onRemovePhaseDraft={removePhaseDraft}
          onEditApiPhase={openApiPhaseEdit}
          onDeleteApiPhase={deleteApiPhase}
          orgId={orgId}
          effectiveCourseId={effectiveCourseId}
          refresh={refresh}
          requestConfirm={requestConfirm}
          nodeEditLoading={nodeEditLoading}
          setNodeEditLoading={setNodeEditLoading}
          setNodeEditModal={setNodeEditModal}
          onOpenQuiz={openQuizPage}
          fetchNodes={fetchNodes}
          committingCurriculum={committingCurriculum}
          onCommit={handleCommitCurriculum}
          commitLabel={commitLabel}
        />
      )}

      {courseForm.useLevels === false && trackId && (
        <PageCard title="Phases (no levels)">
          <p className="text-sm text-slate-600 mb-3">
            You can attach one or more programs directly under this course without Beginner/Intermediate/Advanced levels.
          </p>
          {/* Reuse a single bucket level */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
            <button
              type="button"
              onClick={() => flatBucketLevelId && openProgramModal(flatBucketLevelId)}
              className="mb-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              Add Chapter
            </button>
            {flatPrograms.length === 0 ? (
              <p className="text-xs text-slate-500">No programs yet.</p>
            ) : (
              <div className="space-y-2">
                {flatPrograms.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{p.description ?? '—'}</p>
                      </div>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-brand-teal"
                        onClick={() => openProgramModal(flatBucketLevelId, { flatProgramId: p.id })}
                      >
                        Edit
                      </button>
                    </div>
                    <ProgramInner
                      programId={p.id}
                      orgId={orgId}
                      effectiveCourseId={effectiveCourseId ?? undefined}
                      refresh={refresh}
                      requestConfirm={requestConfirm}
                      nodeEditLoading={nodeEditLoading}
                      setNodeEditLoading={setNodeEditLoading}
                      setNodeEditModal={setNodeEditModal}
                      onOpenQuiz={openQuizPage}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageCard>
      )}

      {programModalState && (
        <ProgramModal
          state={programModalState}
          form={programForm}
          onChange={setProgramForm}
          onSubmit={handleSaveProgram}
          onClose={closeProgramModal}
        />
      )}

      {levelEditModal && (
        <LevelEditModal
          state={levelEditModal}
          setState={setLevelEditModal}
          onSubmit={handleSaveLevelEdit}
          onClose={() => setLevelEditModal(null)}
        />
      )}

      {nodeEditModal?.nodeType === 'content' && (
        <NodeEditContentModal
          state={nodeEditModal}
          setState={setNodeEditModal}
          onSubmit={handleSaveNodeContent}
          onClose={() => setNodeEditModal(null)}
        />
      )}

      {nodeEditModal?.nodeType === 'task' && (
        <NodeEditTaskModal
          state={nodeEditModal}
          setState={setNodeEditModal}
          newFile={nodeEditTaskNewFile}
          setNewFile={setNodeEditTaskNewFile}
          fileInputRef={nodeEditTaskFileRef}
          onSubmit={handleSaveNodeTask}
          onClose={() => { setNodeEditModal(null); setNodeEditTaskNewFile(null) }}
        />
      )}

      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={() => handleConfirmClose(true)}
        onCancel={() => handleConfirmClose(false)}
      />
    </div>
  )
}
