// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import PageCard from '@/components/ui/PageCard'

export default function QuizProgress() {
  return (
    <PageCard title="Quiz Progress">
      <p className="text-slate-600 mb-4">
        Course, score, possible score, total percentage obtained.
      </p>
    </PageCard>
  )
}
