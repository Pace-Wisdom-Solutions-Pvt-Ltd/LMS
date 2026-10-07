// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// Every enum in the app lives here.
library;

/// Lifecycle of an async operation inside a [BaseProvider].
///
/// View models expose a [ViewState] instead of a bare `isLoading` bool so a view
/// can distinguish "never ran" from "finished with an error".
enum ViewState { idle, busy, success, error }

/// What a roadmap row opens. Drives its icon and which screen is pushed.
enum LessonKind { lesson, task, quiz, coding }

/// The three filter chips on My Courses.
enum CourseFilter { all, inProgress, notStarted, completed }

/// Where a task submission stands in the trainer's review.
enum TaskStatus { pending, approved, rejected, unknown }

/// Where a coding submission stands with the judge. Judging is asynchronous,
/// so the app polls the submission endpoint until this leaves
/// [CodingStatus.queued] / [CodingStatus.running].
///
/// [CodingStatus.unknown] covers a backend that judges synchronously and sends
/// no `status` at all — [CodingSubmission.isJudged] then falls back to the
/// verdict and the results.
enum CodingStatus {
  queued,
  running,
  done,
  error,
  unknown;

  static CodingStatus from(String raw) => switch (raw.trim().toLowerCase()) {
    'queued' || 'pending' => CodingStatus.queued,
    'running' || 'in_progress' || 'processing' => CodingStatus.running,
    'done' || 'completed' || 'finished' || 'judged' => CodingStatus.done,
    'error' || 'failed' || 'internal_error' => CodingStatus.error,
    _ => CodingStatus.unknown,
  };

  bool get isPending =>
      this == CodingStatus.queued || this == CodingStatus.running;
}
