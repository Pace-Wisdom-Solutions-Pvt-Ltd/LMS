// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  ProgramInner as BaseProgramInner,
  type ProgramInnerProps,
  type ApiCurriculumContext,
  type NodeEditModalState,
} from '@/features/institute-admin/course-builder/CourseBuilderProgramInner'

// Types are re-exported for callers such as CourseDetail. Helpers are imported
// from @/features/institute-admin/course-builder/courseBuilderProgramHelpers.
export type { ApiCurriculumContext, NodeEditModalState }

export type { ProgramInnerProps }

/** Instructor-specific wrapper around the shared `ProgramInner` component. */
export function ProgramInner(props: ProgramInnerProps) {
  return <BaseProgramInner {...props} />
}
