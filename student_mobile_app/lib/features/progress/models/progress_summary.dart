// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// `GET …/my-progress/` — overall completion plus a per-course breakdown,
/// grouped by the batch the learner was assigned through.
class ProgressSummary {
  final double overallCompletionPercentage;
  final int totalNodes;
  final int completedNodes;
  final List<BatchProgress> batches;

  const ProgressSummary({
    this.overallCompletionPercentage = 0,
    this.totalNodes = 0,
    this.completedNodes = 0,
    this.batches = const <BatchProgress>[],
  });

  static const ProgressSummary empty = ProgressSummary();

  List<CourseProgressDetail> get allCourses =>
      batches.expand((BatchProgress b) => b.courses).toList();

  factory ProgressSummary.fromJson(Map<String, dynamic> json) =>
      ProgressSummary(
        overallCompletionPercentage:
            double.tryParse('${json['overall_completion_percentage']}') ?? 0,
        totalNodes: int.tryParse('${json['total_nodes']}') ?? 0,
        completedNodes: int.tryParse('${json['completed_nodes']}') ?? 0,
        batches: (json['batches'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<dynamic, dynamic>>()
            .map(
              (Map<dynamic, dynamic> e) =>
                  BatchProgress.fromJson(Map<String, dynamic>.from(e)),
            )
            .toList(),
      );
}

class BatchProgress {
  final int id;
  final String name;
  final List<CourseProgressDetail> courses;

  const BatchProgress({
    required this.id,
    required this.name,
    this.courses = const <CourseProgressDetail>[],
  });

  factory BatchProgress.fromJson(Map<String, dynamic> json) => BatchProgress(
    id: int.tryParse('${json['id']}') ?? -1,
    name: (json['name'] ?? '').toString(),
    courses: (json['courses'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              CourseProgressDetail.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
  );
}

class CourseProgressDetail {
  final int id;
  final String title;
  final int completedNodes;
  final int totalNodes;
  final double completionPercentage;

  const CourseProgressDetail({
    required this.id,
    required this.title,
    this.completedNodes = 0,
    this.totalNodes = 0,
    this.completionPercentage = 0,
  });

  factory CourseProgressDetail.fromJson(Map<String, dynamic> json) =>
      CourseProgressDetail(
        id: int.tryParse('${json['id']}') ?? -1,
        title: (json['title'] ?? '').toString(),
        completedNodes: int.tryParse('${json['completed_nodes']}') ?? 0,
        totalNodes: int.tryParse('${json['total_nodes']}') ?? 0,
        completionPercentage:
            double.tryParse('${json['completion_percentage']}') ?? 0,
      );
}

/// One row of `GET …/certificates/` (a DRF page).
///
/// The captured example is an empty page, so this is written against the
/// OpenAPI `Certificate` schema: `certificate_title` is the display name,
/// `certificate_id` is the printed reference (`CERT-C-5-EC645BC6`), and `id`
/// is the integer the download URL takes.
class Certificate {
  final int id;

  /// The course this was earned for, when the record names one.
  final int? courseId;

  final String courseName;

  /// The printed reference, e.g. `CERT-C-5-EC645BC6`.
  final String certificateId;

  /// `certificate_title`.
  final String title;

  /// Read and kept, but **nothing branches on it**: every certificate the
  /// endpoint returns is listed. It is here so the value is to hand the day
  /// something needs to tell them apart.
  final String certificateType;

  /// The path the API offers for the file. The download goes through
  /// `ApiEndPoints.downloadCertificate(orgId, id)` instead, which is the
  /// documented route and needs no parsing of a relative path.
  final String downloadUrl;

  final DateTime? issuedAt;

  const Certificate({
    required this.id,
    this.courseId,
    this.courseName = '',
    this.certificateId = '',
    this.title = '',
    this.certificateType = '',
    this.downloadUrl = '',
    this.issuedAt,
  });

  factory Certificate.fromJson(Map<String, dynamic> json) => Certificate(
    id: int.tryParse('${json['id']}') ?? -1,
    courseId: int.tryParse('${json['course']}'),
    courseName: (json['course_name'] ?? '').toString(),
    certificateId: (json['certificate_id'] ?? '').toString(),
    title: (json['certificate_title'] ?? '').toString(),
    certificateType: (json['certificate_type'] ?? '').toString(),
    downloadUrl: (json['download_url'] ?? '').toString(),
    issuedAt: DateTime.tryParse('${json['issued_at']}'),
  );
}
