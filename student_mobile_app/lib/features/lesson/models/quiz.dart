// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// A quiz attached to a lesson.
///
/// **`is_correct` is never read.** The backend withholds it until the learner
/// has passed and then exposes it on the same payload; parsing it out here
/// means it cannot leak into a widget later, and the review renders identically
/// whether they passed or failed.
class Quiz {
  final int id;
  final String name;
  final int? timerMinutes;
  final double passPercentage;
  final bool mustPassToContinue;
  final List<QuizQuestion> questions;

  const Quiz({
    required this.id,
    this.name = '',
    this.timerMinutes,
    this.passPercentage = 0,
    this.mustPassToContinue = false,
    this.questions = const <QuizQuestion>[],
  });

  bool get isTimed => (timerMinutes ?? 0) > 0;
  Duration get duration => Duration(minutes: timerMinutes ?? 0);

  factory Quiz.fromJson(Map<String, dynamic> json) => Quiz(
    id: int.tryParse('${json['id']}') ?? -1,
    name: (json['name'] ?? '').toString(),
    timerMinutes: int.tryParse('${json['timer_minutes']}'),
    passPercentage: double.tryParse('${json['pass_percentage']}') ?? 0,
    mustPassToContinue: json['must_pass_to_continue'] == true,
    questions: (json['questions'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              QuizQuestion.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
  );
}

class QuizQuestion {
  final int id;
  final String text;
  final bool allowMultipleCorrect;
  final List<AnswerOption> options;

  /// What the learner picked previously, when the backend returns it.
  final List<int> selectedOptionIds;

  const QuizQuestion({
    required this.id,
    this.text = '',
    this.allowMultipleCorrect = false,
    this.options = const <AnswerOption>[],
    this.selectedOptionIds = const <int>[],
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
    id: int.tryParse('${json['id']}') ?? -1,
    text: (json['question_text'] ?? '').toString(),
    allowMultipleCorrect: json['allow_multiple_correct'] == true,
    options: (json['options'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              AnswerOption.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
    selectedOptionIds:
        (json['selected_options'] as List<dynamic>? ?? const <dynamic>[])
            .map((dynamic e) => int.tryParse('$e') ?? -1)
            .where((int e) => e >= 0)
            .toList(),
  );
}

/// An answer option.
///
/// There is deliberately **no `isCorrect` field**. Both payloads carry
/// `is_correct` — the node endpoint leaks it once the learner has passed, which is
/// a known backend bug — and dropping it at this boundary is what guarantees no
/// answer key can reach the UI.
class AnswerOption {
  final int id;
  final String text;

  const AnswerOption({required this.id, this.text = ''});

  factory AnswerOption.fromJson(Map<String, dynamic> json) => AnswerOption(
    id: int.tryParse('${json['id']}') ?? -1,
    text: (json['option_text'] ?? '').toString(),
  );
}

/// The response to `POST /api/quizzes/{id}/submit/`.
///
/// The review is built from this plus the learner's own picks — never from
/// `is_correct`.
class QuizResult {
  final int id;
  final String quizName;
  final double score;
  final int totalQuestions;
  final int correctAnswers;
  final bool passed;
  final int attemptNumber;

  /// question id → the option ids this attempt submitted.
  final Map<int, List<int>> submittedAnswers;

  const QuizResult({
    required this.id,
    this.quizName = '',
    this.score = 0,
    this.totalQuestions = 0,
    this.correctAnswers = 0,
    this.passed = false,
    this.attemptNumber = 1,
    this.submittedAnswers = const <int, List<int>>{},
  });

  factory QuizResult.fromJson(Map<String, dynamic> json) {
    final Map<int, List<int>> answers = <int, List<int>>{};
    for (final dynamic raw
        in json['raw_answers_data'] as List<dynamic>? ?? const <dynamic>[]) {
      if (raw is! Map) continue;
      final int q = int.tryParse('${raw['question']}') ?? -1;
      if (q < 0) continue;
      final List<int> picked = <int>[
        ...(raw['selected_options'] as List<dynamic>? ?? const <dynamic>[]).map(
          (dynamic e) => int.tryParse('$e') ?? -1,
        ),
        if (raw['selected_option'] != null)
          int.tryParse('${raw['selected_option']}') ?? -1,
      ].where((int e) => e >= 0).toList();
      answers[q] = picked;
    }

    return QuizResult(
      id: int.tryParse('${json['id']}') ?? -1,
      quizName: (json['quiz_name'] ?? '').toString(),
      score: double.tryParse('${json['score']}') ?? 0,
      totalQuestions: int.tryParse('${json['total_questions']}') ?? 0,
      correctAnswers: int.tryParse('${json['correct_answers']}') ?? 0,
      passed: json['passed'] == true,
      attemptNumber: int.tryParse('${json['attempt_number']}') ?? 1,
      submittedAnswers: answers,
    );
  }
}
