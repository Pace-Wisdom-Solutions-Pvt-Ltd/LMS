// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// One coding node: every problem on it, the editor state per problem, and the
/// judge's answers.
///
/// Screen-scoped — created by [CodingScreen] with a local
/// `ChangeNotifierProvider` and disposed with it.
///
/// State is keyed by **question id**, not by the selected index, so switching
/// problems and coming back keeps the learner's code, their language and the
/// last result. Losing typed code to a tap on a tab would be unforgivable.
class CodingViewModel extends BaseProvider {
  CodingViewModel({
    required this.orgId,
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
    CodingRepository? repository,
    LessonRepository? lessons,
  }) : _repository =
           repository ??
           CodingRepository(
             orgId: orgId,
             courseId: courseId,
             moduleId: moduleId,
             nodeId: nodeId,
           ),
       _lessons = lessons ?? const LessonRepository();

  final int orgId;
  final int courseId;
  final int moduleId;
  final int nodeId;
  final CodingRepository _repository;
  final LessonRepository _lessons;

  /// How the app waits out asynchronous judging. Overridden in tests, which
  /// cannot afford to sit through real seconds.
  @visibleForTesting
  static Duration pollInterval = const Duration(seconds: 2);

  /// Bounded on purpose: a judge that never finishes must leave the learner
  /// with "still grading", not a spinner that spins for ever.
  @visibleForTesting
  static int maxPolls = 12;

  List<CodingQuestion> _questions = const <CodingQuestion>[];
  List<CodingQuestion> get questions => _questions;

  bool _loadedOnce = false;
  bool get loadedOnce => _loadedOnce;

  /// True when the node answered 403 — a lock, not an error.
  bool _locked = false;
  bool get locked => _locked;

  int _index = 0;
  int get index => _index;

  CodingQuestion? get current =>
      _index >= 0 && _index < _questions.length ? _questions[_index] : null;

  // Keyed by question id — see the class comment.
  final Map<int, String> _code = <int, String>{};
  final Map<int, String> _starter = <int, String>{};
  final Map<int, String> _language = <int, String>{};
  final Map<int, String> _stdin = <int, String>{};
  final Map<int, CodingRunResult> _runs = <int, CodingRunResult>{};
  final Map<int, CodingSubmission> _submissions = <int, CodingSubmission>{};
  final Map<int, String> _actionErrors = <int, String>{};
  final Set<int> _running = <int>{};
  final Set<int> _submitting = <int>{};
  final Set<int> _loadingStarter = <int>{};

  /// Starter code already fetched, keyed `questionId:language`, so flipping
  /// back to a language does not wait on the network again.
  final Map<String, String> _signatures = <String, String>{};

  String codeFor(int questionId) => _code[questionId] ?? '';
  String stdinFor(int questionId) => _stdin[questionId] ?? '';
  CodingRunResult? runFor(int questionId) => _runs[questionId];
  CodingSubmission? submissionFor(int questionId) => _submissions[questionId];
  String? actionErrorFor(int questionId) => _actionErrors[questionId];
  bool isRunning(int questionId) => _running.contains(questionId);
  bool isSubmitting(int questionId) => _submitting.contains(questionId);
  bool isLoadingStarter(int questionId) => _loadingStarter.contains(questionId);

  String languageFor(CodingQuestion question) =>
      _language[question.id] ?? question.defaultLanguage;

  /// True when this problem has an accepted submission, from the judge in this
  /// session or from `latest_submission` on arrival.
  bool isSolved(CodingQuestion question) =>
      (_submissions[question.id] ?? question.latestSubmission)?.isAccepted ??
      false;

  /// Every problem on the node is accepted — what makes the node complete.
  bool get allSolved => _questions.isNotEmpty && _questions.every(isSolved);

  // ── Loading ───────────────────────────────────────────────────────────────

  Future<void> load({bool refresh = false}) async {
    if (!refresh && !_loadedOnce) setState(ViewState.busy);

    final ApiResponse res = await _repository.questions();

    // A locked node answers 403. That is a lock state, not a failure.
    if (res.statusCode == 403) {
      _locked = true;
      _loadedOnce = true;
      setState(ViewState.success);
      return;
    }

    if (!res.isSuccess) {
      setState(
        _loadedOnce ? ViewState.success : ViewState.error,
        error: res.message,
      );
      return;
    }

    // The endpoint returns a bare array; a page object would already have
    // been unwrapped into `dataList` by DioClient.
    _questions = CodingQuestion.listFrom(res.dataList);
    _loadedOnce = true;
    if (_index >= _questions.length) _index = 0;
    setState(ViewState.success);

    final CodingQuestion? first = current;
    if (first != null) await _primeEditor(first);
  }

  void select(int index) {
    if (index == _index || index < 0 || index >= _questions.length) return;
    _index = index;
    notifyListeners();
    final CodingQuestion? question = current;
    if (question != null) _primeEditor(question);
  }

  /// Fills the editor for a problem the learner has not opened yet. Does
  /// nothing once they have typed something.
  Future<void> _primeEditor(CodingQuestion question) async {
    if (_code.containsKey(question.id)) return;
    await _applyStarter(question, languageFor(question));
  }

  // ── Editing ───────────────────────────────────────────────────────────────

  void setCode(int questionId, String value) {
    _code[questionId] = value;
    // The buttons enable off this, so the notify is not optional — but the
    // controller already holds the text, so nothing rebuilds the field.
    notifyListeners();
  }

  void setStdin(int questionId, String value) {
    _stdin[questionId] = value;
    notifyListeners();
  }

