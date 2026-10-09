// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Progress and certificates.
class ProgressRepository {
  const ProgressRepository();

  Future<ApiResponse> getProgress(int orgId) =>
      DioClient.get(ApiEndPoints.myProgress(orgId));

  /// Paginated.
  Future<ApiResponse> getCertificates(int orgId) =>
      DioClient.get(ApiEndPoints.certificates(orgId));
}
