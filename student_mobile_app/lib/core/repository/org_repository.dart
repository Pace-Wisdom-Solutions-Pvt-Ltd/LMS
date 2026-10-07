// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Organization lookups, used for white-label branding.
class OrgRepository {
  const OrgRepository();

  /// The authenticated org record. Also returns operations data students have
  /// no use for (`employee_count`, `compliance_rate`, `storage_used`) — only
  /// the branding fields are read (PRD R6).
  Future<ApiResponse> getOrganization(int orgId) =>
      DioClient.get(ApiEndPoints.organization(orgId));
}
