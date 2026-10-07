// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Layers } from 'lucide-react'
import PageCard from '@/components/ui/PageCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { ApiCourseModule } from '@/lib/api/organizations'

export interface LevelDraft {
  id: string
  value: string
}

interface CourseStructureCardProps {
  visibleApiModules: ApiCourseModule[]
  levelDrafts: LevelDraft[]
  showAddLevelForm: boolean
  onShowAddLevelForm: () => void
  onAddLevelField: () => void
  onRemoveLevelDraftAt: (idx: number) => void
  onUpdateLevelDraftValueAt: (idx: number, value: string) => void
  onCloseAddLevelForm: () => void
  onCreateLevels: () => Promise<void> | void
  onEditLevel: (lvl: ApiCourseModule) => void
  onDeleteLevel: (lvl: ApiCourseModule) => void
  onSelectLevel: (lvl: ApiCourseModule) => void
}

/** Course structure: lists created levels and hosts the add-level draft form. */
export default function CourseStructureCard({
  visibleApiModules,
  levelDrafts,
  showAddLevelForm,
  onShowAddLevelForm,
  onAddLevelField,
  onRemoveLevelDraftAt,
  onUpdateLevelDraftValueAt,
  onCloseAddLevelForm,
  onCreateLevels,
  onEditLevel,
  onDeleteLevel,
  onSelectLevel,
}: CourseStructureCardProps) {
  const showAddLevelButton = !showAddLevelForm
  const hasLevels = visibleApiModules.length > 0

  return (
    <PageCard title="Course Structure">
      <div className="flex text-sm font-semibold text-slate-800 items-center gap-1">
        <Layers className="h-4 w-4 text-brand-teal" />
        Add levels for this course
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Add one or more levels. Click “Add level” to add another input field, then click “Create level” when ready.
      </p>

      {/* Existing levels (edit/delete here) */}
      {hasLevels ? (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Created levels</p>
          <div className="space-y-2">
            {visibleApiModules
              .slice()
              .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
              .map((lvl) => (
                <div
                  key={lvl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectLevel(lvl)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectLevel(lvl)
                    }
                  }}
                  title="Jump to this level in Levels & Programs"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer transition-colors hover:border-brand-teal/60 hover:bg-brand-teal/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{lvl.title}</p>
                    {lvl.description ? (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{lvl.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditLevel(lvl)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteLevel(lvl)
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
          </div>

          {showAddLevelButton ? (
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={onShowAddLevelForm}>
                Add level
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {(showAddLevelForm || !hasLevels) && (
        <div className="mt-4 space-y-3">
          {levelDrafts.map((draft, idx) => {
            const labelSuffix = levelDrafts.length > 1 ? String(idx + 1) : ''
            const inputId = `level-draft-${draft.id}`
            const showRemove = levelDrafts.length > 1
            const showClose = !showRemove && hasLevels
            let actionEl: ReactNode
            if (showRemove) {
              actionEl = (
                <Button
                  variant="secondary"
                  onClick={() => onRemoveLevelDraftAt(idx)}
                  aria-label="Remove level field"
                  title="Remove"
                >
                  ×
                </Button>
              )
            } else if (showClose) {
              actionEl = (
                <Button variant="secondary" onClick={onCloseAddLevelForm} aria-label="Close add level" title="Close">
                  ×
                </Button>
              )
            } else {
              actionEl = <div className="w-10" />
            }
            return (
              <div key={draft.id} className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                <Input
                  id={inputId}
                  label={`Level name ${labelSuffix}`.trim()}
                  value={draft.value}
                  onChange={(e) => onUpdateLevelDraftValueAt(idx, e.target.value)}
                  placeholder="e.g. Beginner"
                />
                {actionEl}
              </div>
            )
          })}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onAddLevelField}>
              Add level
            </Button>
          </div>

          <div className="flex justify-end pt-2 gap-3">
            {hasLevels ? (
              <Button variant="secondary" size="lg" onClick={onCloseAddLevelForm}>
                Cancel
              </Button>
            ) : null}
            <Button
              size="lg"
              onClick={async () => {
                await onCreateLevels()
                onCloseAddLevelForm()
              }}
            >
              Create level
            </Button>
          </div>
        </div>
      )}
    </PageCard>
  )
}