  /// Switches language and swaps in that language's starter code — but only
  /// over code the learner has not touched. Their own work is never replaced.
  Future<void> setLanguage(CodingQuestion question, String language) async {
    if (language == languageFor(question)) return;
    _language[question.id] = language;
    notifyListeners();
    await _applyStarter(question, language);
  }

  /// True when the editor holds nothing but starter code, so replacing it
  /// costs the learner nothing.
  bool _isUntouched(int questionId) {
    final String code = (_code[questionId] ?? '').trim();
    return code.isEmpty || code == (_starter[questionId] ?? '').trim();
  }

  Future<void> _applyStarter(CodingQuestion question, String language) async {
    final String key = '${question.id}:$language';
    final bool mayReplace = _isUntouched(question.id);

    final String? cached = _signatures[key];
    if (cached != null) {
      _starter[question.id] = cached;
      if (mayReplace) _code[question.id] = cached;
      notifyListeners();
      return;
    }

    _loadingStarter.add(question.id);
    notifyListeners();

    final ApiResponse res = await _repository.signature(
      questionId: question.id,
      language: language,
    );

    _loadingStarter.remove(question.id);

    // The endpoint is undocumented ("Unspecified response body"), so read the
    // names it plausibly uses and fall back to the signature the question
    // already carries — an empty editor with no starter is still workable,
    // but a worse start.
    final String starter = _starterFrom(res, question);
    _signatures[key] = starter;
    _starter[question.id] = starter;
    if (mayReplace) _code[question.id] = starter;
    notifyListeners();
  }

  String _starterFrom(ApiResponse res, CodingQuestion question) {
    if (res.isSuccess) {
      final Map<String, dynamic>? body = res.dataMap;
      if (body != null) {
        for (final String key in const <String>[
          'signature',
          'function_signature',
          'starter_code',
          'code',
          'template',
          'boilerplate',
        ]) {
          final Object? value = body[key];
          if (value is String && value.trim().isNotEmpty) return value;
        }
      }
      if (res.data is String && (res.data as String).trim().isNotEmpty) {
        return res.data as String;
      }
    }
    return question.functionSignature;
  }

  // ── Running and submitting ────────────────────────────────────────────────

  /// A dry run against the sample cases, or against [stdinFor] when the
  /// learner typed custom input. Never graded, so it cannot complete the node.
  Future<void> run(CodingQuestion question) async {
    final String code = codeFor(question.id);
    if (code.trim().isEmpty || _running.contains(question.id)) return;

    _running.add(question.id);
    _actionErrors.remove(question.id);
    _runs.remove(question.id);
    notifyListeners();

    final ApiResponse res = await _repository.run(
      questionId: question.id,
      sourceCode: code,
      language: languageFor(question),
      stdin: stdinFor(question.id).isEmpty ? null : stdinFor(question.id),
    );

    _running.remove(question.id);

    if (!res.isSuccess) {
      _actionErrors[question.id] = res.message;
      notifyListeners();
      return;
    }

    _runs[question.id] = res.dataMap != null
        ? CodingRunResult.fromJson(res.dataMap!)
        : CodingRunResult.fromList(res.dataList);
    notifyListeners();
  }

  /// Submits for grading, then waits out asynchronous judging.
  ///
  /// Returns true once the judge accepted the answer, so the screen can say so
  /// and the roadmap can be reloaded.
  Future<bool> submit(CodingQuestion question) async {
    final String code = codeFor(question.id);
    if (code.trim().isEmpty || _submitting.contains(question.id)) return false;

    _submitting.add(question.id);
    _actionErrors.remove(question.id);
    _runs.remove(question.id);
    notifyListeners();

    final ApiResponse res = await _repository.submit(
      questionId: question.id,
      sourceCode: code,
      language: languageFor(question),
    );

    if (!res.isSuccess) {
      _submitting.remove(question.id);
      _actionErrors[question.id] = res.message;
      notifyListeners();
      return false;
    }

    CodingSubmission submission = CodingSubmission.fromJson(
      res.dataMap ?? <String, dynamic>{},
    );
    _submissions[question.id] = submission;
    notifyListeners();

    submission = await _awaitVerdict(question, submission);

    _submitting.remove(question.id);
    notifyListeners();

    if (submission.isAccepted) await _completeIfDone();
    return submission.isAccepted;
  }

  /// Polls `submissions/{id}/` while the judge is still working.
  ///
  /// Stops on a judged submission, on [maxPolls], or as soon as the view model
  /// is disposed — the learner may well have left.
  Future<CodingSubmission> _awaitVerdict(
    CodingQuestion question,
    CodingSubmission initial,
  ) async {
    CodingSubmission latest = initial;
    if (latest.isJudged || latest.id < 0) return latest;

    for (int attempt = 0; attempt < maxPolls; attempt++) {
      await Future<void>.delayed(pollInterval);
      if (isDisposed) return latest;

      final ApiResponse res = await _repository.submission(
        questionId: question.id,
        submissionId: latest.id,
      );
      if (isDisposed) return latest;
      if (!res.isSuccess || res.dataMap == null) continue;

      latest = CodingSubmission.fromJson(res.dataMap!);
      _submissions[question.id] = latest;
      notifyListeners();
      if (latest.isJudged) return latest;
    }

    return latest;
  }

  /// Marks the node complete once every problem on it is accepted.
  ///
  /// The backend may well do this itself, which is why a failure here is
  /// swallowed: the roadmap reloads from the server when the learner goes
  /// back, and that reload is the truth either way.
  Future<void> _completeIfDone() async {
    if (!allSolved) return;
    await _lessons.complete(nodeId);
  }
}
