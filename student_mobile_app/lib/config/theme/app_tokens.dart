// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Durations and curves from `motion_spec.md`. Never hardcode a [Duration].
abstract final class AppMotion {
  static const Duration press = Duration(milliseconds: 150);
  static const Duration fadeOut = Duration(milliseconds: 90);
  static const Duration fadeIn = Duration(milliseconds: 210);
  static const Duration pop = Duration(milliseconds: 300);
  static const Duration push = Duration(milliseconds: 350);
  static const Duration sheet = Duration(milliseconds: 380);
  static const Duration rise = Duration(milliseconds: 460);
  static const Duration countUp = Duration(milliseconds: 950);
  static const Duration ringDraw = Duration(milliseconds: 1100);
  static const Duration celebrate = Duration(milliseconds: 1800);

  static const Duration listStagger = Duration(milliseconds: 45);
  static const Duration ringStagger = Duration(milliseconds: 140);

  /// The splash brand animation floor (FR-AUTH-6).
  ///
  /// The wordmark rises at 0ms and the tagline at 200ms, 600ms each, so the
  /// sequence finishes at 800ms. Navigating before then would cut the tagline
  /// off mid-rise; holding much past it is dead time. It was 3350ms when the
  /// logo had a spin-and-settle choreography in front of the text — that is
  /// gone, and so is the wait for it.
  static const Duration splashFloor = Duration(milliseconds: 1100);

  static const Curve standard = Easing.standard;
  static const Curve decelerate = Easing.emphasizedDecelerate;
  static const Curve accelerate = Easing.emphasizedAccelerate;
  static const Curve ring = Cubic(0.2, 0.8, 0.2, 1);
  static const Curve spring = Curves.easeOutBack;

  /// Respect the OS "reduce motion" setting — skip ring draws, count-ups and
  /// confetti, and show final values immediately.
  static bool reduced(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context);
}

abstract final class AppRadius {
  static const double chip = 999;
  static const double input = 15;
  static const double button = 17;
  static const double iconButton = 14;
  static const double tile = 14;
  static const double option = 18;
  static const double card = 22;
  static const double hero = 24;
  static const double sheet = 28;
}

abstract final class AppSpace {
  static const double xxs = 4;
  static const double xs = 6;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 26;

  /// Screen gutter on phones. Use `context.gutter` for a tablet-aware value.
  static const double gutter = 20;
  static const double sectionGap = 26;
}
