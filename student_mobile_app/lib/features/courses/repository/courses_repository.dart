// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Courses and their roadmaps.
class CoursesRepository {
  const CoursesRepository();

  /// A **bare array**, not a page — `ApiResponse.dataList` is the whole list.
  Future<ApiResponse> getMyCourses(int orgId) =>
      DioClient.get(ApiEndPoints.myCourses(orgId));

  Future<ApiResponse> getRoadmap(int orgId, int courseId) =>
      DioClient.get(ApiEndPoints.roadmap(orgId, '$courseId'));

  /// Returns `400` with a reason until every lesson is complete and every task
  /// is approved — the screen renders that reason as a checklist, not an error.
  Future<ApiResponse> claimCertificate(int orgId, int courseId) =>
      DioClient.get(ApiEndPoints.claimCertificate(orgId, '$courseId'));
}
