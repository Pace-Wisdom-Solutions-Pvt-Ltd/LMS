// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useNavigate } from 'react-router-dom'
import { getStoredUser, setStoredUser, getStoredRefreshToken, setStoredToken, setStoredRefreshToken } from '@/lib/auth'
import { refreshTokenApi } from '@/lib/api/auth'
import { ROLE_PATHS } from '@/lib/constants'
import type { UserRole } from '@/lib/auth'

/** The non-student roles a student can switch into, most privileged first. */
type StaffRole = 'institute_admin' | 'trainer'

const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  institute_admin: 'Organization Admin',
  trainer: 'Trainer',
}

async function refreshAndSwitch(
  user: NonNullable<ReturnType<typeof getStoredUser>>,
  nextRole: UserRole,
  navigate: ReturnType<typeof useNavigate>,
) {
  // Refresh the access token before switching so the new view starts with a fresh token
  const refreshToken = getStoredRefreshToken()
  if (refreshToken) {
    try {
      const res = await refreshTokenApi(refreshToken)
      setStoredToken(res.access)
      // SimpleJWT rotates the refresh token — store the new one so the next switch works
      if (res.refresh) setStoredRefreshToken(res.refresh)
    } catch {
      // non-fatal — proceed with the existing token
    }
  }
  setStoredUser({ ...user, role: nextRole })
  navigate(`${ROLE_PATHS[nextRole]}/home`, { replace: true })
}

/**
 * Exposes role-switching for users who hold multiple roles.
 * Both directions are purely role-based — no API enrollment check needed.
 *
 * The "staff" side resolves to whichever non-student role the user actually
 * holds (institute_admin takes precedence over trainer), so the label and the
 * destination route stay accurate instead of always saying "Trainer".
 */
export function useRoleSwitcher() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const isStaffView = user?.role === 'trainer' || user?.role === 'institute_admin'
  const isStudentView = user?.role === 'student'

  const hasStudentRole = user?.roles?.includes('student') ?? false

  // Resolve the concrete staff role this user can switch into, if any.
  const staffRole: StaffRole | null =
    user?.roles?.includes('institute_admin')
      ? 'institute_admin'
      : user?.roles?.includes('trainer')
        ? 'trainer'
        : null

  const switchToStudent = () => {
    if (!user) return
    refreshAndSwitch(user, 'student', navigate)
  }

  const switchToStaff = () => {
    if (!user || !staffRole) return
    refreshAndSwitch(user, staffRole, navigate)
  }

  return {
    /** Show a "Switch to Student" action in a staff view. */
    showSwitchToStudent: isStaffView && hasStudentRole,
    /** Show a "Switch to <staff role>" action in the student view. */
    showSwitchToStaff: isStudentView && staffRole !== null,
    /** The staff role that will be switched into, e.g. 'institute_admin'. */
    staffRole,
    /** Human-readable label for that staff role, e.g. 'Organization Admin'. */
    staffRoleLabel: staffRole ? STAFF_ROLE_LABELS[staffRole] : '',
    switchToStudent,
    switchToStaff,
  }
}
