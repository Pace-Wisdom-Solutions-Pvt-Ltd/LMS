// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// Every enum in the app lives here.
library;

/// Lifecycle of an async operation inside a [BaseProvider].
///
/// View models expose a [ViewState] instead of a bare `isLoading` bool so a view
/// can distinguish "never ran" from "finished with an error".
enum ViewState { idle, busy, success, error }

/// The three filter chips on My Courses.
enum CourseFilter { all, inProgress, notStarted, completed }

/// Where a task submission stands in the trainer's review.
enum TaskStatus { pending, approved, rejected, unknown }
