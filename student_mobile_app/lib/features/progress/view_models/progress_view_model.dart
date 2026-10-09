// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Overall progress and the learner's certificates.
///
/// Downloading one is [CertificateDownloads]' job, shared with
/// [RoadmapViewModel] — a finished course offers its certificate from the
/// roadmap too.
class ProgressViewModel extends BaseProvider with CertificateDownloads {
  ProgressViewModel({
    ProgressRepository? repository,
    CertificateRepository? certificates,
  }) : _repository = repository ?? const ProgressRepository(),
       _certificateRepository = certificates ?? const CertificateRepository();

  final ProgressRepository _repository;
  final CertificateRepository _certificateRepository;

  @override
  CertificateRepository get certificateRepository => _certificateRepository;

  ProgressSummary _summary = ProgressSummary.empty;
  ProgressSummary get summary => _summary;

  List<Certificate> _certificates = const <Certificate>[];

  /// Everything `GET …/certificates/` returned, in the order it returned it.
  /// The learner earned all of it, so all of it is listed.
  List<Certificate> get certificates => _certificates;

  bool _loadedOnce = false;
  bool get loadedOnce => _loadedOnce;

  Future<void> load(int orgId, {bool refresh = false}) async {
    if (!refresh && !_loadedOnce) setState(ViewState.busy);

    final List<ApiResponse> results = await Future.wait<ApiResponse>(
      <Future<ApiResponse>>[
        _repository.getProgress(orgId),
        _repository.getCertificates(orgId),
      ],
    );

    final ApiResponse progress = results[0];
    final ApiResponse certificates = results[1];

    if (progress.isSuccess && progress.dataMap != null) {
      _summary = ProgressSummary.fromJson(progress.dataMap!);
      _loadedOnce = true;
    }

    // Certificates are paginated and may legitimately be empty.
    if (certificates.isSuccess) {
      _certificates = certificates.listOf(Certificate.fromJson);
    }

    if (!progress.isSuccess && !_loadedOnce) {
      setState(ViewState.error, error: progress.message);
      return;
    }
    setState(ViewState.success);
  }
}
