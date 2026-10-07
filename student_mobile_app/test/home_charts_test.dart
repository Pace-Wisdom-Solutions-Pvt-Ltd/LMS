// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The two Home charts.
//
// Both are CustomPainters fed straight from the payload, so the cases that
// matter are the degenerate ones: nothing completed, everything completed, and
// a learner with no courses at all — the last of which would divide by zero if
// the donut trusted its totals.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  Future<void> pump(WidgetTester tester, Widget child) => tester.pumpWidget(
    MediaQuery(
      // Skip the draw-in so the final frame is the first frame.
      data: const MediaQueryData(disableAnimations: true),
      child: MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(body: Center(child: child)),
      ),
    ),
  );

  group('GaugeArc', () {
    for (final double value in <double>[0, 0.64, 1]) {
      testWidgets('renders at $value', (WidgetTester tester) async {
        await pump(tester, GaugeArc(value: value, center: const Text('64%')));
        expect(tester.takeException(), isNull);
        expect(find.text('64%'), findsOneWidget);
      });
    }

    testWidgets('clamps a value outside 0..1', (WidgetTester tester) async {
      await pump(tester, const GaugeArc(value: 7));
      expect(tester.takeException(), isNull);
    });
  });

  group('CourseStatusColors', () {
    // Perceived brightness. Two status colours that land on the same hue *and*
    // the same weight are the failure this guards against.
    double luminance(Color c) => c.computeLuminance();

    Future<List<Color>> read(WidgetTester tester, ThemeData theme) async {
      late List<Color> colors;
      await tester.pumpWidget(
        MaterialApp(
          theme: theme,
          home: Builder(
            builder: (BuildContext context) {
              colors = <Color>[
                CourseStatusColors.completed(context),
                CourseStatusColors.inProgress(context),
                CourseStatusColors.notStarted(context),
              ];
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      return colors;
    }

    testWidgets('stay distinct under the app default brand', (
      WidgetTester tester,
    ) async {
      final List<Color> c = await read(tester, AppTheme.light());
      expect(c.toSet(), hasLength(3));
    });

    testWidgets('stay distinct when an org sets only a primary colour', (
      WidgetTester tester,
    ) async {
      // The case that broke the donut: `ring1` is
      // `[primary, lerp(primary, accent, 0.45)]`, and with no accent the
      // accent *is* the primary — so both ends were the identical colour.
      final AppBrand brand = AppBrand.fromOrg('#0F766E', null);
      expect(
        brand.ring1().first,
        brand.ring1().last,
        reason: 'the old source of these colours collapses to one value here',
      );

      final List<Color> c = await read(tester, AppTheme.light(brand));
      expect(c.toSet(), hasLength(3));
    });

    testWidgets('a blue brand does not colour the donut', (
      WidgetTester tester,
    ) async {
      // The whole point of not deriving these from the brand: an org that
      // brands the app blue must not end up with a blue status scale.
      final List<Color> plain = await read(tester, AppTheme.light());
      final List<Color> blue = await read(
        tester,
        AppTheme.light(AppBrand.fromOrg('#1D4ED8', '#3B82F6')),
      );
      expect(blue, plain);
    });

    testWidgets('in-progress reads between completed and not-started', (
      WidgetTester tester,
    ) async {
      for (final ThemeData theme in <ThemeData>[
        AppTheme.light(),
        AppTheme.dark(),
      ]) {
        final List<Color> c = await read(tester, theme);
        expect(c.toSet(), hasLength(3));

        // The tightest pair is in-progress against the track: a single tint
        // factor across both modes would collapse it in dark mode.
        expect(
          (luminance(c[0]) - luminance(c[1])).abs(),
          greaterThan(0.1),
          reason:
              'completed vs in-progress must differ in weight, not only hue',
        );
        expect(
          (luminance(c[1]) - luminance(c[2])).abs(),
          greaterThan(0.05),
          reason: 'in-progress must not sink into the not-started track',
        );
      }
    });
  });

  group('StatusDonut', () {
    List<DonutSlice> slices(int done, int doing, int todo) => <DonutSlice>[
      DonutSlice(
        label: 'Completed',
        count: done,
        color: const Color(0xFF74C05F),
      ),
      DonutSlice(
        label: 'In progress',
        count: doing,
        color: const Color(0xFF35BAD3),
      ),
      DonutSlice(
        label: 'Not started',
        count: todo,
        color: const Color(0xFFE3EAF3),
      ),
    ];

    testWidgets('draws a mixed set', (WidgetTester tester) async {
      await pump(tester, StatusDonut(slices: slices(2, 1, 1)));
      expect(tester.takeException(), isNull);
    });

    testWidgets('an all-zero set does not divide by zero', (
      WidgetTester tester,
    ) async {
      await pump(tester, StatusDonut(slices: slices(0, 0, 0)));
      expect(tester.takeException(), isNull);
    });

    testWidgets('a single full slice draws a whole ring', (
      WidgetTester tester,
    ) async {
      await pump(tester, StatusDonut(slices: slices(3, 0, 0)));
      expect(tester.takeException(), isNull);
    });

    testWidgets('keeps its centre label', (WidgetTester tester) async {
      await pump(
        tester,
        StatusDonut(slices: slices(2, 1, 1), center: const Text('4')),
      );
      expect(find.text('4'), findsOneWidget);
    });
  });
}
