// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// One course's roadmap, and the one row that is open inside it.
///
/// Screen-scoped: created by the roadmap screen with a local
/// `ChangeNotifierProvider` and disposed with it, so nothing survives the pop.
///
/// Expanding a row fetches that node's detail (`GET …/modules/{m}/nodes/{n}/`)
/// and keeps it, so collapsing and reopening the same row costs nothing. Only
/// one row is open at a time — two open players competing for audio is not a
/// state worth supporting.
class RoadmapViewModel extends BaseProvider {
  RoadmapViewModel({
    required this.orgId,
    required this.courseId,
    CoursesRepository? repository,
    LessonRepository? lessons,
  }) : _repository = repository ?? const CoursesRepository(),
       _lessons = lessons ?? const LessonRepository();

  final int orgId;
  final int courseId;
  final CoursesRepository _repository;
  final LessonRepository _lessons;

  Roadmap? _roadmap;
  Roadmap? get roadmap => _roadmap;

  /// Set when a locked lesson is tapped, so the row can shake and name what is
  /// blocking it. Cleared once shown.
  int? lockedTapNodeId;
  String lockedMessage = '';
  int lockShakeToken = 0;

  /// Modules and chapters the learner has folded away.
  ///
  /// Collapsed rather than expanded is tracked, so everything is open until
  /// someone closes it — a roadmap that greets the learner folded shut hides
  /// how far they have got.
  final Set<int> _collapsedModules = <int>{};
  final Set<int> _collapsedChapters = <int>{};

  bool isModuleCollapsed(int moduleId) => _collapsedModules.contains(moduleId);
  bool isChapterCollapsed(int chapterId) =>
      _collapsedChapters.contains(chapterId);

  void toggleModule(int moduleId) {
    if (!_collapsedModules.remove(moduleId)) _collapsedModules.add(moduleId);
    notifyListeners();
  }

  void toggleChapter(int chapterId) {
    if (!_collapsedChapters.remove(chapterId)) {
      _collapsedChapters.add(chapterId);
    }
    notifyListeners();
  }

  int? _openNodeId;
  int? get openNodeId => _openNodeId;
  bool isOpen(int nodeId) => _openNodeId == nodeId;

  final Map<int, LessonNode> _details = <int, LessonNode>{};
  final Set<int> _loadingDetail = <int>{};
  final Map<int, String> _detailErrors = <int, String>{};
  final Set<int> _completing = <int>{};

  /// Nodes being re-read after the learner came back from a screen that may
  /// have changed them.
  final Set<int> _refreshing = <int>{};

  /// True while this node's state is in flight after a return.
  ///
  /// **The row must refuse to act while this is true.** Submitting a quiz and
  /// coming back leaves the roadmap holding the pre-submission answer for as
  /// long as the reload takes — long enough for the learner to tap Start quiz
  /// again and burn a second attempt on a quiz they have already passed.
  bool isRefreshing(int nodeId) => _refreshing.contains(nodeId);

  LessonNode? detailOf(int nodeId) => _details[nodeId];
  bool isLoadingDetail(int nodeId) => _loadingDetail.contains(nodeId);
  String? detailErrorOf(int nodeId) => _detailErrors[nodeId];
  bool isCompleting(int nodeId) => _completing.contains(nodeId);

  Future<void> load({bool refresh = false}) async {
    if (!refresh && _roadmap == null) setState(ViewState.busy);

    final ApiResponse res = await _repository.getRoadmap(orgId, courseId);
    final Map<String, dynamic>? body = res.dataMap;

    if (!res.isSuccess || body == null) {
      setState(
        _roadmap == null ? ViewState.error : ViewState.success,
        error: res.message,
      );
      return;
    }

    _roadmap = Roadmap.fromJson(body);
    setState(ViewState.success);
  }

