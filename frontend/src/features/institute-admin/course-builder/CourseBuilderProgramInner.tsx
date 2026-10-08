// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { showToast } from '@/lib/toastApi'
import { reorderChapterNodesApi, reorderModuleNodesApi, type ApiModuleNode } from '@/lib/api/organizations'
import {
  getProgramResources,
  getProgramTasks,
  getProgramAssessments,
  removeProgramAssessment,
  removeProgramResource,
  removeProgramTask,
  type ProgramAssessment,
  type ProgramResource,
  type ProgramTask,
} from '../store'
import type { ApiCurriculumContext, LocalCurriculumItem, NodeEditModalState } from './courseBuilderProgramHelpers'
import { ApiNodeRow, LocalItemRow } from './CourseBuilderProgramRows'
import { ResourceModal, TaskModal, QuizDrawer } from './CourseBuilderProgramModals'
import type { ItemCreateContext } from './curriculumItemApi'

/** Details a quiz editor needs to POST a new quiz node under the right chapter. */
export type OpenQuizContext = {
  moduleId?: string
  chapterId?: number | null
}

// Helpers and previews live in ./courseBuilderProgramHelpers and
// ./courseBuilderContentPreview; only types are re-exported here so this file
// exports components only (keeps React Fast Refresh working).
export type { ApiCurriculumContext, NodeEditModalState } from './courseBuilderProgramHelpers'

export type ProgramInnerProps = Readonly<{
  programId: string
  apiCurriculum?: ApiCurriculumContext
  /** Nodes saved under this phase (from GET after curriculum POST). */
  apiChildNodes?: ApiModuleNode[]
  orgId?: string
  effectiveCourseId?: string | number
  refresh: () => void
  requestConfirm: (message: string, confirmText?: string, cancelText?: string) => Promise<boolean>
  nodeEditLoading: number | null
  setNodeEditLoading: (value: number | null) => void
  setNodeEditModal: (value: NodeEditModalState | null) => void
  onViewSubmissions?: (nodeId: number) => void
  /** Optional phase title/description to display above the curriculum section */
  phaseTitle?: string
  phaseDescription?: string
  /** When provided, quiz creation/editing opens as a full page instead of a drawer */
  onOpenQuiz?: (
    programId: string,
    editingAssessmentId: string | null,
    ctx?: OpenQuizContext,
  ) => void
}>

const ADD_ITEM_OPTIONS = [
  { key: 'resource', label: '+ Resource / Content' },
  { key: 'task', label: '+ Task' },
  { key: 'quiz', label: '+ Quiz' },
] as const

type AddItemKey = (typeof ADD_ITEM_OPTIONS)[number]['key']

