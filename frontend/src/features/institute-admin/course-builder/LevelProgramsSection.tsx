// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { CheckSquare, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import PageCard from '@/components/ui/PageCard'
import type { ApiChapter, ApiCourseModule, ApiModuleNode } from '@/lib/api/organizations'
import { ProgramInner, type OpenQuizContext } from './CourseBuilderProgramInner'
import type { NodeEditModalState } from './courseBuilderProgramHelpers'

/** Props ProgramInner needs, threaded unchanged through the level → phase tree. */
interface ProgramInnerBridge {
  orgId: string
  effectiveCourseId: string | number
  refresh: () => void
  requestConfirm: (message: string, confirmText?: string, cancelText?: string) => Promise<boolean>
  nodeEditLoading: number | null
  setNodeEditLoading: (value: number | null) => void
  setNodeEditModal: (value: NodeEditModalState | null) => void
  onOpenQuiz: (programId: string, editingAssessmentId: string | null, ctx?: OpenQuizContext) => void
  fetchNodes: (moduleId: string | number) => Promise<void>
}

interface LevelProgramsSectionProps extends ProgramInnerBridge {
  visibleApiModules: ApiCourseModule[]
  /** Module id to briefly highlight after a user jumps to it from "Created levels". */
  highlightedModuleId?: string | null
  apiNodesByModule: Record<string, ApiModuleNode[]>
  apiChaptersByModule: Record<string, ApiChapter[]>
  collapsedModules: Set<string>
  collapsedPhases: Set<number>
  toggleModule: (id: string) => void
  togglePhase: (id: number) => void
  onAddPhase: (moduleId: string) => Promise<void> | void
  onEditChapter: (moduleId: string, chapterId: number) => Promise<void> | void
  onDeleteChapter: (moduleId: string, chapterId: number) => Promise<void> | void
}

/** A single level card with its chapters and their curriculum items. */
function ModuleAccordion({
  lvl,
  idx,
  bridge,
  isHighlighted,
  apiNodesByModule,
  apiChaptersByModule,
  collapsedModules,
  collapsedPhases,
  toggleModule,
  togglePhase,
  onAddPhase,
  onEditChapter,
  onDeleteChapter,
}: {
  lvl: ApiCourseModule
  idx: number
  bridge: ProgramInnerBridge
  isHighlighted: boolean
} & Pick<
  LevelProgramsSectionProps,
  | 'apiNodesByModule'
  | 'apiChaptersByModule'
  | 'collapsedModules'
  | 'collapsedPhases'
  | 'toggleModule'
  | 'togglePhase'
  | 'onAddPhase'
  | 'onEditChapter'
  | 'onDeleteChapter'
>) {
  const { orgId, effectiveCourseId, refresh, requestConfirm, nodeEditLoading, setNodeEditLoading, setNodeEditModal, onOpenQuiz, fetchNodes } = bridge
  const moduleId = String(lvl.id)
  const list = apiNodesByModule[moduleId] ?? []
  const chapters = apiChaptersByModule[moduleId] ?? []
  // Items saved before chapters existed, or whose chapter was removed.
  const unchaptered = list.filter((n) => n.chapter == null)
  const hasAnyContent = chapters.length > 0 || unchaptered.length > 0
  const isModuleCollapsed = collapsedModules.has(moduleId)

  const programInnerProps = (chapterId: number | null) => ({
    orgId,
    effectiveCourseId,
    refresh,
    requestConfirm,
    nodeEditLoading,
    setNodeEditLoading,
    setNodeEditModal,
    onOpenQuiz,
    apiCurriculum: {
      orgId,
      moduleId,
      chapterId,
      nodesInModule: list.length,
      refresh: () => fetchNodes(moduleId),
    },
  })

  return (
    <div
      id={`level-programs-${moduleId}`}
      className={`scroll-mt-24 rounded-2xl border shadow-sm transition-all bg-emerald-50/40 ${
        isHighlighted ? 'border-brand-teal ring-2 ring-brand-teal/50' : 'border-brand-teal/70'
      }`}
    >
      {/* Step header — click to toggle */}
      <button
        type="button"
        onClick={() => toggleModule(moduleId)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
      >
        <div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Step {idx + 1}</p>
          <p className="mt-1 text-base font-bold text-slate-900 flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4 text-brand-teal" />
            {lvl.title}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200 ${isModuleCollapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!isModuleCollapsed && (
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              type="button"
              onClick={() => { void onAddPhase(moduleId) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-brand-teal/40 bg-white hover:bg-brand-teal/5 text-brand-teal"
            >
              Add Chapter
            </button>
          </div>

          {hasAnyContent ? (
            <div className="space-y-3">
              {unchaptered.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <ProgramInner
                    programId={`unchaptered:${moduleId}`}
                    apiChildNodes={unchaptered}
                    {...programInnerProps(null)}
                  />
                </div>
              )}

              {chapters.map((ch) => {
                const childNodes = list.filter((n) => n.chapter === ch.id)
                const isCollapsed = collapsedPhases.has(ch.id)
                return (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-slate-200 bg-white hover:border-brand-teal/70 hover:shadow-sm transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => togglePhase(ch.id)}
                      className="w-full flex items-center justify-between gap-2 p-3.5 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{ch.title}</p>
                        {ch.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ch.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {childNodes.length} item{childNodes.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-brand-teal/30 hover:text-brand-teal"
                          onClick={(e) => {
                            e.stopPropagation()
                            void onEditChapter(moduleId, ch.id)
                          }}
                          aria-label="Edit phase"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            void onDeleteChapter(moduleId, ch.id)
                          }}
                          aria-label="Delete phase"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                        />
                      </div>
                    </button>
                    {!isCollapsed && (
                      <div className="border-t border-slate-100 rounded-b-xl bg-slate-50/40 p-3">
                        <ProgramInner
                          programId={`chapter:${moduleId}:${ch.id}`}
                          apiChildNodes={childNodes}
                          {...programInnerProps(ch.id)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No programs added for this level yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

/** "Levels & Programs" card: every level as a collapsible accordion of phases. */
export default function LevelProgramsSection({
  visibleApiModules,
  ...rest
}: Readonly<LevelProgramsSectionProps>) {
  const bridge: ProgramInnerBridge = {
    orgId: rest.orgId,
    effectiveCourseId: rest.effectiveCourseId,
    refresh: rest.refresh,
    requestConfirm: rest.requestConfirm,
    nodeEditLoading: rest.nodeEditLoading,
    setNodeEditLoading: rest.setNodeEditLoading,
    setNodeEditModal: rest.setNodeEditModal,
    onOpenQuiz: rest.onOpenQuiz,
    fetchNodes: rest.fetchNodes,
  }

  return (
    <PageCard title="Levels & Programs">
      <div className="space-y-5">
        {[...visibleApiModules]
          .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
          .map((lvl, idx) => (
            <ModuleAccordion
              key={lvl.id}
              lvl={lvl}
              idx={idx}
              bridge={bridge}
              isHighlighted={String(lvl.id) === rest.highlightedModuleId}
              apiNodesByModule={rest.apiNodesByModule}
              apiChaptersByModule={rest.apiChaptersByModule}
              collapsedModules={rest.collapsedModules}
              collapsedPhases={rest.collapsedPhases}
              toggleModule={rest.toggleModule}
              togglePhase={rest.togglePhase}
              onAddPhase={rest.onAddPhase}
              onEditChapter={rest.onEditChapter}
              onDeleteChapter={rest.onDeleteChapter}
            />
          ))}
      </div>
    </PageCard>
  )
}
