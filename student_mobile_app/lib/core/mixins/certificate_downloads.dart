// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Certificate downloads, for any view model that offers them.
///
/// Two do: [ProgressViewModel] for the whole list, [RoadmapViewModel] for the
/// one a finished course earned. The state is per-certificate — in flight, how
/// far along, where it landed — and a mixin keeps one copy of it instead of a
/// copy per view model that drifts.
///
/// Mixed onto [ChangeNotifier] rather than [BaseProvider], so [CertificateCard]
/// can listen to whichever view model it was handed without knowing which one
/// that is.
mixin CertificateDownloads on ChangeNotifier {
  /// Overridden to inject a fake; a mixin has no constructor to pass one to.
  CertificateRepository get certificateRepository =>
      const CertificateRepository();

  final Set<int> _downloading = <int>{};
  final Map<int, double> _progress = <int, double>{};
  final Map<int, String> _savedPaths = <int, String>{};

  bool isDownloading(int certificateId) => _downloading.contains(certificateId);

  /// How far along that certificate's download is, 0–1, or **null when the
  /// size is not known** — the server need not send a `Content-Length`, and a
  /// made-up fraction that sticks at 40% is worse than an honest spinner.
  double? downloadProgress(int certificateId) => _progress[certificateId];

  /// Where a certificate was last saved on this device, if it has been.
  String? savedPathFor(int certificateId) => _savedPaths[certificateId];

  /// Downloads a certificate and saves it where the learner can find it.
  ///
  /// The endpoint returns **raw PDF bytes**, not JSON. Returns the saved file,
  /// or null if the download, the write or the learner's own cancellation of
  /// the save dialog left nothing on disk.
  ///
  /// Nothing is said about a failure here. The caller knows which of View,
  /// Download and Share asked, and that is what decides the sentence — see
  /// [CertificateCard].
  Future<SavedFile?> downloadCertificate(
    Certificate certificate, {
    bool promptForLocation = true,
  }) async {
    if (_downloading.contains(certificate.id)) return null;

    // The route is keyed by the printed reference. Without one there is no URL
    // to build, and asking anyway would 404 on `/certificates//download/`.
    final String reference = certificate.certificateId.trim();
    if (reference.isEmpty) return null;

    _downloading.add(certificate.id);
    _progress.remove(certificate.id);
    notifyListeners();

    try {
      final ApiResponse res = await certificateRepository.download(
        reference,
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
      if (!res.isSuccess || bytes == null || bytes.isEmpty) return null;

      // The course names the file, and the moment of the download keeps that
      // name unique — re-downloading one certificate used to save over the
      // copy already on the device, or, on Android, show up as a second file
      // whose name said nothing about which download it was.
      //
      // A blank course name still has to produce a usable filename, so the id
      // stands in — `savePdf` cannot take an empty name.
      final String course = certificate.courseName.trim();
      final String stem = course.isEmpty
          ? 'certificate-${certificate.id}'
          : course;
      final String name = '$stem-${formatFileStamp(DateTime.now())}';

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
}
