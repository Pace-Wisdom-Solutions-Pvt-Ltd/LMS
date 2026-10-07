// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Navigate, useLocation } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { ROLE_PATHS } from '@/lib/constants'
import type { UserRole } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const user = getStoredUser()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const hasAccess = allowedRoles.some(
    (r) => user.roles?.includes(r) ?? user.role === r
  )
  if (!hasAccess) {
    const basePath = ROLE_PATHS[user.role]
    return <Navigate to={`${basePath}/home`} replace />
  }

  return <>{children}</>
}
