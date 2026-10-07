// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import PageCard from '@/components/ui/PageCard'
import { Link } from 'react-router-dom'

export default function AdminPanel() {
  return (
    <PageCard title="Admin Panel">
      <p className="text-slate-600 mb-4">Quick access to admin functions.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/org-admin/instructors"
          className="p-4 rounded-lg border border-slate-200 hover:border-brand-teal hover:bg-brand-teal/5 transition"
        >
          Instructors
        </Link>
        <Link
          to="/org-admin/students"
          className="p-4 rounded-lg border border-slate-200 hover:border-brand-teal hover:bg-brand-teal/5 transition"
        >
          Students
        </Link>
        <Link
          to="/org-admin/complete-exams"
          className="p-4 rounded-lg border border-slate-200 hover:border-brand-teal hover:bg-brand-teal/5 transition"
        >
          Complete Exams
        </Link>
        <Link
          to="/org-admin/course-allocation"
          className="p-4 rounded-lg border border-slate-200 hover:border-brand-teal hover:bg-brand-teal/5 transition"
        >
          Course Allocation
        </Link>
      </div>
    </PageCard>
  )
}
