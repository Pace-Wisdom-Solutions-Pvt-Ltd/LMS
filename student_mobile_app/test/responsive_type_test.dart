// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The type scale is sized for the device, not fixed at the design's phone
// values — that is what `responsive_sizer` is in this project for.
//
// `.sp` on its own is not usable: it grows with the screen's width *and*
// height, so a 10" tablet comes out at nearly 2x the phone size. `fs()` clamps
// it, and these tests are what keep the clamp honest.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  // Declared first on purpose: the package keeps its device metrics in
  // statics, so once any test below has pumped a `ResponsiveSizer` they stay
  // set for the rest of the file. This is the only place the unset case can
  // be observed.
  test('a theme built outside ResponsiveSizer still has a type scale', () {
    // Every widget test in this repo builds a theme that way, so an unset
    // device metric must not throw — and must not silently produce a
    // zero-sized font either.
    expect(fs(16), 16);
    expect(AppTheme.light().textTheme.bodyMedium!.fontSize, greaterThan(0));
  });

  /// [fs] as measured on a screen of this size, below a real
  /// `ResponsiveSizer` so the package's device metrics are set.
  Future<double> sizeOn(WidgetTester tester, Size screen, double size) async {
    late double value;
    tester.view.physicalSize = screen;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ResponsiveSizer(
        builder: (BuildContext context, Orientation _, ScreenType _) =>
            MaterialApp(
              home: Builder(
                builder: (BuildContext context) {
                  value = fs(size);
                  return const SizedBox.shrink();
                },
              ),
            ),
      ),
    );
    return value;
  }

  testWidgets('a bigger screen reads larger, but never twice as large', (
    WidgetTester tester,
  ) async {
    const double base = 16;

    final double phone = await sizeOn(tester, const Size(390, 844), base);
    final double tablet = await sizeOn(tester, const Size(834, 1194), base);

    expect(tablet, greaterThan(phone), reason: 'the point of scaling at all');
    expect(
      tablet,
      lessThanOrEqualTo(base * 1.25),
      reason: 'raw .sp lands near 2x here, which wraps every heading',
    );
    expect(phone, greaterThanOrEqualTo(base * 0.95));
  });

  testWidgets('a small phone shrinks a little, not a lot', (
    WidgetTester tester,
  ) async {
    const double base = 16;
    final double small = await sizeOn(tester, const Size(320, 568), base);

    expect(small, greaterThanOrEqualTo(base * 0.95));
    expect(small, lessThanOrEqualTo(base * 1.25));
  });
}
