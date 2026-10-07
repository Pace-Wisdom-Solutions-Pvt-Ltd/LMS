// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// `GET …/students/me/dashboard/` — everything Home renders.
///
/// No response schema exists for this endpoint; built from the captured
/// example. Several fields are routinely `null` (`learning_hours_this_month`),
/// and the payload carries more than Home shows: `resume_learning_node_id` and
/// `upcoming_mandatory_due_dates` are deliberately unparsed, because the
/// screen no longer surfaces either.
class Dashboard {
  final DashboardCards cards;
  final List<CourseProgress> progress;

  /// `gamification.points` — the only gamification field the app reads. There
  /// are no levels, no badges and no XP ring; this is one number on the "At a
  /// glance" grid.
  final int points;

  const Dashboard({
    this.cards = const DashboardCards(),
    this.progress = const <CourseProgress>[],
    this.points = 0,
  });

  static const Dashboard empty = Dashboard();

  bool get hasCourses => progress.isNotEmpty;

  /// The "Course status" donut. Buckets come from the percentage alone, so
  /// they always sum to [progress]`.length` and the ring never has a gap.
  int get completedCourses => progress
      .where((CourseProgress c) => c.completionPercentage >= 100)
      .length;

  int get inProgressCourses => progress
      .where(
        (CourseProgress c) =>
            c.completionPercentage > 0 && c.completionPercentage < 100,
      )
      .length;

  int get notStartedCourses =>
      progress.where((CourseProgress c) => c.completionPercentage <= 0).length;

  factory Dashboard.fromJson(Map<String, dynamic> json) => Dashboard(
    cards: DashboardCards.fromJson(
      json['cards'] is Map
          ? Map<String, dynamic>.from(json['cards'] as Map)
          : const <String, dynamic>{},
    ),
    progress: (json['progress'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              CourseProgress.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
    points: json['gamification'] is Map
        ? int.tryParse('${(json['gamification'] as Map)['points']}') ?? 0
        : 0,
  );
}

class DashboardCards {
  final int enrolledCourses;
  final int upcomingDueDates;
  final double overallCompletion;
  final int certificatesEarned;
  final double? learningHoursThisMonth;

  const DashboardCards({
    this.enrolledCourses = 0,
    this.upcomingDueDates = 0,
    this.overallCompletion = 0,
    this.certificatesEarned = 0,
    this.learningHoursThisMonth,
  });

  factory DashboardCards.fromJson(Map<String, dynamic> json) => DashboardCards(
    enrolledCourses: int.tryParse('${json['enrolled_courses']}') ?? 0,
    upcomingDueDates:
        int.tryParse('${json['upcoming_mandatory_due_dates']}') ?? 0,
    overallCompletion:
        double.tryParse('${json['overall_completion_percentage']}') ?? 0,
    certificatesEarned: int.tryParse('${json['certificates_earned']}') ?? 0,
    learningHoursThisMonth: double.tryParse(
      '${json['learning_hours_this_month']}',
    ),
  );
}

class CourseProgress {
  final int courseId;
  final String courseTitle;
  final double completionPercentage;

  const CourseProgress({
    required this.courseId,
    required this.courseTitle,
    this.completionPercentage = 0,
  });

  factory CourseProgress.fromJson(Map<String, dynamic> json) => CourseProgress(
    courseId: int.tryParse('${json['course_id']}') ?? -1,
    courseTitle: (json['course_title'] ?? '').toString(),
    completionPercentage:
        double.tryParse('${json['completion_percentage']}') ?? 0,
  );
}
