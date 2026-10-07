// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The Home dashboard model.
//
// The endpoint has no response schema, so these tests are written against the
// captured example: what it actually sends, including the fields Home now
// ignores and the ones that arrive null.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  Map<String, dynamic> payload({
    List<Map<String, dynamic>> progress = const <Map<String, dynamic>>[],
    Object? gamification,
  }) => <String, dynamic>{
    'cards': <String, dynamic>{
      'enrolled_courses': 4,
      'upcoming_mandatory_due_dates': 1,
      'overall_completion_percentage': 64,
      'certificates_earned': 2,
      'learning_hours_this_month': null,
    },
    // Still sent, still deliberately unread.
    'resume_learning_node_id': 12,
    'upcoming_mandatory_due_dates': <dynamic>[
      <String, dynamic>{'type': 'reminder', 'title': null},
    ],
    'progress': progress,
    'gamification': gamification,
    'certificates': <dynamic>[],
  };

  Map<String, dynamic> course(int id, num percent) => <String, dynamic>{
    'course_id': id,
    'course_title': 'Course $id',
    'completion_percentage': percent,
  };

  test('reads the cards, including a null learning-hours', () {
    final Dashboard d = Dashboard.fromJson(payload());

    expect(d.cards.enrolledCourses, 4);
    expect(d.cards.overallCompletion, 64);
    expect(d.cards.certificatesEarned, 2);
    expect(d.cards.upcomingDueDates, 1);
    expect(
      d.cards.learningHoursThisMonth,
      isNull,
      reason: 'the grid shows an em dash for this, never a bogus zero',
    );
  });

  test('points come from gamification, the only field read there', () {
    final Dashboard d = Dashboard.fromJson(
      payload(
        gamification: <String, dynamic>{
          'points': 240,
          'level': 'Beginner',
          'badges': <dynamic>['First steps'],
        },
      ),
    );

    expect(d.points, 240);
  });

  test('a missing or malformed gamification block is zero, not a crash', () {
    expect(Dashboard.fromJson(payload()).points, 0);
    expect(Dashboard.fromJson(payload(gamification: 'nonsense')).points, 0);
    expect(
      Dashboard.fromJson(
        payload(gamification: <String, dynamic>{'level': 'Beginner'}),
      ).points,
      0,
    );
  });

  group('course status buckets', () {
    test('split on the percentage alone and always sum to the total', () {
      final Dashboard d = Dashboard.fromJson(
        payload(
          progress: <Map<String, dynamic>>[
            course(1, 50),
            course(2, 100),
            course(3, 100),
            course(4, 0),
          ],
        ),
      );

      expect(d.completedCourses, 2);
      expect(d.inProgressCourses, 1);
      expect(d.notStartedCourses, 1);
      expect(
        d.completedCourses + d.inProgressCourses + d.notStartedCourses,
        d.progress.length,
        reason: 'a gap here would leave a wedge missing from the donut',
      );
    });

    test('a fractional percentage is still in progress, not complete', () {
      final Dashboard d = Dashboard.fromJson(
        payload(progress: <Map<String, dynamic>>[course(1, 99.9)]),
      );

      expect(d.inProgressCourses, 1);
      expect(d.completedCourses, 0);
    });

    test('no courses means no cards and an empty state', () {
      final Dashboard d = Dashboard.fromJson(payload());
      expect(d.hasCourses, isFalse);
      expect(d.progress, isEmpty);
    });
  });
}