  /// Reloads after the learner comes back from a task, quiz or
  /// coding screen, where completion happened out of this screen's sight.
  ///
  /// The open row's cached detail is dropped with it: its completion state and
  /// its task status are exactly what may have changed.
  ///
  /// [nodeId] is nullable because the caller is a `RouteAware` callback that
  /// knows the screen was uncovered but not what was open — with no node there
  /// is simply no cached detail to drop.
  Future<void> refreshAfterReturn(int? nodeId) async {
    if (nodeId != null) {
      _details.remove(nodeId);
      _detailErrors.remove(nodeId);
      // Marked before the first await, so the row is already locked on the
      // frame the learner lands back on.
      _refreshing.add(nodeId);
      notifyListeners();
    }

    try {
      await load(refresh: true);
      if (nodeId != null && isOpen(nodeId)) await _fetchDetail(nodeId);
    } finally {
      // Even a failed reload has to release the row, or the lesson is stuck
      // behind a spinner with no way out but leaving the screen.
      if (nodeId != null) {
        _refreshing.remove(nodeId);
        notifyListeners();
      }
    }
  }

  /// Opens a row, closing whichever was open. A second tap closes it.
  Future<void> toggle(RoadmapNode node) async {
    if (isOpen(node.id)) {
      _openNodeId = null;
      notifyListeners();
      return;
    }

    _openNodeId = node.id;
    notifyListeners();

    if (node.needsDetail) await _fetchDetail(node.id);
  }

  Future<void> _fetchDetail(int nodeId, {bool force = false}) async {
    final RoadmapNode? node = _roadmap?.nodeById(nodeId);
    if (node == null || _loadingDetail.contains(nodeId)) return;

    // Already held: collapsing and reopening a row must not cost a request.
    // `refreshAfterReturn` drops the entry first, which is how a genuinely
    // stale detail gets refetched.
    if (!force && _details.containsKey(nodeId)) return;

    _loadingDetail.add(nodeId);
    _detailErrors.remove(nodeId);
    notifyListeners();

    final ApiResponse res = await _lessons.getLesson(
      orgId: orgId,
      courseId: courseId,
      moduleId: node.moduleId,
      nodeId: nodeId,
    );

    _loadingDetail.remove(nodeId);

    // A locked node answers 403. That is a lock state, not an error — the row
    // already renders the padlock, so say nothing more.
    if (res.statusCode == 403) {
      notifyListeners();
      return;
    }

    final Map<String, dynamic>? body = res.dataMap;
    if (!res.isSuccess || body == null) {
      _detailErrors[nodeId] = res.message;
      notifyListeners();
      return;
    }

    _details[nodeId] = LessonNode.fromJson(body);
    notifyListeners();
  }

  Future<void> retryDetail(int nodeId) => _fetchDetail(nodeId, force: true);

  /// Marks a node complete and folds the result back into the roadmap without
  /// a full refetch, so the tick appears the moment the call lands.
  ///
  /// Idempotent from the learner's side: completing something already complete
  /// is a no-op, never an error.
  Future<bool> complete(int nodeId) async {
    final RoadmapNode? node = _roadmap?.nodeById(nodeId);
    if (node == null || node.isCompleted || _completing.contains(nodeId)) {
      return false;
    }

    _completing.add(nodeId);
    notifyListeners();

    final ApiResponse res = await _lessons.complete(nodeId);
    _completing.remove(nodeId);

    if (!res.isSuccess) {
      _detailErrors[nodeId] = res.message;
      notifyListeners();
      return false;
    }

    // Completing one node can unlock the next, and only the server knows the
    // prerequisite chain — so reconcile rather than guess.
    await load(refresh: true);
    return true;
  }

  /// Tapping a locked lesson shakes the row and names the blocking lesson —
  /// it never navigates and never fires a doomed request.
  void reportLocked(RoadmapNode node, String Function(String) message) {
    final RoadmapNode? blocker = _roadmap?.blockerFor(node);
    lockedTapNodeId = node.id;
    lockedMessage = message(blocker?.title ?? '');
    lockShakeToken++;
    notifyListeners();
  }

  /// Certificate eligibility. A `400` carries the reason, which the sheet
  /// renders as a checklist rather than an error.
  Future<ApiResponse> claimCertificate() =>
      _repository.claimCertificate(orgId, courseId);
}
