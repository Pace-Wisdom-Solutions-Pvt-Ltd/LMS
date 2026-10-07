// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Layout class for the current window.
///
/// The handoff targets phone portrait, but the app must also be usable on a
/// tablet, so every screen sizes itself from one of these rather than assuming
/// a phone width.
enum FormFactor { phone, tablet, desktop }

/// Breakpoints, on the short side of the window so a rotated phone does not
/// masquerade as a tablet.
abstract final class Breakpoints {
  static const double tablet = 600;
  static const double desktop = 1000;
}

extension ResponsiveX on BuildContext {
  Size get windowSize => MediaQuery.sizeOf(this);

  FormFactor get formFactor {
    final Size size = windowSize;
    final double shortest = size.shortestSide;
    if (shortest >= Breakpoints.desktop) return FormFactor.desktop;
    if (shortest >= Breakpoints.tablet) return FormFactor.tablet;
    return FormFactor.phone;
  }

  bool get isPhone => formFactor == FormFactor.phone;
  bool get isTablet => formFactor != FormFactor.phone;
  bool get isLandscape => windowSize.width > windowSize.height;

  /// Screen gutter — 20 on a phone per the design tokens, wider on a tablet
  /// where a 20px margin against a 10" screen looks like a mistake.
  double get gutter => switch (formFactor) {
    FormFactor.phone => AppSpace.gutter,
    FormFactor.tablet => 32,
    FormFactor.desktop => 40,
  };

  /// Cap on readable content width. Full-bleed on a phone; centred on a tablet
  /// so lines of text do not run the whole width of the display.
  double get contentMaxWidth => switch (formFactor) {
    FormFactor.phone => double.infinity,
    FormFactor.tablet => 720,
    FormFactor.desktop => 900,
  };

  /// Columns for card grids (courses, certificates).
  int get gridColumns => switch (formFactor) {
    FormFactor.phone => 1,
    FormFactor.tablet => isLandscape ? 3 : 2,
    FormFactor.desktop => 3,
  };

  /// Whether a modal should render as a centred dialog rather than a bottom
  /// sheet. A sheet pinned to the bottom of a tablet is a long reach.
  bool get prefersDialogOverSheet => isTablet;
}

/// Centres and width-caps its child on tablets, and applies the screen gutter.
///
/// Wrap every scrollable screen body in this instead of a bare `Padding`.
class ResponsiveBody extends StatelessWidget {
  const ResponsiveBody({
    super.key,
    required this.child,
    this.applyGutter = true,
    this.maxWidth,
  });

  final Widget child;
  final bool applyGutter;
  final double? maxWidth;

  @override
  Widget build(BuildContext context) {
    final Widget padded = applyGutter
        ? Padding(
            padding: EdgeInsets.symmetric(horizontal: context.gutter),
            child: child,
          )
        : child;

    final double cap = maxWidth ?? context.contentMaxWidth;
    if (cap == double.infinity) return padded;

    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: cap),
        child: padded,
      ),
    );
  }
}

/// Clamps the OS text scale so a 2.0x setting cannot shred the layout, while
/// still honouring the 1.3x the specs require.
class ClampedTextScale extends StatelessWidget {
  const ClampedTextScale({super.key, required this.child, this.max = 1.4});

  final Widget child;
  final double max;

  @override
  Widget build(BuildContext context) {
    final MediaQueryData mq = MediaQuery.of(context);
    return MediaQuery(
      data: mq.copyWith(textScaler: mq.textScaler.clamp(maxScaleFactor: max)),
      child: child,
    );
  }
}
