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
  createChapterApi,
  createCourseApi,
  createCourseModuleApi,
  deleteChapterApi,
  deleteCourseModuleApi,
  getCoursesApi,
  getCourseModulesApi,
  getModuleChaptersApi,
  getModuleNodesApi,
  updateChapterApi,
  updateCourseApi,
  updateCourseModuleApi,
  updateModuleNodeApi,
  type ApiChapter,
  type ApiCourseModule,
  type ApiModuleNode,
} from '@/lib/api/organizations'
import { useStoreRefresh } from '../useStoreRefresh'
import {
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
} from '../store'
import {
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
import LevelProgramsSection from './LevelProgramsSection'
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

function savedThumbnailUrl(thumbnail: string | null | undefined): string | null {
  return thumbnail ? toAbsoluteContentUrl(thumbnail) : null
}

/** Content fields for an item edit: a freshly uploaded file wins over the URL field. */
function contentSourcePatch(state: NodeEditModalState, fileProvided: boolean, urlProvided: boolean) {
  if (fileProvided) return { learning_material_content_file: state.contentFile ?? undefined }
  if (urlProvided) return { learning_material_content_url: state.contentUrl.trim() || undefined }
  return {}
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
  const [apiChaptersByModule, setApiChaptersByModule] = useState<Record<string, ApiChapter[]>>({})
  const [levelEditModal, setLevelEditModal] = useState<LevelEditModalState | null>(null)
  const isEditMode = Boolean(courseId) && courseId !== 'new'
  const createButtonLabel = creatingCourse ? 'Creating…' : 'Save Course'
  const [nodeEditLoading, setNodeEditLoading] = useState<number | null>(null)
  const [nodeEditModal, setNodeEditModal] = useState<NodeEditModalState | null>(null)
  const nodeEditTaskFileRef = useRef<HTMLInputElement>(null)
  const [nodeEditTaskNewFile, setNodeEditTaskNewFile] = useState<File | null>(null)

  // Quiz builder page state (inline page within layout)
  const [quizPageConfig, setQuizPageConfig] = useState<{
    programId: string
    editingAssessmentId: string | null
    moduleId?: string
    chapterId?: number | null
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
      chapterId: ctx?.chapterId,
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
      setApiNodesByModule((p) => {
        const next = { ...p }
        delete next[String(lvl.id)]
        return next
      })
      setApiChaptersByModule((p) => {
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
            thumbnailPreview: prev.thumbnailFile ? prev.thumbnailPreview : savedThumbnailUrl(c.thumbnail),
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

  /** Loads a module's chapters and items (nodes) together, since items render inside chapters. */
  const fetchNodes = async (moduleId: string | number) => {
    if (!orgId || !effectiveCourseId || !moduleId) return
    const key = String(moduleId)
    const [nodes, chapters] = await Promise.all([
      getModuleNodesApi(orgId, effectiveCourseId, moduleId).catch(() => [] as ApiModuleNode[]),
      getModuleChaptersApi(orgId, effectiveCourseId, moduleId).catch(() => [] as ApiChapter[]),
    ])
    setApiNodesByModule((p) => ({ ...p, [key]: nodes }))
    setApiChaptersByModule((p) => ({ ...p, [key]: chapters }))
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
    void fetchModules()
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
    try {
      // backend API: modules == levels. Each level carries its own sequence_order,
      // so they can be created in parallel.
      const created = await Promise.all(
        uniqueToCreate.map((name, i) =>
          createCourseModuleApi(ids.orgId, ids.effectiveCourseId, {
            title: name,
            description: '',
            sequence_order: lastOrder + 1 + i,
          }),
        ),
      )
      // keep current UI/store in sync (until full course-builder is fully API-driven)
      if (trackId) uniqueToCreate.forEach((name, i) => addCourseLevel({ trackId, name, order: lastOrder + 1 + i }))
      setApiModules((p) => [...p, ...created])
      setLevelDrafts([{ id: newClientId('lvl'), value: '' }])
      refresh()
      showToast('Level(s) created.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create levels.', 'error')
    }
  }

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
    opts?: { chapterId?: number; flatProgramId?: string }
  ) => {
    if (!moduleId) return
    if (opts?.chapterId) {
      const ch = (apiChaptersByModule[moduleId] ?? []).find((x) => x.id === opts.chapterId)
      if (ch) setProgramForm({ title: ch.title, description: ch.description ?? '' })
    } else if (opts?.flatProgramId) {
      const p = getProgramsByLevel(moduleId).find((x) => x.id === opts.flatProgramId)
      if (p) setProgramForm({ title: p.title, description: p.description ?? '' })
    } else {
      setProgramForm({ title: '', description: '' })
    }
    setProgramModalState({
      moduleId,
      chapterId: opts?.chapterId,
      flatProgramId: opts?.flatProgramId,
    })
  }

  /** Chapters of a course that only exists in the local store (no API level). */
  const saveLocalProgram = (state: ProgramModalState, title: string, description: string) => {
    if (state.flatProgramId) {
      updateProgram(state.flatProgramId, { title, description })
      showToast('Phase updated.', 'success')
    } else if (trackId) {
      addProgram({ levelId: state.moduleId, trackId, title, description, status: 'draft' })
      showToast('Phase added.', 'success')
    } else {
      showToast('Course not saved yet. Please save it first.', 'error')
      return
    }
    closeProgramModal()
    refresh()
  }

  /** Creates or renames a chapter on the server; the modal stays open on failure. */
  const saveApiChapter = async (state: ProgramModalState, title: string, description: string) => {
    if (!orgId || !effectiveCourseId) {
      showToast('Organization not found.', 'error')
      return
    }
    const mid = state.moduleId
    const isEdit = Boolean(state.chapterId)
    if (!isEdit && !isChapterTitleAvailable(mid, title)) {
      showToast('A chapter with this title already exists in this level.', 'warning')
      return
    }
    try {
      if (state.chapterId) {
        await updateChapterApi(orgId, effectiveCourseId, mid, state.chapterId, { title, description })
      } else {
        await createChapterApi(orgId, effectiveCourseId, mid, { title, description })
      }
      await fetchNodes(mid)
      showToast(isEdit ? 'Chapter updated.' : 'Chapter added.', 'success')
      closeProgramModal()
    } catch (err) {
      const fallback = isEdit ? 'Failed to update chapter.' : 'Failed to add chapter.'
      showToast(err instanceof Error ? err.message : fallback, 'error')
    }
  }

  const handleSaveProgram = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!programModalState) return
    const nextTitle = programForm.title.trim()
    if (!nextTitle) {
      showToast('Phase title is required.', 'warning')
      return
    }
    const nextDesc = programForm.description.trim()
    const isApiLevel = apiModules.some((m) => String(m.id) === programModalState.moduleId)
    if (isApiLevel) await saveApiChapter(programModalState, nextTitle, nextDesc)
    else saveLocalProgram(programModalState, nextTitle, nextDesc)
  }

  const openAddPhaseForModule = async (moduleId: string) => {
    await fetchNodes(moduleId)
    openProgramModal(moduleId)
  }

  const openChapterEdit = async (moduleId: string, chapterId: number) => {
    await fetchNodes(moduleId)
    openProgramModal(moduleId, { chapterId })
  }

  const deleteChapter = async (moduleId: string, chapterId: number) => {
    if (!orgId || !effectiveCourseId) return
    if (!(await requestConfirm('Delete this chapter and its items?'))) return
    try {
      await deleteChapterApi(orgId, effectiveCourseId, moduleId, chapterId)
      await fetchNodes(moduleId)
      showToast('Chapter deleted.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete chapter.', 'error')
    }
  }

  const closeProgramModal = () => setProgramModalState(null)

  const isChapterTitleAvailable = (mid: string, title: string): boolean => {
    const titleKey = title.trim().toLowerCase()
    return !(apiChaptersByModule[mid] ?? []).some((c) => String(c.title).trim().toLowerCase() === titleKey)
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
        ...contentSourcePatch(nodeEditModal, fileProvided, urlProvided),
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
                    chapterId: quizPageConfig.chapterId,
                  }
                : undefined
            }
            refresh={async () => {
              refresh()
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
          apiChaptersByModule={apiChaptersByModule}
          collapsedModules={collapsedModules}
          collapsedPhases={collapsedPhases}
          toggleModule={toggleModule}
          togglePhase={togglePhase}
          onAddPhase={openAddPhaseForModule}
          onEditChapter={openChapterEdit}
          onDeleteChapter={deleteChapter}
          orgId={orgId}
          effectiveCourseId={effectiveCourseId}
          refresh={refresh}
          requestConfirm={requestConfirm}
          nodeEditLoading={nodeEditLoading}
          setNodeEditLoading={setNodeEditLoading}
          setNodeEditModal={setNodeEditModal}
          onOpenQuiz={openQuizPage}
          fetchNodes={fetchNodes}
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
