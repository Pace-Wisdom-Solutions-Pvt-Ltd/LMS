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

/// One row of `GET …/certificates/`.
///
/// `certificate_id` is the printed reference (`CERT-C-1-DEEFDA1C`) **and what
/// the download route takes**; `id` is the integer, used here only to key the
/// per-card download state.
///
/// `course` arrives as an object — `{id, title, description}` — and the flat
/// `course_name` / `certificate_title` it replaced are gone. Both shapes are
/// read so a server on either side of that change still lists something.
/// `student`, `organization`, `template`, `html_content` and `preview_url`
/// also ride along; nothing here needs them yet.
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

  /// What the API offers for the file, kept for reference only.
  ///
  /// **Not used to download.** It is absolute and built from the server's own
  /// hostname, so it arrives as `https://localhost:8000/…`; the app asks
  /// [ApiEndPoints.downloadCertificate] for the same route against its own
  /// base URL instead.
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

  factory Certificate.fromJson(Map<String, dynamic> json) {
    // `course` is an object now and was a bare id before.
    final Object? course = json['course'];
    final Map<String, dynamic> courseMap = course is Map<dynamic, dynamic>
        ? Map<String, dynamic>.from(course)
        : const <String, dynamic>{};

    final String courseTitle = (courseMap['title'] ?? json['course_name'] ?? '')
        .toString()
        .trim();

    return Certificate(
      id: int.tryParse('${json['id']}') ?? -1,
      courseId: int.tryParse('${courseMap['id'] ?? course}'),
      courseName: courseTitle,
      certificateId: (json['certificate_id'] ?? '').toString(),
      // The title the card prints is the course's; `certificate_title` is
      // what the flat shape called it.
      title: (json['certificate_title'] ?? courseTitle).toString(),
      certificateType: (json['certificate_type'] ?? '').toString(),
      downloadUrl: (json['download_url'] ?? '').toString(),
      issuedAt: DateTime.tryParse('${json['issued_at']}'),
    );
  }
}
