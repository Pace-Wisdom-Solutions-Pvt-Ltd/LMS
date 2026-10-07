// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:io';

import 'package:flutter_file_dialog/flutter_file_dialog.dart';
import 'package:lms/utils/app_exports.dart';
import 'package:path_provider/path_provider.dart';

/// Where a downloaded file ended up, and whether the learner can find it
/// outside the app.
class SavedFile {
  const SavedFile({required this.path, required this.isInFileManager});

  /// Always a real file on disk, usable for sharing and opening.
  final String path;

  /// True when the file was exported somewhere a file manager lists it.
  /// False means it is app-private — still openable and shareable from here,
  /// but not browsable.
  final bool isInFileManager;
}

/// Saves downloaded bytes to disk.
///
/// Two steps, because one is not enough on modern Android:
///
///  1. Write to the app's documents directory. This always works, needs no
///     permission, and gives share and open something to point at. On **iOS**
///     this is also the end of the story — the Files app lists it, because
///     `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` are set
///     in Info.plist.
///  2. On **Android**, export it through the system "Save to" dialog. Scoped
///     storage (API 29+) blocks a direct write to the public `Download`
///     folder, so a plain `File(...).writeAsBytes` lands somewhere no file
///     manager shows. The dialog hands the write to the system, needs no
///     storage permission, and lets the learner pick the folder — which is
///     what actually satisfies "download it to my file manager".
abstract final class FileSaver {
  /// Saves [bytes] as a PDF named after [fileName].
  ///
  /// [promptForLocation] runs the Android save dialog. Pass false to save
  /// quietly — for a share, where the file only needs to exist.
  static Future<SavedFile?> savePdf({
    required Uint8List bytes,
    required String fileName,
    bool promptForLocation = true,
  }) async {
    final String safeName = _safe(fileName);

    final String? localPath = await _writeLocally(bytes, safeName);
    if (localPath == null) return null;

    if (!promptForLocation || !AppPlatform.isAndroid) {
      // iOS documents are visible in the Files app; app-private on Android.
      return SavedFile(path: localPath, isInFileManager: AppPlatform.isIOS);
    }

    final String? exported = await _exportViaSystemDialog(localPath, safeName);
    return SavedFile(path: localPath, isInFileManager: exported != null);
  }

  static Future<String?> _writeLocally(Uint8List bytes, String fileName) async {
    try {
      final Directory dir = await getApplicationDocumentsDirectory();
      if (!await dir.exists()) await dir.create(recursive: true);

      // Don't silently replace an earlier download of the same certificate.
      final File file = File('${dir.path}/${_unique(dir, fileName)}');
      await file.writeAsBytes(bytes, flush: true);
      appLogPrint('Saved ${file.path}', tag: 'FILE');
      return file.path;
    } catch (e) {
      appLogPrint('Could not write $fileName: $e', tag: 'FILE');
      return null;
    }
  }

  /// Returns the chosen path, or null if the learner cancelled or it failed.
  /// Cancelling is not an error — the file is still saved locally.
  static Future<String?> _exportViaSystemDialog(
    String sourcePath,
    String fileName,
  ) async {
    try {
      return await FlutterFileDialog.saveFile(
        params: SaveFileDialogParams(
          sourceFilePath: sourcePath,
          fileName: fileName,
          mimeTypesFilter: const <String>['application/pdf'],
        ),
      );
    } catch (e) {
      appLogPrint('Save dialog failed: $e', tag: 'FILE');
      return null;
    }
  }

  /// Strips anything that cannot go in a file name on either platform.
  static String _safe(String name) {
    final String cleaned = name
        .replaceAll(RegExp(r'[^\w\s.-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .trim();
    final String base = cleaned.isEmpty ? 'certificate' : cleaned;
    return base.toLowerCase().endsWith('.pdf') ? base : '$base.pdf';
  }

  static String _unique(Directory dir, String fileName) {
    if (!File('${dir.path}/$fileName').existsSync()) return fileName;

    final int dot = fileName.lastIndexOf('.');
    final String stem = dot == -1 ? fileName : fileName.substring(0, dot);
    final String ext = dot == -1 ? '' : fileName.substring(dot);

    for (int i = 2; i < 100; i++) {
      final String candidate = '$stem-$i$ext';
      if (!File('${dir.path}/$candidate').existsSync()) return candidate;
    }
    return '$stem-${DateTime.now().millisecondsSinceEpoch}$ext';
  }
}
