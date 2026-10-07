// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import type { LucideIcon } from 'lucide-react'
import ChartCard from '@/components/ui/charts/ChartCard'
import DonutChart from '@/components/ui/charts/DonutChart'
import { STATUS_COLORS } from './palette'
import type { StatusSplit } from './useOrganizationAnalytics'

interface StatusDonutCardProps {
  title: string
  icon: LucideIcon
  split: StatusSplit
}

/**
 * One active/inactive donut for an entity (batches / staff / students).
 * Child of the Analytics tab — kept generic via props so all three reuse it.
 */
export default function StatusDonutCard({ title, icon, split }: StatusDonutCardProps) {
  const total = split.active + split.inactive
  const activePct = total > 0 ? Math.round((split.active / total) * 100) : 0

  return (
    <ChartCard title={title} icon={icon} subtitle={`${activePct}% active`}>
      <DonutChart
        size={140}
        thickness={20}
        centerValue={total.toLocaleString()}
        centerLabel="Total"
        data={[
          { label: 'Active', value: split.active, color: STATUS_COLORS.active },
          { label: 'Inactive', value: split.inactive, color: STATUS_COLORS.inactive },
        ]}
      />
    </ChartCard>
  )
}
