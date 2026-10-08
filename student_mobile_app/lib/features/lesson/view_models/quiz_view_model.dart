// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Taking a quiz.
///
/// Answers stay editable until submit and survive moving between questions.
/// The review is built from the submit response plus the learner's own picks —
/// `is_correct` is never read, so the review renders identically whether they
/// passed or failed.
class QuizViewModel extends BaseProvider {
  QuizViewModel({
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

  /// Fetched, never handed in. Null until [load] lands, and the screen shows a
  /// skeleton until then.
  Quiz? _quiz;
  Quiz? get quiz => _quiz;

  /// True when the node answered 403 — a lock, not an error.
  bool isLocked = false;

  /// The node had no quiz on it. Nothing to take, and not a failure either.
  bool get hasNoQuiz =>
      state == ViewState.success && !isLocked && _quiz == null;

  /// Loads the node and takes its quiz, then starts the timer if there is one.
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

    _quiz = LessonNode.fromJson(body).quiz;
    setState(ViewState.success);
    start();
  }

  final Map<int, List<int>> _answers = <int, List<int>>{};
  Map<int, List<int>> get answers => Map<int, List<int>>.unmodifiable(_answers);

  int _index = 0;
  int get index => _index;

  QuizResult? _result;
  QuizResult? get result => _result;

  Duration? _remaining;
  Duration? get remaining => _remaining;
  Timer? _timer;

  /// True once the clock ran out, so the screen can say why it moved on its
  /// own rather than off a tap.
  bool expired = false;

  /// True when the clock ran out with **nothing answered**, and the attempt
  /// was therefore not sent at all.
  ///
  /// An empty submission is not a neutral act: it spends one of the learner's
  /// attempts and records a zero on a quiz they never started — most often
  /// because they opened it, were called away and came back to a dead screen.
  /// There is nothing to grade, so there is nothing to send; the screen says
  /// so and closes.
  bool expiredUnanswered = false;

  List<QuizQuestion> get _questions =>
      _quiz?.questions ?? const <QuizQuestion>[];

  /// The question on screen, or **null** when there is no quiz yet or the
  /// index has outrun it.
  ///
  /// Nullable rather than `_quiz!.questions[_index]`: that read was safe only
  /// because the screen happened to return early on `total == 0` first, which
  /// put the guarantee in the caller and left the model one refactor away from
  /// throwing.
  QuizQuestion? get current =>
      _index >= 0 && _index < _questions.length ? _questions[_index] : null;

  int get total => _questions.length;
  bool get isLast => _index >= total - 1;
  bool get isFirst => _index == 0;

  int get answeredCount =>
      _answers.values.where((List<int> v) => v.isNotEmpty).length;

  /// Every question has an answer, which is what lets the quiz be submitted.
  bool get allAnswered {
    for (int i = 0; i < total; i++) {
      if (!isAnswered(i)) return false;
    }
    return total > 0;
  }

  bool get isCurrentAnswered => total > 0 && isAnswered(_index);

  /// A question opens only once the one before it has an answer, so the strip
  /// fills left to right and nothing is skipped. Going back is always allowed:
  /// getting past a question meant answering it.
  bool canJumpTo(int index) =>
      index >= 0 && index < total && (index == 0 || isAnswered(index - 1));

  bool isPicked(int questionId, int optionId) =>
      (_answers[questionId] ?? const <int>[]).contains(optionId);

  /// False for an index that does not exist, rather than a `RangeError`: this
  /// is asked about every question in the strip, including while a reload is
  /// swapping the list underneath it.
  bool isAnswered(int questionIndex) {
    if (questionIndex < 0 || questionIndex >= _questions.length) return false;
    return (_answers[_questions[questionIndex].id] ?? const <int>[]).isNotEmpty;
  }

  /// The timer runs only when the quiz sets one, and turns red under a minute.
  bool get isLowOnTime =>
      _remaining != null && _remaining! <= const Duration(seconds: 60);

  void start() {
    final Quiz? quiz = _quiz;
    if (quiz == null || !quiz.isTimed) return;
    _remaining = quiz.duration;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final Duration left =
          (_remaining ?? Duration.zero) - const Duration(seconds: 1);
      _remaining = left.isNegative ? Duration.zero : left;
      notifyListeners();
      if (_remaining == Duration.zero) onTimeUp();
    });
  }

  /// What happens when the clock reaches zero.
  ///
  /// A named step rather than a branch inside the tick, so the decision can be
  /// read — and tested — without waiting out a real minute.
  @visibleForTesting
  void onTimeUp() {
    _timer?.cancel();
    _remaining = Duration.zero;
    expired = true;

    if (answeredCount == 0) {
      // Nothing to grade, so nothing is sent. The screen leaves on this flag,
      // since no result will ever arrive to carry it there.
      expiredUnanswered = true;
      notifyListeners();
      return;
    }

    // Whatever *is* answered goes in. The screen navigates off `result`
    // landing, so that path needs no separate signal.
    notifyListeners();
    unawaited(submit());
  }

  void pick(QuizQuestion question, int optionId) {
    final List<int> picked = List<int>.from(
      _answers[question.id] ?? const <int>[],
    );
    if (question.allowMultipleCorrect) {
      picked.contains(optionId)
          ? picked.remove(optionId)
          : picked.add(optionId);
    } else {
      picked
        ..clear()
        ..add(optionId);
    }
    _answers[question.id] = picked;
    notifyListeners();
  }

  /// Guarded here rather than only in the UI, so no other caller can skip a
  /// question either.
  void goTo(int index) {
    if (!canJumpTo(index)) return;
    _index = index;
    notifyListeners();
  }

  void next() => goTo(_index + 1);
  void previous() => goTo(_index - 1);

  Future<bool> submit() async {
    final Quiz? quiz = _quiz;
    if (quiz == null || isBusy || _result != null) return false;
    _timer?.cancel();
    setState(ViewState.busy);

    final ApiResponse res = await _repository.submitQuiz(
      quizId: quiz.id,
      answers: _answers,
      multiChoiceQuestionIds: quiz.questions
          .where((QuizQuestion q) => q.allowMultipleCorrect)
          .map((QuizQuestion q) => q.id)
          .toSet(),
    );

    final Map<String, dynamic>? body = res.dataMap;
    if (!res.isSuccess || body == null) {
      setState(ViewState.error, error: res.message);
      return false;
    }

    _result = QuizResult.fromJson(body);
    setState(ViewState.success);
    return true;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
