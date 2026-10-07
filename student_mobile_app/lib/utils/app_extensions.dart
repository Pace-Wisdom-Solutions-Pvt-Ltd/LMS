// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:developer' as developer;

import 'package:lms/utils/app_exports.dart';

/// The only logging call in the app — never use `print`.
///
/// Stripped in release builds so nothing leaks into production logs.
void appLogPrint(Object? message, {String tag = 'LMS'}) {
  if (kReleaseMode) return;
  developer.log('$message', name: tag);
}

/// Platform checks that are safe to call anywhere.
///
/// These use `defaultTargetPlatform` rather than `dart:io`, which is unavailable
/// on web. Guard any `dart:io` usage with [isMobile] first.
class AppPlatform {
  AppPlatform._();

  static bool get isWeb => kIsWeb;
  static bool get isAndroid =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  static bool get isIOS =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
  static bool get isMobile => isAndroid || isIOS;

  /// Sent as the `X-Platform` header on every request.
  static String get name {
    if (isWeb) return 'web';
    if (isAndroid) return 'android';
    if (isIOS) return 'ios';
    return defaultTargetPlatform.name;
  }
}

/// Shorthands for the things every screen reaches for.
extension BuildContextX on BuildContext {
  /// Localized strings. All user-facing text comes from here — no hardcoded
  /// strings, even though the app currently ships English only.
  AppLocalizations get l10n => AppLocalizations.of(this);

  ThemeData get theme => Theme.of(this);
  ColorScheme get colors => Theme.of(this).colorScheme;
  TextTheme get text => Theme.of(this).textTheme;

  /// Colours that have no [ColorScheme] slot — muted, track, success, rings,
  /// and the resolved org brand fill. Never reach for a raw [Color].
  BrandColors get brand => Theme.of(this).extension<BrandColors>()!;

  EdgeInsets get viewPadding => MediaQuery.viewPaddingOf(this);
  bool get isKeyboardOpen => MediaQuery.viewInsetsOf(this).bottom > 0;

  /// True when the OS asks for reduced motion.
  bool get reduceMotion => MediaQuery.disableAnimationsOf(this);
}

extension StringX on String {
  bool get isBlank => trim().isEmpty;
  bool get isNotBlank => trim().isNotEmpty;

  String get capitalized =>
      isBlank ? this : '${this[0].toUpperCase()}${substring(1)}';
}

extension NullableStringX on String? {
  bool get isNullOrBlank => this == null || this!.trim().isEmpty;
}

/// Vertical / horizontal gaps sized with `responsive_sizer`.
extension GapX on num {
  Widget get vGap => SizedBox(height: toDouble().h);
  Widget get hGap => SizedBox(width: toDouble().w);

  /// A fixed gap in logical pixels, for when a proportional gap is wrong
  /// (icon padding, chip spacing).
  Widget get vBox => SizedBox(height: toDouble());
  Widget get hBox => SizedBox(width: toDouble());
}

/// A URL's path, lowercased, with the query string dropped.
///
/// **Every file the backend hands out is presigned** — a brand logo, a lesson
/// PDF, a task attachment all arrive as
/// `https://…/logo.svg?X-Amz-Algorithm=…&X-Amz-Signature=…`. Testing the whole
/// string for an extension therefore never matches, which is why this exists
/// rather than a bare `url.endsWith('.svg')` at each call site.
///
/// Falls back to the raw string when the URL will not parse, so a malformed
/// value still gets a best-effort answer instead of an exception.
String urlPath(String url) {
  final String trimmed = url.trim();
  final Uri? uri = Uri.tryParse(trimmed);
  return (uri?.path.isNotEmpty ?? false)
      ? uri!.path.toLowerCase()
      : trimmed.toLowerCase();
}

/// True when [url] points at an SVG.
///
/// Reads the path first, then falls back to S3's `response-content-type`
/// override, which a presigned link can carry instead of a meaningful path
/// (`…/media/abc123?response-content-type=image%2Fsvg%2Bxml`). Getting this
/// wrong is not fatal — the SVG and raster paths both fall back to the
/// monogram — but it costs a failed decode and a visible flicker.
bool looksLikeSvg(String url) {
  if (urlPath(url).endsWith('.svg')) return true;

  final Uri? uri = Uri.tryParse(url.trim());
  final String type = (uri?.queryParameters['response-content-type'] ?? '')
      .toLowerCase();
  return type.contains('svg');
}
