// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The bridge between the screens that change progress and the tabs that
/// report it.
///
/// Home, Courses and Progress live in the shell's `IndexedStack`: they are
/// built once and never covered, so finishing a lesson inside a course leaves
/// all three showing the numbers from before it. They cannot notice on their
/// own — the roadmap is pushed on the **root** navigator, over the shell, so
/// the shell is the only thing that learns it has been uncovered. It calls
/// [reload], and this one object refetches every tab behind it.
///
/// Deliberately not a [ChangeNotifier]: it owns no state and has nothing to
/// announce. The three view models notify their own screens as each call
/// lands, so the tabs come back one at a time instead of waiting for the
/// slowest.
class TabRefresher {
  const TabRefresher({
    required this.dashboard,
    required this.courses,
    required this.progress,
  });

  final DashboardViewModel dashboard;
  final CoursesViewModel courses;
  final ProgressViewModel progress;

  /// Refetches every tab that reports progress.
  ///
  /// A tab the learner has never opened is skipped — it has nothing stale to
  /// correct, and its own screen loads it the first time it is built. The rest
  /// go through `refresh: true`, which keeps what is already on screen while
  /// the call is in flight, so the learner lands back on their old numbers
  /// updating rather than on three skeletons.
  Future<void> reload(int? orgId) async {
    if (orgId == null) return;

    await Future.wait<void>(<Future<void>>[
      if (dashboard.loadedOnce) dashboard.load(orgId, refresh: true),
      if (courses.loadedOnce) courses.load(orgId, refresh: true),
      if (progress.loadedOnce) progress.load(orgId, refresh: true),
    ]);
  }
}
