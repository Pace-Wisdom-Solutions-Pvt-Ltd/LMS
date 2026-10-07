// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Coding practice for one lesson node.
///
/// Every call is scoped by org, course, module and node, so the repository is
/// constructed with them once rather than repeating five arguments per method.
///
/// Like every repository here it returns [ApiResponse] and never throws. A
/// locked node answers **403**, which the caller renders as the lock state.
class CodingRepository {
  const CodingRepository({
    required this.orgId,
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
  });

  final int orgId;
  final int courseId;
  final int moduleId;
  final int nodeId;

  String get _course => '$courseId';
  String get _module => '$moduleId';
  String get _node => '$nodeId';

  /// Every problem on this node, in full — the roadmap's embedded copy has no
  /// `description` and no `allowed_languages`.
  Future<ApiResponse> questions() => DioClient.get(
    ApiEndPoints.codingQuestions(orgId, _course, _module, _node),
  );

  /// Starter code for one language. The backend generates it on first request
  /// and caches it, so this can be slow the first time a language is picked.
  Future<ApiResponse> signature({
    required int questionId,
    required String language,
  }) => DioClient.get(
    ApiEndPoints.codingSignature(orgId, _course, _module, _node, '$questionId'),
    query: <String, dynamic>{'language': language},
  );

  /// A dry run. With [stdin] the judge runs once against that input; without
  /// it, against the sample cases. Never graded, so it cannot complete a node.
  Future<ApiResponse> run({
    required int questionId,
    required String sourceCode,
    required String language,
    String? stdin,
  }) => DioClient.post(
    ApiEndPoints.codingRun(orgId, _course, _module, _node, '$questionId'),
    data: <String, dynamic>{
      'source_code': sourceCode,
      'language': language,
      // The field has `minLength: 1`, so an empty string is a validation
      // error rather than "no custom input" — omit it instead.
      if ((stdin ?? '').isNotEmpty) 'stdin': stdin,
    },
  );

  /// Submits for grading. Answers with the submission, which may still be
  /// `queued` — see [submission].
  Future<ApiResponse> submit({
    required int questionId,
    required String sourceCode,
    required String language,
  }) => DioClient.post(
    ApiEndPoints.codingSubmit(orgId, _course, _module, _node, '$questionId'),
    data: <String, dynamic>{
      'source_code': sourceCode,
      'language': language,
      // The app has no way to observe app switching mid-attempt, and claiming
      // otherwise would put a false flag on the learner's record.
      'tab_switch': false,
    },
  );

  /// The graded result. Judging is asynchronous, so this is polled until the
  /// submission reports it is done.
  Future<ApiResponse> submission({
    required int questionId,
    required int submissionId,
  }) => DioClient.get(
    ApiEndPoints.codingSubmission(
      orgId,
      _course,
      _module,
      _node,
      '$questionId',
      '$submissionId',
    ),
  );
}
