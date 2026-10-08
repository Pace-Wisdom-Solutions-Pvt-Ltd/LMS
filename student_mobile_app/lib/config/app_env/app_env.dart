// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Where the API lives.
///
/// Resolution order, per the handoff ("base URL comes from
/// `--dart-define=API_BASE_URL`, not a constant in source"):
///
///  1. `--dart-define=API_BASE_URL` — wins, and is what CI and release builds use.
///  2. `API_BASE_URL` in `.env`, so a plain `flutter run` works without flags
///     during development.
///
/// There is **no hardcoded fallback host**. If neither is set, [baseUrl] is
/// empty and [isConfigured] is false, which the app surfaces loudly rather than
/// silently calling a wrong origin.
class AppEnv {
  AppEnv._();

  static const String _dartDefineBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
  );

  /// The one env file. There is no `.env.dev` / `.env.prod` split, because
  static const String envFile = '.env';

  static Future<void> load() async {
    // A dart-define wins outright, so don't require the asset to exist.
    if (_dartDefineBaseUrl.trim().isNotEmpty) return;

    try {
      await dotenv.load(fileName: envFile);
    } catch (e) {
      appLogPrint(
        'No $envFile and no --dart-define=API_BASE_URL: $e',
        tag: 'ENV',
      );
    }
  }

  static String get baseUrl {
    if (_dartDefineBaseUrl.trim().isNotEmpty) return _dartDefineBaseUrl.trim();
    if (dotenv.isInitialized) {
      final String fromFile = (dotenv.env['API_BASE_URL'] ?? '').trim();
      if (fromFile.isNotEmpty) return fromFile;
    }
    return '';
  }

  static bool get isConfigured => baseUrl.isNotEmpty;
}
