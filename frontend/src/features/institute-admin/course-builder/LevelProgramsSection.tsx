// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { CheckSquare, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import PageCard from '@/components/ui/PageCard'
import type { ApiCourseModule, ApiModuleNode } from '@/lib/api/organizations'
import { collectDescendantNodes, isRootModuleNode, nodeHasContent } from './courseBuilderHelpers'
import { ProgramInner, type OpenQuizContext } from './CourseBuilderProgramInner'
import type { NodeEditModalState } from './courseBuilderProgramHelpers'

export type PhaseDraftRow = Readonly<{ clientId: string; title: string; description: string }>

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
  phaseDraftsByModule: Record<string, PhaseDraftRow[]>
  collapsedModules: Set<string>
  collapsedPhases: Set<number>
  toggleModule: (id: string) => void
  togglePhase: (id: number) => void
  onAddPhase: (moduleId: string) => Promise<void> | void
  onEditDraftPhase: (moduleId: string, clientId: string) => void
  onDeleteDraftPhase: (moduleId: string, clientId: string) => Promise<void> | void
  onRemovePhaseDraft: (moduleId: string, clientId: string) => void
  onEditApiPhase: (moduleId: string, nodeId: number) => Promise<void> | void
  onDeleteApiPhase: (moduleId: string, nodeId: number) => Promise<void> | void
  committingCurriculum: boolean
  onCommit: () => void
  commitLabel: string
}

/** A single level card with its draft + saved phases and their curriculum items. */
function ModuleAccordion({
  lvl,
  idx,
  bridge,
  isHighlighted,
  apiNodesByModule,
  phaseDraftsByModule,
  collapsedModules,
  collapsedPhases,
  toggleModule,
  togglePhase,
  onAddPhase,
  onEditDraftPhase,
  onDeleteDraftPhase,
  onRemovePhaseDraft,
  onEditApiPhase,
  onDeleteApiPhase,
}: {
  lvl: ApiCourseModule
  idx: number
  bridge: ProgramInnerBridge
  isHighlighted: boolean
} & Pick<
  LevelProgramsSectionProps,
  | 'apiNodesByModule'
  | 'phaseDraftsByModule'
  | 'collapsedModules'
  | 'collapsedPhases'
  | 'toggleModule'
  | 'togglePhase'
  | 'onAddPhase'
  | 'onEditDraftPhase'
  | 'onDeleteDraftPhase'
  | 'onRemovePhaseDraft'
  | 'onEditApiPhase'
  | 'onDeleteApiPhase'
>) {
  const { orgId, effectiveCourseId, refresh, requestConfirm, nodeEditLoading, setNodeEditLoading, setNodeEditModal, onOpenQuiz, fetchNodes } = bridge
  const moduleId = String(lvl.id)
  const list = apiNodesByModule[moduleId] ?? []
  const phaseList = list.filter(isRootModuleNode)
  const drafts = phaseDraftsByModule[moduleId] ?? []
  const hasAnyPhases = phaseList.length > 0 || drafts.length > 0
  const isModuleCollapsed = collapsedModules.has(moduleId)

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

          {hasAnyPhases ? (
            <div className="space-y-3">
              {drafts.map((d) => (
                <div key={d.clientId} className="rounded-xl border border-slate-200 bg-white p-3.5 border-dashed">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{d.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{d.description || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-brand-teal/30 hover:text-brand-teal"
                        onClick={() => onEditDraftPhase(moduleId, d.clientId)}
                        aria-label="Edit phase"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                        onClick={() => { void onDeleteDraftPhase(moduleId, d.clientId) }}
                        aria-label="Delete phase"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <ProgramInner
                      programId={`draft:${moduleId}:${d.clientId}`}
                      apiChildNodes={[]}
                      orgId={orgId}
                      effectiveCourseId={effectiveCourseId}
                      refresh={refresh}
                      requestConfirm={requestConfirm}
                      nodeEditLoading={nodeEditLoading}
                      setNodeEditLoading={setNodeEditLoading}
                      setNodeEditModal={setNodeEditModal}
                      onOpenQuiz={onOpenQuiz}
                      apiCurriculum={{
                        orgId,
                        moduleId,
                        phaseNodeId: null,
                        phaseDraft: { title: d.title, description: d.description },
                        localDraftClientId: d.clientId,
                        onDraftCommitted: () => onRemovePhaseDraft(moduleId, d.clientId),
                        nodesInModule: list.length,
                        refresh: () => fetchNodes(moduleId),
                      }}
                    />
                  </div>
                </div>
              ))}

              {phaseList.map((p) => {
                // A root node that carries its own content is a regular curriculum item,
                // not an empty chapter heading. Render it (and its chain) as a flat list
                // with no chapter header so the first item is never swallowed.
                const isContentRoot = nodeHasContent(p)
                const childNodes = isContentRoot ? [p, ...collectDescendantNodes(p.id, list)] : collectDescendantNodes(p.id, list)
                const progId = `api-phase:${moduleId}:${p.id}`
                const isCollapsed = collapsedPhases.has(p.id)
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-slate-200 bg-white hover:border-brand-teal/70 hover:shadow-sm transition-colors"
                  >
                    {!isContentRoot && (
                      <button
                        type="button"
                        onClick={() => togglePhase(p.id)}
                        className="w-full flex items-center justify-between gap-2 p-3.5 text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                          {p.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
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
                              void onEditApiPhase(moduleId, p.id)
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
                              void onDeleteApiPhase(moduleId, p.id)
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
                    )}
                    {!isCollapsed && (
                      <div className={isContentRoot ? 'p-3.5' : 'border-t border-slate-100 rounded-b-xl bg-slate-50/40 p-3'}>
                        <ProgramInner
                          programId={progId}
                          apiChildNodes={childNodes}
                          orgId={orgId}
                          effectiveCourseId={effectiveCourseId}
                          refresh={refresh}
                          requestConfirm={requestConfirm}
                          nodeEditLoading={nodeEditLoading}
                          setNodeEditLoading={setNodeEditLoading}
                          setNodeEditModal={setNodeEditModal}
                          onOpenQuiz={onOpenQuiz}
                          apiCurriculum={{
                            orgId,
                            moduleId,
                            phaseNodeId: Number(p.id),
                            nodesInModule: list.length,
                            refresh: () => fetchNodes(moduleId),
                          }}
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
  // committingCurriculum, onCommit, commitLabel — Save Curriculum button is
  // currently commented out below; keep the props on the type for when it returns.
  ...rest
}: LevelProgramsSectionProps) {
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
              phaseDraftsByModule={rest.phaseDraftsByModule}
              collapsedModules={rest.collapsedModules}
              collapsedPhases={rest.collapsedPhases}
              toggleModule={rest.toggleModule}
              togglePhase={rest.togglePhase}
              onAddPhase={rest.onAddPhase}
              onEditDraftPhase={rest.onEditDraftPhase}
              onDeleteDraftPhase={rest.onDeleteDraftPhase}
              onRemovePhaseDraft={rest.onRemovePhaseDraft}
              onEditApiPhase={rest.onEditApiPhase}
              onDeleteApiPhase={rest.onDeleteApiPhase}
            />
          ))}
      </div>
      {/* <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
        <Button size="lg" loading={committingCurriculum} loadingText="Saving…" onClick={onCommit}>
          {commitLabel}
        </Button>
      </div> */}
    </PageCard>
  )
}
