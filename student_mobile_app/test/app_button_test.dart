// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The button is as tall as its label needs.
//
// It used to be a fixed 54 with `maxLines: 1` and an ellipsis, so a long label
// — or any label at a large text scale — was cut off mid-word in a box that
// could not grow. A button says what it does; half of that with a "…" is
// worse than a taller button.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  Future<double> heightOf(
    WidgetTester tester,
    String label, {
    double width = 320,
  }) async {
    tester.view.physicalSize = const Size(420, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: width,
              child: AppButton(label: label, onPressed: () {}),
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    return tester.getSize(find.byType(AppButton)).height;
  }

  testWidgets('a short label keeps the design height', (
    WidgetTester tester,
  ) async {
    expect(await heightOf(tester, 'Submit'), 54);
  });

  testWidgets('a long label wraps instead of being cut off', (
    WidgetTester tester,
  ) async {
    const String long = 'Claim your certificate of completion for this course';

    final double tall = await heightOf(tester, long, width: 200);
    expect(tall, greaterThan(54), reason: 'the box grew to hold the label');

    final Text text = tester.widget<Text>(find.text(long));
    expect(text.maxLines, isNull);
    expect(text.overflow, isNot(TextOverflow.ellipsis));
    expect(tester.takeException(), isNull, reason: 'and nothing overflowed');
  });

  testWidgets('it does not swallow the height it is offered', (
    WidgetTester tester,
  ) async {
    // `Container.alignment` with no fixed height takes every pixel it is
    // given, which in a `bottomNavigationBar` is the whole screen — a screen
    // body was squeezed to nothing by exactly that.
    tester.view.physicalSize = const Size(420, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: const Center(child: Text('body')),
          bottomNavigationBar: AppButton(label: 'Submit', onPressed: () {}),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    expect(tester.getSize(find.byType(AppButton)).height, 54);
    expect(find.text('body'), findsOneWidget);
  });
}
