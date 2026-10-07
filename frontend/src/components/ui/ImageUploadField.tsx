// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useId, type ReactNode } from 'react'
import { ImageIcon } from 'lucide-react'
import { showToast } from '@/lib/toastApi'

export interface ImageUploadFieldProps {
  label?: ReactNode
  /** Small helper text shown next to the label (constraints, sizing hints). */
  hint?: ReactNode
  /** Current preview URL (existing remote thumbnail or a local object URL). */
  previewUrl: string | null
  /** True when the current preview is a freshly picked local file. */
  isNewSelection?: boolean
  /**
   * Called with the validated file and a freshly created object URL for preview.
   * The caller owns the object URL lifecycle (e.g. revoking it later).
   */
  onSelect: (file: File, objectUrl: string) => void
  onRemove: () => void
  id?: string
  accept?: string
  /** Allowed MIME types; a mismatch shows a warning toast. */
  allowedTypes?: string[]
  maxBytes?: number
  minWidth?: number
  minHeight?: number
}

const DEFAULT_ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Reusable image picker with a dashed drop-zone preview, hover-to-replace
 * overlay, and built-in type / size / resolution validation. Emits validated
 * files via {@link ImageUploadFieldProps.onSelect}; surfaces failures as toasts.
 */
export default function ImageUploadField({
  label = 'Image',
  hint,
  previewUrl,
  isNewSelection = false,
  onSelect,
  onRemove,
  id,
  accept = 'image/jpeg,image/png,image/webp',
  allowedTypes = DEFAULT_ALLOWED,
  maxBytes = 2 * 1024 * 1024,
  minWidth = 640,
  minHeight = 360,
}: ImageUploadFieldProps) {
  const reactId = useId()
  const inputId = id ?? reactId

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    if (!allowedTypes.includes(file.type)) {
      showToast('Only JPEG, PNG, or WebP images are allowed.', 'warning')
      return
    }
    if (file.size > maxBytes) {
      showToast(`Image must be under ${Math.round(maxBytes / (1024 * 1024))} MB.`, 'warning')
      return
    }
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      if (img.width < minWidth || img.height < minHeight) {
        showToast(`Image resolution is too low. Minimum ${minWidth}×${minHeight} px recommended.`, 'warning')
        URL.revokeObjectURL(objectUrl)
        return
      }
      onSelect(file, objectUrl)
    }
    img.src = objectUrl
  }

  return (
    <div>
      {label != null && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {hint ? <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span> : null}
        </label>
      )}
      <div className="flex items-start gap-4">
        <label
          htmlFor={inputId}
          className="group relative flex flex-col items-center justify-center w-40 h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-brand-teal/50 hover:bg-brand-teal/5 cursor-pointer transition-colors shrink-0 overflow-hidden"
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="h-5 w-5 text-white" />
                <span className="text-[11px] font-semibold text-white">Change image</span>
              </div>
            </>
          ) : (
            <>
              <ImageIcon className="h-7 w-7 text-slate-400 mb-1.5" />
              <span className="text-xs text-slate-500 font-medium">Upload image</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Click to browse</span>
            </>
          )}
          <input id={inputId} type="file" accept={accept} className="sr-only" onChange={handleFile} />
        </label>
        <div className="flex flex-col gap-1.5 pt-1">
          {previewUrl ? (
            <>
              <span className="text-xs font-medium text-slate-600">
                {isNewSelection ? 'New image selected' : 'Current thumbnail'}
              </span>
              <label
                htmlFor={inputId}
                className="w-fit text-xs font-semibold text-brand-teal hover:text-brand-teal/80 cursor-pointer"
              >
                Replace image
              </label>
              <button
                type="button"
                onClick={onRemove}
                className="w-fit text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400">No thumbnail added yet.</span>
          )}
        </div>
      </div>
    </div>
  )
}
