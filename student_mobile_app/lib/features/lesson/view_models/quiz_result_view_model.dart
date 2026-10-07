// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// A quiz result, rebuilt from the server rather than handed over by the
/// screen that produced it.
///
/// **This reads the roadmap, not the node endpoint.** The `Node` schema has no
/// `progress` block — `quiz_score` exists only on the roadmap's copy of a node,
/// alongside a full `quizzes[]` whose questions already carry the learner's
/// `selected_options`. So one roadmap call supplies everything this screen
/// shows, and the result survives a reload or a deep link instead of living in
/// whatever the previous route was holding.
///
/// The one thing the roadmap cannot supply is the **correct-answer count**:
/// that is in the submit response alone, and deriving it would mean reading
/// `is_correct`, which this app never does (rule 2). [QuizOutcome.correctCount]
/// is therefore null here, and the screen prints the percentage without the
/// "n of m correct" caption.
class QuizResultViewModel extends BaseProvider {
  QuizResultViewModel({
    required this.orgId,
    required this.courseId,
    required this.nodeId,
    CoursesRepository? repository,
  }) : _repository = repository ?? const CoursesRepository();

  final int orgId;
  final int courseId;
  final int nodeId;
  final CoursesRepository _repository;

  QuizOutcome? _outcome;
  QuizOutcome? get outcome => _outcome;

  /// True when the node exists but has no recorded attempt — the learner
  /// arrived at a result that has not happened yet.
  bool get hasNoAttempt => state == ViewState.success && _outcome == null;

  Future<void> load() async {
    setState(ViewState.busy);

    final ApiResponse res = await _repository.getRoadmap(orgId, courseId);
    final Map<String, dynamic>? body = res.dataMap;
    if (!res.isSuccess || body == null) {
      setState(ViewState.error, error: res.message);
      return;
    }

    final RoadmapNode? node = Roadmap.fromJson(body).nodeById(nodeId);
    final Quiz? quiz = node?.quiz;
    final double? score = node?.quizScore;

    if (node == null || quiz == null || score == null) {
      setState(ViewState.success);
      return;
    }

    _outcome = QuizOutcome(
      quiz: quiz,
      score: score,
      passed: node.passedQuiz,
      // The roadmap persists what the learner picked, so the review is built
      // from their own answers exactly as the submit response would have.
      submittedAnswers: <int, List<int>>{
        for (final QuizQuestion q in quiz.questions) q.id: q.selectedOptionIds,
      },
    );
    setState(ViewState.success);
  }
}

/// What the result screen renders, from whichever source produced it.
///
/// [correctCount] is set only when the figure came from a submit response.
/// Rebuilt from the roadmap it is null, because the only way to count correct
/// answers there is `is_correct`.
class QuizOutcome {
  const QuizOutcome({
    required this.quiz,
    required this.score,
    required this.passed,
    this.correctCount,
    this.submittedAnswers = const <int, List<int>>{},
  });

  final Quiz quiz;

  /// A percentage, 0..100.
  final double score;

  final bool passed;
  final int? correctCount;

  /// question id → the option ids the learner submitted.
  final Map<int, List<int>> submittedAnswers;

  int get totalQuestions => quiz.questions.length;
}
