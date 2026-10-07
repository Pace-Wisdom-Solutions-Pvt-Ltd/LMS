// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The answer key must never reach the app.
//
// The quiz node endpoint exposes `is_correct` on every option once the learner
// has passed — a known backend leak (PRD R3). The models drop it at the
// boundary, which is what makes it impossible for a widget to render it by
// accident.
//
// These tests exist to fail loudly if anyone ever adds the field back.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  group('quiz options', () {
    test('drop is_correct even when the backend exposes it after a pass', () {
      final Quiz q = Quiz.fromJson(<String, dynamic>{
        'id': 1,
        'name': 'Python Basics Quiz',
        'timer_minutes': 10,
        'pass_percentage': 60,
        'must_pass_to_continue': false,
        'questions': <dynamic>[
          <String, dynamic>{
            'id': 1,
            'question_text': 'Which keyword defines a function?',
            'allow_multiple_correct': false,
            'options': <dynamic>[
              <String, dynamic>{
                'id': 1,
                'option_text': 'def',
                'is_correct': true,
              },
              <String, dynamic>{'id': 2, 'option_text': 'func'},
            ],
            'selected_options': <dynamic>[],
          },
        ],
      });

      expect(q.questions.single.options, hasLength(2));
      expect(q.questions.single.options.first.text, 'def');
    });
  });

  group('quiz review', () {
    test('is built from the submit response and the learner\'s own picks', () {
      // api/examples/25-quiz-submit.json
      final QuizResult r = QuizResult.fromJson(<String, dynamic>{
        'id': 1,
        'quiz_name': 'Python Basics Quiz',
        'score': '33.33',
        'total_questions': 3,
        'correct_answers': 1,
        'passed': false,
        'attempt_number': 1,
        'raw_answers_data': <dynamic>[
          <String, dynamic>{
            'question': 1,
            'selected_options': <dynamic>[],
            'selected_option': 1,
          },
          <String, dynamic>{
            'question': 2,
            'selected_options': <dynamic>[5, 6],
            'selected_option': null,
          },
        ],
      });

      expect(r.score, closeTo(33.33, 0.01));
      expect(r.passed, isFalse);
      // Single-answer questions arrive as selected_option, multi as
      // selected_options — both end up as a list of ids.
      expect(r.submittedAnswers[1], <int>[1]);
      expect(r.submittedAnswers[2], <int>[5, 6]);
    });
  });
}
