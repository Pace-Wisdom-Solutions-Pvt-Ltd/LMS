// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from 'react'

/** Forces re-render so store getters return fresh data after mutations. */
export function useStoreRefresh(): () => void {
  const [, setTick] = useState(0)
  return useCallback(() => setTick((t) => t + 1), [])
}
