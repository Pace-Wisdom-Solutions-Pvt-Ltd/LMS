// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import PageCard from '@/components/ui/PageCard'

export default function Instructors() {
  return (
    <PageCard title="Instructors">
      <p className="text-slate-600 mb-4">CRUD on instructors. Add, update, delete.</p>
      <button className="px-4 py-2 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90">
        Add Instructor
      </button>
    </PageCard>
  )
}
