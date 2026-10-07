// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:convert';

import 'package:lms/utils/app_exports.dart';

/// One lesson: its content, its completion, its task and its quiz.
class LessonRepository {
  const LessonRepository();

  /// A locked lesson answers **403**. The caller renders the lock state; it
  /// must not retry.
  Future<ApiResponse> getLesson({
    required int orgId,
    required int courseId,
    required int moduleId,
    required int nodeId,
  }) => DioClient.get(
    ApiEndPoints.node(orgId, '$courseId', '$moduleId', '$nodeId'),
  );

  /// Marks a lesson complete. Idempotent from the app's side: re-completing an
  /// already-complete lesson must never surface an error to the learner.
  Future<ApiResponse> complete(int nodeId) =>
      DioClient.post(ApiEndPoints.completeNode('$nodeId'));

  /// Every attempt on this node, newest first.
  ///
  /// A **bare array** per the schema, so `ApiResponse.listOf` is the reader —
  /// though `DioClient` unwraps a page object too, in case the backend starts
  /// paginating it.
  Future<ApiResponse> taskSubmissions(int nodeId) =>
      DioClient.get(ApiEndPoints.submitTask('$nodeId'));

  /// Task submission is **`multipart/form-data`**, and `payload` is a JSON
  /// **string**, not an object. At least one of `payload` / `submission_file`
  /// must be present.
  Future<ApiResponse> submitTask({
    required int nodeId,
    Map<String, dynamic>? payload,
    String? filePath,
    String? fileName,
  }) async {
    final bool hasPayload = payload != null && payload.isNotEmpty;
    final bool hasFile = (filePath ?? '').isNotEmpty;
    if (!hasPayload && !hasFile) {
      return ApiResponse.failure('Add something to submit first.');
    }

    final FormData form = FormData.fromMap(<String, dynamic>{
      if (hasPayload) 'payload': jsonEncode(payload),
      if (hasFile)
        'submission_file': await MultipartFile.fromFile(
          filePath!,
          filename: fileName,
        ),
    });

    return DioClient.upload(ApiEndPoints.submitTask('$nodeId'), form);
  }

  /// Single-answer questions send `selected_option`; questions that allow more
  /// than one correct answer send `selected_options`.
  Future<ApiResponse> submitQuiz({
    required int quizId,
    required Map<int, List<int>> answers,
    required Set<int> multiChoiceQuestionIds,
  }) {
    final List<Map<String, dynamic>> payload = <Map<String, dynamic>>[];
    answers.forEach((int question, List<int> picked) {
      if (picked.isEmpty) return;
      payload.add(<String, dynamic>{
        'question': question,
        if (multiChoiceQuestionIds.contains(question))
          'selected_options': picked
        else
          'selected_option': picked.first,
      });
    });

    return DioClient.post(
      ApiEndPoints.submitQuiz('$quizId'),
      data: <String, dynamic>{'answers': payload},
    );
  }
}
