// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Submitting a task, and reading back every attempt on it.
///
/// **Two calls, both required.** The node describes the task — its title, its
/// brief, and which inputs it permits — and `GET …/task/submit/` lists the
/// attempts. Neither screen state is drawable without both: a form needs the
/// `allow_*` flags, and a history still has to say which task it is about. So
/// they go out together and a failure in either is one error with one Retry,
/// rather than half a screen.
///
/// The old `?submitted=` hint and `task/result/` are gone with it. The hint
/// existed to avoid a second request; now that the list endpoint carries the
/// whole history there is nothing to halve, and a caller can no longer tell
/// this screen something about itself that it is better off asking.
class TaskViewModel extends BaseProvider {
  TaskViewModel({
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

  TaskDetail? _task;
  TaskDetail? get task => _task;

  List<TaskSubmission> _submissions = const <TaskSubmission>[];

  /// Newest first, which is the order the endpoint documents — sorted here
  /// anyway, because "always the first item" is a promise no schema makes.
  List<TaskSubmission> get submissions => _submissions;

  /// The attempt the screen speaks for: its status, its feedback, and whether
  /// another one is allowed.
  TaskSubmission? get latest => _submissions.firstOrNull;

  bool get hasHistory => _submissions.isNotEmpty;

  /// True when the node answered 403 — a lock, not an error.
  bool isLocked = false;

  /// The node has no task on it. Nothing to submit, and not a failure.
  bool get hasNoTask =>
      state == ViewState.success && !isLocked && _task == null;

  bool _composing = false;

  /// Whether the form is open. It opens itself when there is nothing to show,
  /// and on Re-submit otherwise.
  bool get isComposing => _composing || !hasHistory;

  bool get canResubmit => latest?.canResubmit ?? false;

  /// Fetches the node and the attempts at once.
  Future<void> load() async {
    setState(ViewState.busy);

    final List<ApiResponse> results = await Future.wait<ApiResponse>(
      <Future<ApiResponse>>[
        _repository.getLesson(
          orgId: orgId,
          courseId: courseId,
          moduleId: moduleId,
          nodeId: nodeId,
        ),
        _repository.taskSubmissions(nodeId),
      ],
    );

    final ApiResponse node = results[0];
    final ApiResponse attempts = results[1];

    if (node.statusCode == 403) {
      isLocked = true;
      setState(ViewState.success);
      return;
    }

    // Both or neither: a form without its flags and a history without its
    // task are each worse than asking the learner to try again.
    final Map<String, dynamic>? body = node.dataMap;
    if (!node.isSuccess || body == null || !attempts.isSuccess) {
      setState(
        ViewState.error,
        error: node.isSuccess ? attempts.message : node.message,
      );
      return;
    }

    _task = LessonNode.fromJson(body).task;
    _submissions = _ordered(attempts.listOf(TaskSubmission.fromJson));
    _composing = false;
    setState(ViewState.success);
  }

  /// Newest attempt first: by attempt number, then by the clock for a backend
  /// that numbers them all 1.
  List<TaskSubmission> _ordered(List<TaskSubmission> raw) {
    final List<TaskSubmission> sorted = List<TaskSubmission>.of(raw)
      ..sort((TaskSubmission a, TaskSubmission b) {
        final int byAttempt = b.attemptNumber.compareTo(a.attemptNumber);
        if (byAttempt != 0) return byAttempt;
        final DateTime fallback = DateTime.fromMillisecondsSinceEpoch(0);
        return (b.submittedAt ?? fallback).compareTo(a.submittedAt ?? fallback);
      });
    return List<TaskSubmission>.unmodifiable(sorted);
  }

  // ── The form ─────────────────────────────────────────────────────────────

  String link = '';
  String paragraph = '';
  String code = '';
  String? filePath;
  String? fileName;

  bool get hasFile => (filePath ?? '').isNotEmpty;

  /// At least one of payload / file must be present, so the button stays
  /// disabled until the learner has actually entered something.
  bool get canSubmit =>
      !isBusy &&
      (link.trim().isNotEmpty ||
          paragraph.trim().isNotEmpty ||
          code.trim().isNotEmpty ||
          hasFile);

  void setLink(String v) {
    link = v;
    notifyListeners();
  }

  void setParagraph(String v) {
    paragraph = v;
    notifyListeners();
  }

  void setCode(String v) {
    code = v;
    notifyListeners();
  }

  void setFile(String? path, String? name) {
    filePath = path;
    fileName = name;
    notifyListeners();
  }

  /// Opens the form over the history, which stays below it.
  void startResubmission() {
    if (_composing) return;
    _composing = true;
    _clearForm();
    notifyListeners();
  }

  /// Closes it again without submitting.
  void cancelResubmission() {
    if (!_composing) return;
    _composing = false;
    _clearForm();
    notifyListeners();
  }

  void _clearForm() {
    link = '';
    paragraph = '';
    code = '';
    filePath = null;
    fileName = null;
  }

  /// Submits, and on success also marks the lesson complete (FR-TSK-3).
  Future<bool> submit() async {
    if (!canSubmit) return false;
    setState(ViewState.busy);

    final Map<String, dynamic> payload = <String, dynamic>{
      if (link.trim().isNotEmpty) 'link': link.trim(),
      if (paragraph.trim().isNotEmpty) 'paragraph': paragraph.trim(),
      if (code.trim().isNotEmpty) 'code': code,
    };

    final ApiResponse res = await _repository.submitTask(
      nodeId: nodeId,
      payload: payload.isEmpty ? null : payload,
      filePath: filePath,
      fileName: fileName,
    );

    final Map<String, dynamic>? body = res.dataMap;
    if (!res.isSuccess || body == null) {
      setState(ViewState.error, error: res.message);
      return false;
    }

    // The new attempt is the one the screen now speaks for, and the form
    // closes behind it.
    _submissions = _ordered(<TaskSubmission>[
      TaskSubmission.fromJson(body),
      ..._submissions,
    ]);
    _composing = false;
    _clearForm();

    // A successful submission completes the lesson; a failure here is not the
    // learner's problem and the roadmap reconciles on its next load.
    await _repository.complete(nodeId);
    setState(ViewState.success);
    return true;
  }
}
