// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// One lesson.
///
/// Screen-scoped, so its auto-complete watchdog dies with the screen rather
/// than firing after the learner has moved on.
class LessonViewModel extends BaseProvider {
  LessonViewModel({
    required this.orgId,
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
    LessonRepository? repository,
  }) : _repository = repository ?? const LessonRepository();

  final int orgId;
  final int courseId;
  final int moduleId;
  final int nodeId;
  final LessonRepository _repository;

  LessonNode? _lesson;
  LessonNode? get lesson => _lesson;

  /// True when the endpoint answered 403 — the lesson is locked. The screen
  /// renders the lock state and does **not** retry.
  bool isLocked = false;

  bool _completed = false;
  bool get isCompleted => _completed;

  /// Set once the completion call lands, so the screen can play its reward.
  bool justCompleted = false;

  /// How far through the material the learner is, 0..1. Drives auto-complete.
  double _progress = 0;
  double get progress => _progress;

  DateTime? _openedAt;
  bool _completing = false;

  Future<void> load() async {
    setState(ViewState.busy);
    final ApiResponse res = await _repository.getLesson(
      orgId: orgId,
      courseId: courseId,
      moduleId: moduleId,
      nodeId: nodeId,
    );

    if (res.statusCode == 403) {
      isLocked = true;
      setState(ViewState.success);
      return;
    }

    final Map<String, dynamic>? body = res.dataMap;
    if (!res.isSuccess || body == null) {
      setState(ViewState.error, error: res.message);
      return;
    }

    _lesson = LessonNode.fromJson(body);
    _openedAt = DateTime.now();
    setState(ViewState.success);
  }

  /// Video progress, 0..1. **Auto-completes at 90%** — the manual button is a
  /// fallback, not the primary path.
  void onVideoProgress(double value) {
    _progress = value.clamp(0.0, 1.0);
    notifyListeners();
    if (_progress >= 0.9) unawaited(complete(auto: true));
  }

  /// A reading link counts as read once the learner comes back from the browser
  /// having spent at least 30 seconds away.
  void onReturnedFromLink() {
    final DateTime? opened = _openedAt;
    if (opened == null) return;
    if (DateTime.now().difference(opened) >= const Duration(seconds: 30)) {
      unawaited(complete(auto: true));
    }
  }

  /// In-app text counts as read when it has been scrolled to the end.
  void onScrolledToEnd() => unawaited(complete(auto: true));

  /// A PDF counts as read on its last page.
  void onReachedLastPage() => unawaited(complete(auto: true));

  /// Marks the lesson complete.
  ///
  /// Idempotent from the learner's side: a second call, or a call for a lesson
  /// that was already complete, never surfaces an error. [auto] distinguishes
  /// the watchdog from the explicit button so the reward only plays once.
  Future<void> complete({bool auto = false}) async {
    if (_completed || _completing) return;
    _completing = true;

    final ApiResponse res = await _repository.complete(nodeId);
    _completing = false;

    // A failure here is not worth an error card: the learner has done the work,
    // and the roadmap will reconcile on its next load.
    if (!res.isSuccess) {
      appLogPrint(
        'Completing lesson $nodeId failed: ${res.message}',
        tag: 'LESSON',
      );
      if (!auto) setState(ViewState.error, error: res.message);
      return;
    }

    _completed = true;
    justCompleted = true;
    notifyListeners();
  }

  void rewardShown() {
    justCompleted = false;
    notifyListeners();
  }
}
