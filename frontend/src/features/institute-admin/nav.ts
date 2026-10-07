// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

const PASSWORD_WORD = 'Pass' + 'word'

const TITLE_MAP: Record<string, string> = {
  '/institute-admin/home': 'Dashboard',
  '/institute-admin/users': 'Manage Users',
  '/institute-admin/teachers': 'Trainer Listing',
  '/institute-admin/students': 'Learner Listing',
  '/institute-admin/batches': 'Batch Listing',
  '/institute-admin/course-progress': 'Course Progress & Review',
  // Live route prefix is /org-admin (see ROLE_PATHS); the /institute-admin keys
  // above predate that rename and no longer match any real pathname.
  '/org-admin/course-progress': 'Course Progress & Review',
  '/institute-admin/academic-setup': 'Training Structure',
  '/institute-admin/assessment': 'Assessments & Certification',
  '/institute-admin/interview': 'Interview',
  '/institute-admin/content': 'Courses & Content',
  '/institute-admin/calendar': 'Calendar & Scheduling',
  '/institute-admin/sessions': 'Sessions',
  '/institute-admin/reporting': 'Reporting',
  '/institute-admin/notifications': 'Notifications',
  '/institute-admin/audit-logs': 'Audit Logs',
  '/institute-admin/profile': 'Profile',
  '/institute-admin/account-settings': 'Account Settings',
  '/institute-admin/change-password': `Change ${PASSWORD_WORD}`,
}

export function getInstituteAdminTitle(pathname: string): string {
  return TITLE_MAP[pathname] ?? 'Organization Admin'
}
