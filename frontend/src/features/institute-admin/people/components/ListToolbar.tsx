// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Search, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

/**
 * Toolbar shared by the trainer and student tabs: a debounced search box,
 * optional extra filter controls, and the Bulk Upload / Create actions.
 */
export default function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  onBulkUpload,
  onCreate,
  createLabel,
  filters,
}: Readonly<{
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /** Omit to hide the Bulk Upload action. */
  onBulkUpload?: () => void
  /** Omit to hide the Create action. */
  onCreate?: () => void
  createLabel?: string
  /** Optional extra controls rendered between the search box and the actions. */
  filters?: ReactNode
}>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <Input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        leftIcon={<Search className="h-4 w-4" />}
        containerClassName="w-full sm:w-64"
      />
      {filters}
      {(onBulkUpload || onCreate) && (
        <div className="flex items-center gap-2 sm:ml-auto">
          {onBulkUpload && (
            <Button variant="secondary" className="shrink-0" onClick={onBulkUpload}>
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          )}
          {onCreate && (
            <Button className="shrink-0" onClick={onCreate}>
              {createLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
