// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// `GET …/courses/{c}/modules/{m}/nodes/{n}/` — one lesson in full.
///
/// A locked lesson returns **403** from this endpoint; the screen renders the
/// lock state rather than retrying or showing an error page.
class LessonNode {
  final int id;
  final int moduleId;
  final String title;
  final String description;
  final String focusAreas;
  final String quickOutline;
  final LearningMaterial? material;
  final TaskDetail? task;
  final List<Quiz> quizzes;

  /// Coding problems in full — this is the only shape that carries
  /// `description` and `allowed_languages`, which the roadmap's copy omits.
  final List<CodingQuestion> codingQuestions;

  const LessonNode({
    required this.id,
    required this.moduleId,
    this.title = '',
    this.description = '',
    this.focusAreas = '',
    this.quickOutline = '',
    this.material,
    this.task,
    this.quizzes = const <Quiz>[],
    this.codingQuestions = const <CodingQuestion>[],
  });

  Quiz? get quiz => quizzes.isEmpty ? null : quizzes.first;

  LessonKind get kind {
    if (quizzes.isNotEmpty) return LessonKind.quiz;
    if (task != null) return LessonKind.task;
    if (codingQuestions.isNotEmpty) return LessonKind.coding;
    return LessonKind.lesson;
  }

  factory LessonNode.fromJson(Map<String, dynamic> json) => LessonNode(
    id: int.tryParse('${json['id']}') ?? -1,
    moduleId: int.tryParse('${json['module']}') ?? -1,
    title: (json['title'] ?? '').toString(),
    description: (json['description'] ?? '').toString(),
    focusAreas: (json['focus_areas'] ?? '').toString(),
    quickOutline: (json['quick_outline'] ?? '').toString(),
    material: json['learning_material'] is Map
        ? LearningMaterial.fromJson(
            Map<String, dynamic>.from(json['learning_material'] as Map),
          )
        : null,
    task: json['task'] is Map
        ? TaskDetail.fromJson(Map<String, dynamic>.from(json['task'] as Map))
        : null,
    quizzes: (json['quizzes'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              Quiz.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
    codingQuestions: CodingQuestion.listFrom(json['coding_questions']),
  );
}

/// What the learner actually consumes. `content_type` drives which player the
/// lesson screen builds.
class LearningMaterial {
  final int id;
  final String contentType;
  final String? contentUrl;
  final String? contentFile;
  final String contentText;

  const LearningMaterial({
    required this.id,
    this.contentType = '',
    this.contentUrl,
    this.contentFile,
    this.contentText = '',
  });

  /// `content_type` arrives **capitalized** — `Video`, `PDF`, `Doc`, `Link` —
  /// so every check here case-folds first.
  String get _type => contentType.toLowerCase();

  /// A `Link` keeps its URL in `content_url`; an uploaded file keeps it in
  /// `content_file`, presigned.
  String get url => (contentUrl ?? contentFile ?? '').trim();

  /// The URL's path with the query dropped — every uploaded file is presigned.
  String get _path => urlPath(url);

  bool _pathEndsWithOneOf(List<String> extensions) =>
      extensions.any((String e) => _path.endsWith(e));

  /// Decided by the **URL, not the declared type**: the backend files a
  /// YouTube lesson under `content_type: "Link"` with a `youtu.be` link, so
  /// keying off the type alone sent the learner out to a browser for a video
  /// the app can play inline.
  bool get isYouTube {
    final String host = Uri.tryParse(url)?.host.toLowerCase() ?? '';
    return host.endsWith('youtube.com') ||
        host.endsWith('youtube-nocookie.com') ||
        host.endsWith('youtu.be');
  }

  bool get isVideo =>
      _type.contains('video') ||
      isYouTube ||
      _pathEndsWithOneOf(<String>[
        '.mp4',
        '.m4v',
        '.mov',
        '.webm',
        '.mkv',
        '.m3u8',
      ]);

  bool get isDocument =>
      !isVideo &&
      (_type.contains('pdf') ||
          _type.contains('doc') ||
          _type.contains('slide') ||
          _type.contains('ppt') ||
          _pathEndsWithOneOf(<String>[
            '.pdf',
            '.doc',
            '.docx',
            '.ppt',
            '.pptx',
            '.xls',
            '.xlsx',
            '.txt',
          ]));

  /// A reading the learner opens out there. A YouTube link is typed `Link`
  /// too, so it has to be excluded explicitly.
  bool get isLink =>
      !isVideo &&
      !isDocument &&
      (_type.contains('link') || _type.contains('url'));

  bool get isText => _type.contains('text') || contentText.trim().isNotEmpty;

  factory LearningMaterial.fromJson(Map<String, dynamic> json) =>
      LearningMaterial(
        id: int.tryParse('${json['id']}') ?? -1,
        contentType: (json['content_type'] ?? '').toString(),
        contentUrl: json['content_url'] as String?,
        contentFile: json['content_file'] as String?,
        contentText: (json['content_text'] ?? '').toString(),
      );
}
