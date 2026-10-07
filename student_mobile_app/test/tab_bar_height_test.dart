// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The tab bar measures itself.
//
// It used to be a `SizedBox(height: 46)` — the design's measurement of an icon
// over its label at 1.0x text scale, which stopped being true the moment the
// OS setting moved. The bar now takes its height from that column, so a
// learner running large text gets a taller bar rather than a clipped one.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  /// The height of the whole bar at a given text scale.
  Future<double> barHeight(WidgetTester tester, double textScale) async {
    tester.view.physicalSize = const Size(420, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    late StatefulNavigationShell shell;
    await tester.pumpWidget(
      MaterialApp.router(
        theme: AppTheme.light(),
        locale: const Locale('en'),
        supportedLocales: const <Locale>[Locale('en')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        builder: (BuildContext context, Widget? child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: child ?? const SizedBox.shrink(),
        ),
        routerConfig: GoRouter(
          initialLocation: '/a',
          routes: <RouteBase>[
            StatefulShellRoute.indexedStack(
              builder:
                  (
                    BuildContext c,
                    GoRouterState s,
                    StatefulNavigationShell navShell,
                  ) {
                    shell = navShell;
                    return MainShell(shell: shell);
                  },
              branches: <StatefulShellBranch>[
                StatefulShellBranch(
                  routes: <RouteBase>[
                    GoRoute(
                      path: '/a',
                      builder: (_, _) => const SizedBox.shrink(),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));

    // The column inside one tab button: an icon over its label, which is what
    // the bar now takes its height from.
    return tester
        .getSize(
          find
              .ancestor(of: find.text('Home'), matching: find.byType(Column))
              .first,
        )
        .height;
  }

  testWidgets('grows with the text scale instead of clipping', (
    WidgetTester tester,
  ) async {
    final double normal = await barHeight(tester, 1.0);
    final double large = await barHeight(tester, 1.4);

    expect(
      large,
      greaterThan(normal),
      reason: 'a fixed 46px row cannot hold a label at 1.4x',
    );
    expect(
      normal,
      lessThanOrEqualTo(46),
      reason: 'and at 1.0x it is no taller than the design measured',
    );
  });

  testWidgets('nothing in the bar overflows at 1.4x', (
    WidgetTester tester,
  ) async {
    // `ClampedTextScale` caps the OS setting there, so this is the worst case
    // the bar has to survive (rule 11).
    await barHeight(tester, 1.4);
    expect(tester.takeException(), isNull);
  });
}
