// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import { showToast } from '@/lib/toastApi'
import { deleteModuleNodeApi, getModuleNodeApi, type ApiModuleNode } from '@/lib/api/organizations'
import {
  buildNodeEditModalState,
  getApiNodeInfo,
  localItemBadge,
  localItemTitle,
  type ApiCurriculumContext,
  type LocalCurriculumItem,
  type NodeEditModalState,
} from './courseBuilderProgramHelpers'
import { renderApiNodePreview, renderLocalResourcePreview } from './courseBuilderContentPreview'

/** Small "Open Content →" link shared by curriculum rows. */
function OpenContentLink({ href }: Readonly<{ href: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] font-medium text-brand-teal mt-1 inline-flex items-center gap-1 hover:underline"
    >
      Open Content →
    </a>
  )
}

/** Extra metadata shown under a locally-queued curriculum item's title. */
function LocalItemDetails({ item }: Readonly<{ item: LocalCurriculumItem }>) {
  if (item.__itemType === 'Resource') {
    return (
      <>
        {item.focusNotes ? <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.focusNotes}</p> : null}
        {item.outline ? <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Outline: {item.outline}</p> : null}
        {item.url ? <OpenContentLink href={item.url} /> : null}
      </>
    )
  }
  if (item.__itemType === 'Task' && item.requiredSubmissionFormats) {
    return <p className="text-[11px] text-slate-500 mt-1">Submit as: {item.requiredSubmissionFormats.join(', ')}</p>
  }
  if (item.__itemType === 'Assessment' && item.requiredSubmissionFormats) {
    return <p className="text-[11px] text-slate-500 mt-1">Submit as: {item.requiredSubmissionFormats.join(', ')}</p>
  }
  return null
}

export function LocalItemRow({
  item,
  onEdit,
  onRemove,
}: Readonly<{
  item: LocalCurriculumItem
  onEdit: (item: LocalCurriculumItem) => void
  onRemove: (item: LocalCurriculumItem) => void
}>) {
  const badge = localItemBadge(item.__itemType)
  const preview = item.__itemType === 'Resource' ? renderLocalResourcePreview(item) : null

  return (
    <li className="relative pl-10">
      <div className="absolute left-[11px] top-2.5 w-[9px] h-[9px] rounded-full bg-white border-2 border-brand-teal z-10" />
      <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-brand-teal/50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {preview}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="font-semibold text-sm text-slate-800 leading-snug">{localItemTitle(item)}</p>
              <LocalItemDetails item={item} />
            </div>
          </div>
          <div className="shrink-0 flex flex-col gap-1 items-end">
            <Button size="sm" variant="secondary" onClick={() => onEdit(item)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => onRemove(item)}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </li>
  )
}

export function ApiNodeRow({
  node,
  apiCurriculum,
  orgId,
  effectiveCourseId,
  nodeEditLoading,
  setNodeEditLoading,
  setNodeEditModal,
  onViewSubmissions,
  requestConfirm,
}: Readonly<{
  node: ApiModuleNode
  apiCurriculum: ApiCurriculumContext
  orgId?: string
  effectiveCourseId?: string | number
  nodeEditLoading: number | null
  setNodeEditLoading: (v: number | null) => void
  setNodeEditModal: (v: NodeEditModalState | null) => void
  onViewSubmissions?: (nodeId: number) => void
  requestConfirm: (message: string, confirmText?: string, cancelText?: string) => Promise<boolean>
}>) {
  const info = getApiNodeInfo(node)
  const preview = renderApiNodePreview(info, String(node.title ?? ''))

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const handleEdit = async () => {
    if (!orgId || !effectiveCourseId) return
    setNodeEditLoading(node.id)
    try {
      const full = await getModuleNodeApi(orgId, effectiveCourseId, apiCurriculum.moduleId, node.id)
      const resolution = buildNodeEditModalState(full, info, apiCurriculum.moduleId)
      setNodeEditModal(resolution.state)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load item details.', 'error')
    } finally {
      setNodeEditLoading(null)
    }
  }

  const handleRemove = async () => {
    if (!effectiveCourseId) return
    if (!(await requestConfirm('Delete this item?'))) return
    try {
      await deleteModuleNodeApi(apiCurriculum.orgId, effectiveCourseId, apiCurriculum.moduleId, node.id)
      await apiCurriculum.refresh()
      showToast('Item deleted.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete item.', 'error')
    }
  }

  return (
    <li ref={setNodeRef} style={style} className="relative pl-10">
      <div className="absolute left-[11px] top-2.5 w-[9px] h-[9px] rounded-full bg-white border-2 border-slate-300 z-10" />
      <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          className="absolute left-[-4px] top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {preview}
            <div className="flex-1 min-w-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${info.badge.cls}`}>
                {info.badge.label}
              </span>
              <p className="font-bold text-sm text-slate-800 leading-snug mt-1">{info.displayTitle}</p>
              {node.description ? <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{node.description}</p> : null}
              {!info.isTask && !info.isQuiz && info.effectiveUrl ? <OpenContentLink href={info.effectiveUrl} /> : null}
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1 items-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={nodeEditLoading === node.id}
              onClick={handleEdit}
              leftIcon={nodeEditLoading === node.id ? undefined : <Pencil className="h-3.5 w-3.5" />}
            >
              {nodeEditLoading === node.id ? 'Loading...' : 'Edit'}
            </Button>
            <Button size="sm" variant="danger" onClick={handleRemove}>
              Remove
            </Button>
            {onViewSubmissions && info.isTask && (
              <button
                type="button"
                onClick={() => onViewSubmissions(node.id)}
                className="px-2.5 py-1.5 rounded-lg border border-indigo-100 text-xs font-medium text-indigo-600 hover:bg-indigo-50 inline-flex items-center gap-1.5 transition-all"
              >
                Submissions
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
