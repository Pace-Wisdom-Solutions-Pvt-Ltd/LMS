// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The certificate PDF, by its printed reference.
///
/// Its own repository rather than a method on one feature's: two screens offer
/// certificates now — Progress lists every one the learner has earned, and a
/// finished course's roadmap offers the one that course earned — and the route
/// belongs to neither of them. It is not org-scoped either.
class CertificateRepository {
  const CertificateRepository();

  /// Returns **raw PDF bytes**, not JSON — read `ApiResponse.bytes`.
  ///
  /// Takes the printed reference (`CERT-C-1-DEEFDA1C`), not the integer id.
  Future<ApiResponse> download(
    String certificateId, {
    ProgressCallback? onReceiveProgress,
  }) => DioClient.download(
    ApiEndPoints.downloadCertificate(certificateId),
    onReceiveProgress: onReceiveProgress,
  );
}
