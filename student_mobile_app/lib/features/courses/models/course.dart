// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// A course as `GET …/my-courses/` returns it.
///
/// That endpoint is a **bare array**, not a DRF page — check the example before
/// assuming pagination.
class Course {
  final int id;
  final String title;
  final String description;
  final String? thumbnail;
  final String status;
  final double completionPercentage;
  final String? completionDeadline;
  final List<CourseBatch> batches;

  const Course({
    required this.id,
    required this.title,
    this.description = '',
    this.thumbnail,
    this.status = '',
    this.completionPercentage = 0,
    this.completionDeadline,
    this.batches = const <CourseBatch>[],
  });

  /// The three filter buckets on My Courses derive from the percentage alone:
  /// 0 / 1–99 / 100.
  bool get isNotStarted => completionPercentage <= 0;
  bool get isCompleted => completionPercentage >= 100;
  bool get isInProgress => !isNotStarted && !isCompleted;

  String get batchName => batches.isEmpty ? '' : batches.first.name;

  /// `completion_deadline` is a date-only string (`2026-12-25`). Null when the
  /// course has no deadline, or when the backend sends something unparseable.
  DateTime? get deadline => completionDeadline == null
      ? null
      : DateTime.tryParse(completionDeadline!);

  /// True once the deadline is in the past, so the badge can say so.
  bool get isOverdue {
    final DateTime? d = deadline;
    return d != null && d.isBefore(DateTime.now()) && !isCompleted;
  }

  /// Search matches title, batch name and description.
  bool matches(String query) {
    final String q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return title.toLowerCase().contains(q) ||
        batchName.toLowerCase().contains(q) ||
        description.toLowerCase().contains(q);
  }

  factory Course.fromJson(Map<String, dynamic> json) => Course(
    id: int.tryParse('${json['id']}') ?? -1,
    title: (json['title'] ?? '').toString(),
    description: (json['description'] ?? '').toString(),
    thumbnail: json['thumbnail'] as String?,
    status: (json['status'] ?? '').toString(),
    completionPercentage:
        double.tryParse('${json['completion_percentage']}') ?? 0,
    completionDeadline: json['completion_deadline'] as String?,
    batches: (json['batches_detail'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              CourseBatch.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
  );
}

class CourseBatch {
  final int id;
  final String name;
  final String? completionDeadline;

  const CourseBatch({
    required this.id,
    required this.name,
    this.completionDeadline,
  });

  factory CourseBatch.fromJson(Map<String, dynamic> json) => CourseBatch(
    id: int.tryParse('${json['id']}') ?? -1,
    name: (json['name'] ?? '').toString(),
    completionDeadline: json['completion_deadline'] as String?,
  );
}