/** "Add Item" dropdown button with click-outside dismissal. */
function AddItemMenu({ onSelect }: Readonly<{ onSelect: (key: AddItemKey) => void }>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-teal text-white flex items-center gap-1.5 shadow-sm hover:opacity-95"
      >
        Add Item
        <svg
          className={`w-3 h-3 pt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-44 rounded-xl bg-white shadow-xl border border-slate-200 py-1"
          role="menu"
        >
          {ADD_ITEM_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSelect(opt.key)
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-teal"
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function EmptyCurriculum({ hint }: Readonly<{ hint?: string }>) {
  return (
    <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      <p className="text-xs text-slate-500 font-medium">No items yet.</p>
      {hint ? <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p> : null}
    </div>
  )
}

/** Vertical timeline line behind the curriculum list. */
function TimelineRail() {
  return <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200" />
}

// Stable default: a fresh `[]` on every render would retrigger the effect that
// copies apiChildNodes into state, re-rendering forever.
const NO_CHILD_NODES: ApiModuleNode[] = []

export function ProgramInner({
  programId,
  apiCurriculum,
  apiChildNodes = NO_CHILD_NODES,
  orgId,
  effectiveCourseId,
  refresh,
  requestConfirm,
  nodeEditLoading,
  setNodeEditLoading,
  setNodeEditModal,
  onViewSubmissions,
  phaseTitle,
  phaseDescription,
  onOpenQuiz,
}: ProgramInnerProps) {
  const curriculumModuleId: string | undefined = apiCurriculum?.moduleId

  // When the phase is backed by a real course/module, new items POST to the
  // server immediately (no deferred "Save Curriculum" step). Absent for
  // purely-local courses, where items stay in the local store.
  const immediateCreate: ItemCreateContext | undefined =
    apiCurriculum && effectiveCourseId != null
      ? {
          orgId: apiCurriculum.orgId,
          effectiveCourseId,
          moduleId: apiCurriculum.moduleId,
          chapterId: apiCurriculum.chapterId,
        }
      : undefined

  // After creating an item, reload this module's nodes so the new node appears.
  const handleItemSaved = async () => {
    if (apiCurriculum) await apiCurriculum.refresh()
    refresh()
  }

  // Sortable local copy of apiChildNodes — updated on drag-end.
  const [sortedNodes, setSortedNodes] = useState<ApiModuleNode[]>(apiChildNodes)
  useEffect(() => {
    setSortedNodes(apiChildNodes)
  }, [apiChildNodes])

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Modal/drawer state: each holds the item being edited (null = creating new).
  const [resourceModal, setResourceModal] = useState<{ open: boolean; editing: ProgramResource | null }>({
    open: false,
    editing: null,
  })
  const [taskModal, setTaskModal] = useState<{ open: boolean; editing: ProgramTask | null }>({ open: false, editing: null })
  const [quizDrawer, setQuizDrawer] = useState<{ open: boolean; editing: ProgramAssessment | null }>({
    open: false,
    editing: null,
  })

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (!orgId || !effectiveCourseId || !apiCurriculum) return

    const oldIndex = sortedNodes.findIndex((n) => n.id === active.id)
    const newIndex = sortedNodes.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedNodes, oldIndex, newIndex)
    setSortedNodes(reordered) // optimistic update

    const original = sortedNodes
    const nodeIds = reordered.map((n) => n.id)
    try {
      // One atomic request; items outside any chapter use the module-scoped endpoint.
      if (apiCurriculum.chapterId == null) {
        await reorderModuleNodesApi(orgId, effectiveCourseId, apiCurriculum.moduleId, nodeIds)
      } else {
        await reorderChapterNodesApi(orgId, effectiveCourseId, apiCurriculum.moduleId, apiCurriculum.chapterId, nodeIds)
      }
      showToast('Order saved.', 'success')
      apiCurriculum.refresh()
    } catch {
      showToast('Failed to save new order. Please try again.', 'error')
      setSortedNodes(original) // rollback
    }
  }

  const allItems: LocalCurriculumItem[] = [
    ...getProgramResources(programId).map((r) => ({ ...r, __itemType: 'Resource' as const })),
    ...getProgramTasks(programId).map((t) => ({ ...t, __itemType: 'Task' as const })),
    ...getProgramAssessments(programId).map((a) => ({ ...a, __itemType: 'Assessment' as const })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const openQuizEditor = (editing: ProgramAssessment | null) => {
    if (onOpenQuiz) {
      onOpenQuiz(programId, editing?.id ?? null, {
        moduleId: curriculumModuleId,
        chapterId: apiCurriculum?.chapterId,
      })
    } else {
      setQuizDrawer({ open: true, editing })
    }
  }

  const handleAddItem = (key: AddItemKey) => {
    if (key === 'resource') setResourceModal({ open: true, editing: null })
    else if (key === 'task') setTaskModal({ open: true, editing: null })
    else openQuizEditor(null)
  }

  const handleEditLocalItem = (item: LocalCurriculumItem) => {
    if (item.__itemType === 'Resource') setResourceModal({ open: true, editing: item })
    else if (item.__itemType === 'Task') setTaskModal({ open: true, editing: item })
    else openQuizEditor(item)
  }

  const handleRemoveLocalItem = async (item: LocalCurriculumItem) => {
    if (!(await requestConfirm('Remove this item from the curriculum?'))) return
    if (item.__itemType === 'Resource') removeProgramResource(item.id)
    else if (item.__itemType === 'Task') removeProgramTask(item.id)
    else removeProgramAssessment(item.id)
    refresh()
    showToast('Item removed.', 'success')
  }

  const localRows = allItems.map((item) => (
    <LocalItemRow
      key={item.id}
      item={item}
      onEdit={handleEditLocalItem}
      onRemove={handleRemoveLocalItem}
    />
  ))

  const renderCurriculum = (): ReactNode => {
    if (apiCurriculum) {
      // API mode still shows queued local items immediately, plus server nodes for this phase.
      if (allItems.length === 0 && apiChildNodes.length === 0) return <EmptyCurriculum />

      return (
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedNodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3 relative">
              <TimelineRail />
              {localRows}
              {sortedNodes.map((node) => (
                <ApiNodeRow
                  key={`api-${node.id}`}
                  node={node}
                  apiCurriculum={apiCurriculum}
                  orgId={orgId}
                  effectiveCourseId={effectiveCourseId}
                  nodeEditLoading={nodeEditLoading}
                  setNodeEditLoading={setNodeEditLoading}
                  setNodeEditModal={setNodeEditModal}
                  onViewSubmissions={onViewSubmissions}
                  requestConfirm={requestConfirm}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )
    }

    if (allItems.length === 0) return <EmptyCurriculum hint="Add a resource to start the curriculum flow." />

    return (
      <ul className="space-y-3 relative">
        <TimelineRail />
        {localRows}
      </ul>
    )
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      {phaseTitle && (
        <div className="mb-3 pb-3 border-b border-slate-100">
          <h4 className="text-base font-bold text-slate-900 leading-tight">{phaseTitle}</h4>
          {phaseDescription && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{phaseDescription}</p>}
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-800 tracking-tight">Curriculum</p>
        <AddItemMenu onSelect={handleAddItem} />
      </div>

      {renderCurriculum()}

      {resourceModal.open && (
        <ResourceModal
          key={resourceModal.editing?.id ?? 'new-resource'}
          programId={programId}
          immediateCreate={immediateCreate}
          editingResource={resourceModal.editing}
          onClose={() => setResourceModal({ open: false, editing: null })}
          onSaved={handleItemSaved}
        />
      )}

      {taskModal.open && (
        <TaskModal
          key={taskModal.editing?.id ?? 'new-task'}
          programId={programId}
          immediateCreate={immediateCreate}
          editingTask={taskModal.editing}
          onClose={() => setTaskModal({ open: false, editing: null })}
          onSaved={handleItemSaved}
        />
      )}

      {quizDrawer.open && (
        <QuizDrawer
          key={quizDrawer.editing?.id ?? 'new-quiz'}
          programId={programId}
          immediateCreate={immediateCreate}
          editingAssessment={quizDrawer.editing}
          onClose={() => setQuizDrawer({ open: false, editing: null })}
          onSaved={handleItemSaved}
        />
      )}
    </div>
  )
}
