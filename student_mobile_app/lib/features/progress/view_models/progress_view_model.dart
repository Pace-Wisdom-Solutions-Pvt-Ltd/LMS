// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Overall progress and the learner's certificates.
class ProgressViewModel extends BaseProvider {
  ProgressViewModel({ProgressRepository? repository})
    : _repository = repository ?? const ProgressRepository();

  final ProgressRepository _repository;

  ProgressSummary _summary = ProgressSummary.empty;
  ProgressSummary get summary => _summary;

  List<Certificate> _certificates = const <Certificate>[];

  /// Everything `GET …/certificates/` returned, in the order it returned it.
  /// The learner earned all of it, so all of it is listed.
  List<Certificate> get certificates => _certificates;

  /// The Certificates tabs filter on type rather than on two endpoints —

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

  /// Downloads a certificate and saves it where the learner can find it.
  ///
  /// The endpoint returns **raw PDF bytes**, not JSON. Returns the saved path,
  /// or null if either the download or the write failed — the screen says
  /// which rather than failing silently.
  Future<SavedFile?> downloadCertificate(
    int orgId,
    Certificate certificate, {
    bool promptForLocation = true,
  }) async {
    if (_downloading.contains(certificate.id)) return null;
    _downloading.add(certificate.id);
    _progress.remove(certificate.id);
    notifyListeners();

    try {
      final ApiResponse res = await _repository.downloadCertificate(
        orgId,
        certificate.id,
        onReceiveProgress: (int received, int total) {
          // `total` is -1 when the response carries no `Content-Length`, so
          // there is no fraction to report — the card falls back to an
          // indeterminate ring rather than inventing one.
          if (total <= 0) return;
          final double next = (received / total).clamp(0.0, 1.0);
          // Dio fires this per chunk, which on a small PDF over a fast
          // connection is dozens of frames' worth of rebuilds for movement
          // too small to see.
          if (next - (_progress[certificate.id] ?? 0) < 0.01 && next < 1) {
            return;
          }
          _progress[certificate.id] = next;
          notifyListeners();
        },
      );
      final Uint8List? bytes = res.bytes;

      if (!res.isSuccess || bytes == null || bytes.isEmpty) {
        setState(ViewState.error, error: res.message);
        return null;
      }

      // The course names the file. A blank one still has to produce a usable
      // filename, so the id stands in — `savePdf` cannot take an empty name.
      final String course = certificate.courseName.trim();
      final String name = course.isEmpty
          ? 'certificate-${certificate.id}'
          : course;

      final SavedFile? saved = await FileSaver.savePdf(
        bytes: bytes,
        fileName: name,
        promptForLocation: promptForLocation,
      );
      if (saved == null) return null;

      _savedPaths[certificate.id] = saved.path;
      notifyListeners();
      return saved;
    } finally {
      _downloading.remove(certificate.id);
      _progress.remove(certificate.id);
      notifyListeners();
    }
  }

  /// Where a certificate was last saved on this device, if it has been.
  String? savedPathFor(int certificateId) => _savedPaths[certificateId];

  bool isDownloading(int certificateId) => _downloading.contains(certificateId);

  /// How far along that certificate's download is, 0–1, or **null when the
  /// size is not known** — the server need not send a `Content-Length`, and a
  /// made-up fraction that sticks at 40% is worse than an honest spinner.
  double? downloadProgress(int certificateId) => _progress[certificateId];

  final Set<int> _downloading = <int>{};
  final Map<int, double> _progress = <int, double>{};
  final Map<int, String> _savedPaths = <int, String>{};
}
