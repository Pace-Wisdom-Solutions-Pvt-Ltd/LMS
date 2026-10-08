// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// No white flash between screens on a dark theme.
//
// A page transition fades the outgoing and incoming routes at the same time,
// so for those frames neither is opaque. `MaterialApp` paints no background of
// its own, so what showed through was the platform's window background —
// white — on every push and pop. `SharedAxisTransition` fills only the
// *outgoing* route, and even that used `canvasColor`, which Material 3 derives
// from `colorScheme.surface`: the card colour, not the page's.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  /// Everything the transition can paint has to be dark, not merely "the
  /// theme is dark".
  test('nothing the dark theme hands a transition is light', () {
    final ThemeData dark = AppTheme.dark();

    for (final (String name, Color color) in <(String, Color)>[
      ('scaffoldBackgroundColor', dark.scaffoldBackgroundColor),
      ('canvasColor', dark.canvasColor),
      ('colorScheme.surface', dark.colorScheme.surface),
    ]) {
      expect(
        color.computeLuminance(),
        lessThan(0.2),
        reason: '$name is what a half-faded frame exposes',
      );
    }
  });

  test('the shared-axis fill is the page background, not the card', () {
    for (final ThemeData theme in <ThemeData>[
      AppTheme.dark(),
      AppTheme.light(),
    ]) {
      final PageTransitionsBuilder? builder =
          theme.pageTransitionsTheme.builders[TargetPlatform.iOS];

      expect(builder, isA<SharedAxisPageTransitionsBuilder>());
      expect(
        (builder! as SharedAxisPageTransitionsBuilder).fillColor,
        theme.scaffoldBackgroundColor,
        reason: 'left null it falls back to canvasColor, a shade off the page',
      );
    }
  });
}
