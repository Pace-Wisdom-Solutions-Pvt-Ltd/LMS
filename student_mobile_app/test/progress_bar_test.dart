// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The course/lesson progress bar.
//
// It regressed once into a plain grey track at every percentage: the gradient
// fill is a childless `DecoratedBox`, and inside a loosely-constrained Stack a
// childless box takes the *smallest* size it is allowed. Without an explicit
// `heightFactor: 1` that is zero height, so the fill painted nothing and only
// the track showed. These tests measure the fill rather than trusting it.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  const double width = 200;
  const double height = 8;

  /// The gradient fill — the only `DecoratedBox` under the fraction box.
  /// `Container(color:)` builds a `ColoredBox`, so the track is not a match.
  final Finder fill = find.descendant(
    of: find.byType(FractionallySizedBox),
    matching: find.byType(DecoratedBox),
  );

  Future<void> pumpBar(WidgetTester tester, double value) async {
    await tester.pumpWidget(
      MediaQuery(
        // Skip the count-up so the bar is at its final width immediately.
        data: const MediaQueryData(disableAnimations: true),
        child: MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: width,
                child: ProgressBar(value: value),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('the fill fills the track height, not zero', (
    WidgetTester tester,
  ) async {
    await pumpBar(tester, 0.5);

    final Size size = tester.getSize(fill);
    expect(
      size.height,
      height,
      reason: 'a zero-height fill is invisible and the bar reads as grey',
    );
    expect(size.width, closeTo(width / 2, 0.5));
  });

  testWidgets('the fill spans the track at 100%', (WidgetTester tester) async {
    await pumpBar(tester, 1);
    expect(tester.getSize(fill), const Size(width, height));
  });

  testWidgets('an empty bar paints no fill width', (WidgetTester tester) async {
    await pumpBar(tester, 0);
    expect(tester.getSize(fill).width, 0);
  });

  testWidgets('a value beyond 1 is clamped, not overflowed', (
    WidgetTester tester,
  ) async {
    await pumpBar(tester, 4.2);
    expect(tester.getSize(fill).width, width);
  });
}
