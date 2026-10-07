// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Home's data.
class DashboardRepository {
  const DashboardRepository();

  Future<ApiResponse> getDashboard(int orgId) =>
      DioClient.get(ApiEndPoints.dashboard(orgId));
}
