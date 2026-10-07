// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import Dropdown from '@/components/ui/Dropdown'

/** Content types a learning resource can hold. Mirrors the API `content_type` values. */
export type ResourceContentType = 'link' | 'pdf' | 'video'

const RESOURCE_TYPE_OPTIONS: ReadonlyArray<{ value: ResourceContentType; label: string }> = [
  { value: 'link', label: 'Link' },
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'Video' },
]

const URL_INPUT_CLASS =
  'w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none'

type ResourceContentFieldProps = Readonly<{
  /** Unique prefix so multiple instances don't collide on element ids. */
  idPrefix: string
  type: ResourceContentType
  onTypeChange: (type: ResourceContentType) => void
  url: string
  onUrlChange: (url: string) => void
  /** Require a URL to be provided (add flow). Edit keeps the existing value. */
  required?: boolean
  className?: string
}>

/**
 * Reusable "resource content" field: a type dropdown plus a URL input. Shared by
 * the add and edit resource flows.
 */
export default function ResourceContentField({
  idPrefix,
  type,
  onTypeChange,
  url,
  onUrlChange,
  required = false,
  className = '',
}: ResourceContentFieldProps) {
  const urlFieldId = `${idPrefix}-url`

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      <div className="sm:col-span-1">
        <p className="block text-sm font-medium text-slate-700 mb-1">Type</p>
        <Dropdown<ResourceContentType>
          label=""
          value={type}
          options={[...RESOURCE_TYPE_OPTIONS]}
          onChange={onTypeChange}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={urlFieldId} className="block text-sm font-medium text-slate-700 mb-1">
          URL
        </label>
        <input
          id={urlFieldId}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className={URL_INPUT_CLASS}
          placeholder="https://..."
          required={required}
        />
      </div>
    </div>
  )
}
