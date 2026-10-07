// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:package_info_plus/package_info_plus.dart';

/// The app's own version, read once at boot.
///
/// Loaded before `runApp` and held as plain statics, so a screen can print it
/// without a `FutureBuilder` and without a frame of blank space.
abstract final class AppInfo {
  static String version = '';
  static String buildNumber = '';

  /// `1.0.0` while unknown — a version string is decoration, never a reason to
  /// fail boot, so a platform-channel failure just leaves the fallback.
  static String get versionName => version.isEmpty ? '1.0.0' : version;

  static Future<void> load() async {
    try {
      final PackageInfo info = await PackageInfo.fromPlatform();
      version = info.version;
      buildNumber = info.buildNumber;
    } catch (_) {
      // Unavailable in unit tests and on an unsupported platform.
    }
  }
}
