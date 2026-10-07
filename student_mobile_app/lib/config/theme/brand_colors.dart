// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Colours the Material [ColorScheme] has no slot for.
///
/// Read with `context.brand` (see [BuildContextThemeX]) rather than
/// `Theme.of(context).extension<BrandColors>()!`.
@immutable
class BrandColors extends ThemeExtension<BrandColors> {
  const BrandColors({
    required this.muted,
    required this.track,
    required this.success,
    required this.successContainer,
    required this.warning,
    required this.warningContainer,
    required this.danger,
    required this.dangerContainer,
    required this.brandFill,
    required this.onBrand,
    required this.brandText,
    required this.brandSoft,
    required this.ring1,
    required this.ring2,
    required this.ring3,
    required this.codeBackground,
  });

  final Color muted;
  final Color track;
  final Color success;
  final Color successContainer;
  final Color warning;
  final Color warningContainer;
  final Color danger;
  final Color dangerContainer;
  final Color brandFill;
  final Color onBrand;
  final Color brandText;
  final Color brandSoft;
  final Color codeBackground;

  /// Gradients for the learning rings, outermost first. Two are in use —
  /// course and overall completion; [ring3] is the widget's spare slot and
  /// currently only tints the profile header.
  final List<Color> ring1;
  final List<Color> ring2;
  final List<Color> ring3;

  @override
  BrandColors copyWith({
    Color? brandFill,
    Color? onBrand,
    Color? brandText,
    Color? brandSoft,
  }) => BrandColors(
    muted: muted,
    track: track,
    success: success,
    successContainer: successContainer,
    warning: warning,
    warningContainer: warningContainer,
    danger: danger,
    dangerContainer: dangerContainer,
    brandFill: brandFill ?? this.brandFill,
    onBrand: onBrand ?? this.onBrand,
    brandText: brandText ?? this.brandText,
    brandSoft: brandSoft ?? this.brandSoft,
    ring1: ring1,
    ring2: ring2,
    ring3: ring3,
    codeBackground: codeBackground,
  );

  @override
  BrandColors lerp(ThemeExtension<BrandColors>? other, double t) {
    if (other is! BrandColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    List<Color> ll(List<Color> a, List<Color> b) => <Color>[
      for (int i = 0; i < a.length; i++) l(a[i], b[i]),
    ];
    return BrandColors(
      muted: l(muted, other.muted),
      track: l(track, other.track),
      success: l(success, other.success),
      successContainer: l(successContainer, other.successContainer),
      warning: l(warning, other.warning),
      warningContainer: l(warningContainer, other.warningContainer),
      danger: l(danger, other.danger),
      dangerContainer: l(dangerContainer, other.dangerContainer),
      brandFill: l(brandFill, other.brandFill),
      onBrand: l(onBrand, other.onBrand),
      brandText: l(brandText, other.brandText),
      brandSoft: l(brandSoft, other.brandSoft),
      ring1: ll(ring1, other.ring1),
      ring2: ll(ring2, other.ring2),
      ring3: ll(ring3, other.ring3),
      codeBackground: l(codeBackground, other.codeBackground),
    );
  }
}
