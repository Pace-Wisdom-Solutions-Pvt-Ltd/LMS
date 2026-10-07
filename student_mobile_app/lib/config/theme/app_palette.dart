// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Raw palette, straight from `design_tokens.json`.
///
/// These are the **product's own** neutral defaults, used before an organization
/// is known and whenever an org supplies no usable brand colour. Nothing here is
/// tied to a specific company — org branding replaces the brand colours at
/// runtime (see [AppBrand]).
abstract final class AppPalette {
  // Default brand pair.
  static const Color seedPrimary = Color(0xFF2F78B3);
  static const Color seedAccent = Color(0xFFE0517D);

  static const Color ink = Color(0xFF0D1B2A);
  static const Color white = Color(0xFFFFFFFF);

  // Default ring gradients, used when an org sets no brand colours.
  static const Color ringGreen = Color(0xFF74C05F);
  static const Color ringCyan = Color(0xFF35BAD3);
  static const Color ringPink = Color(0xFFE0517D);
  static const Color ringBlue = Color(0xFF3299DB);
  static const Color ringOrange = Color(0xFFE38535);
  static const Color ringAmber = Color(0xFFF9C93F);

  // Light
  static const Color lBackground = Color(0xFFF5F9FD);
  static const Color lSurface = Color(0xFFFFFFFF);
  static const Color lSurfaceVariant = Color(0xFFEDF3FA);
  static const Color lMuted = Color(0xFF56657A);
  static const Color lOutline = Color(0xFFDDE6F0);
  static const Color lTrack = Color(0xFFE3EAF3);
  static const Color lSuccess = Color(0xFF238A4E);
  static const Color lSuccessContainer = Color(0xFFDDF3E5);
  static const Color lWarning = Color(0xFFB8700F);
  static const Color lWarningContainer = Color(0xFFFCEFD9);
  static const Color lDanger = Color(0xFFC8314A);
  static const Color lDangerContainer = Color(0xFFFBE3E7);

  // Dark
  static const Color dBackground = Color(0xFF0B1526);
  static const Color dSurface = Color(0xFF111E30);
  static const Color dSurfaceVariant = Color(0xFF172840);
  static const Color dInk = Color(0xFFE7EEF7);
  static const Color dMuted = Color(0xFF93A3B8);
  static const Color dOutline = Color(0xFF23344B);
  static const Color dTrack = Color(0xFF1C2C42);
  static const Color dSuccess = Color(0xFF5BCB84);
  static const Color dSuccessContainer = Color(0xFF133322);
  static const Color dWarning = Color(0xFFF0B458);
  static const Color dWarningContainer = Color(0xFF33250F);
  static const Color dDanger = Color(0xFFF07A8E);
  static const Color dDangerContainer = Color(0xFF3A1820);

  // ── The code editor (`.editor` in the prototype) ─────────────────────────
  //
  // Fixed, not brand-derived and not theme-derived: a code box reads as a
  // terminal in either mode, and tinting it with an arbitrary admin-chosen
  // hex would wreck the only place in the app where whitespace is meaning.
  static const Color codeBackground = Color(0xFF0A1422);
  static const Color codeGutter = Color(0xFF08111D);
  static const Color codeLine = Color(0xFF1C2A3D);
  static const Color codeText = Color(0xFFD8E4F2);
  static const Color codeMuted = Color(0xFF50627A);
}

/// WCAG contrast ratio between two colours.
double contrastRatio(Color a, Color b) {
  final double la = a.computeLuminance();
  final double lb = b.computeLuminance();
  final double hi = la > lb ? la : lb;
  final double lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

/// Moves [c] toward black (light backgrounds) or white (dark backgrounds) until
/// it reaches [min] contrast against [background].
///
/// This is what keeps an arbitrary org brand colour readable: a pale yellow
/// brand is darkened until its text passes 4.5:1 rather than rendered raw.
Color ensureContrast(Color c, Color background, double min) {
  final Color target = background.computeLuminance() > 0.4
      ? const Color(0xFF000000)
      : AppPalette.white;
  for (double t = 0.0; t <= 1.0; t += 0.04) {
    final Color candidate = Color.lerp(c, target, t)!;
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return target;
}

/// Deepens [fill] until **white** text on it clears [min] contrast.
///
/// White is the label colour on every brand fill in this app — black on a
/// brand green reads as a disabled control, whatever the arithmetic says — so
/// when a hex is too pale to carry it, the *fill* moves rather than the label.
/// 3:1 is the WCAG floor for a bold label and for a UI component's own edges,
/// which is what a filled button is.
///
/// A fill that already carries white comes back untouched, so most brands are
/// unchanged; only a pale one is darkened, and only as far as it has to be.
Color deepenForWhiteText(Color fill, {double min = 3.0}) {
  for (double t = 0.0; t <= 1.0; t += 0.04) {
    final Color candidate = Color.lerp(fill, AppPalette.ink, t)!;
    if (contrastRatio(AppPalette.white, candidate) >= min) return candidate;
  }
  return AppPalette.ink;
}

/// White or ink text, whichever reads better on [fill].
Color onColor(Color fill) =>
    contrastRatio(AppPalette.white, fill) >= contrastRatio(AppPalette.ink, fill)
    ? AppPalette.white
    : AppPalette.ink;
