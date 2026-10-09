// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The app-wide footer.
//
// Mounted in `MaterialApp.builder`, so it is on every route without a screen
// opting in. What is pinned here is the part that is not a theme decision: the
// colours are fixed in both themes, and the "No internet" bar is *overlaid* on
// the footer rather than stacked beneath it — in a Column it took layout
// height, so a connection dropping shoved the footer and the whole route
// above it up and down.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

/// Offline, without the real checker's periodic timer.
class _Offline extends InternetProvider {
  @override
  bool get hasInternet => false;
}

void main() {
  setUpAll(() {
    // The real checker reschedules on a timer that outlives the tree and
    // trips `pumpWidget`'s pending-timer check.
    InternetProvider.pollingEnabled = false;
  });

  tearDownAll(() => InternetProvider.pollingEnabled = true);

  /// Pumps the footer in the arrangement `MaterialApp.builder` gives it: not
  /// inside a route's Scaffold, with the red bar overlaid at the bottom.
  Future<AppLocalizations> pumpFooter(
    WidgetTester tester, {
    required ThemeData theme,
    bool online = true,
    EdgeInsets inset = EdgeInsets.zero,
  }) async {
    final InternetProvider internet = online ? InternetProvider() : _Offline();
    addTearDown(internet.dispose);

    await tester.pumpWidget(
      ChangeNotifierProvider<InternetProvider>.value(
        value: internet,
        child: MaterialApp(
          theme: theme,
          locale: const Locale('en'),
          supportedLocales: const <Locale>[Locale('en')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: Builder(
            builder: (BuildContext context) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(viewPadding: inset, padding: inset),
              child: const Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  Column(
                    children: <Widget>[
                      Expanded(child: SizedBox.shrink()),
                      AppFooter(),
                    ],
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: NoInternetBar(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    return AppLocalizations.delegate.load(const Locale('en'));
  }

  /// The footer's own painted surface.
  Material surfaceOf(WidgetTester tester) => tester.widget<Material>(
    find.descendant(
      of: find.byType(AppFooter),
      matching: find.byType(Material),
    ),
  );

  Text labelOf(WidgetTester tester) => tester.widget<Text>(
    find.descendant(of: find.byType(AppFooter), matching: find.byType(Text)),
  );

  testWidgets('it names the publisher', (WidgetTester tester) async {
    await pumpFooter(tester, theme: AppTheme.light());

    // Against the constant, not a copy of it: the notice lives in exactly one
    // place, and a test holding its own copy would be the second.
    expect(find.text(AppEnv.companyCopyright), findsOneWidget);
  });

  testWidgets('white on black, whichever theme is on', (
    WidgetTester tester,
  ) async {
    // The point of pinning them: a publisher's mark is not part of the app's
    // surface, so it must follow neither the brand nor the theme.
    for (final ThemeData theme in <ThemeData>[
      AppTheme.light(),
      AppTheme.dark(),
    ]) {
      await pumpFooter(tester, theme: theme);

      expect(surfaceOf(tester).color, Colors.black);
      expect(labelOf(tester).style?.color, Colors.white);
    }
  });

  testWidgets('it is a link, for anyone who cannot see that', (
    WidgetTester tester,
  ) async {
    await pumpFooter(tester, theme: AppTheme.light());

    expect(
      find.descendant(
        of: find.byType(AppFooter),
        matching: find.byWidgetPredicate(
          (Widget w) => w is Semantics && w.properties.link == true,
        ),
      ),
      findsOneWidget,
    );
    expect(AppEnv.companyWebsite, 'https://pacewisdom.com/');
  });

  group('the bar is overlaid, not stacked beneath', () {
    const EdgeInsets inset = EdgeInsets.only(bottom: 34);

    testWidgets('the footer pays the home indicator inset, online or not', (
      WidgetTester tester,
    ) async {
      // It is the last thing in the column either way now, so it owes the
      // inset either way. Nothing else below it can pay it.
      for (final bool online in <bool>[true, false]) {
        await pumpFooter(tester, theme: AppTheme.light(), online: online);
        final double bare = tester.getSize(find.byType(AppFooter)).height;

        await pumpFooter(
          tester,
          theme: AppTheme.light(),
          online: online,
          inset: inset,
        );

        expect(
          tester.getSize(find.byType(AppFooter)).height,
          bare + 34,
          reason: 'online: $online',
        );
      }
    });

    testWidgets('losing the connection does not move the footer', (
      WidgetTester tester,
    ) async {
      // The whole reason for the Stack. In a Column the bar's height came out
      // of the layout, so the footer — and every pixel of the route above it
      // — jumped up the moment the connection dropped and back down when it
      // returned.
      await pumpFooter(tester, theme: AppTheme.light(), inset: inset);
      final Rect online = tester.getRect(find.byType(AppFooter));

      await pumpFooter(
        tester,
        theme: AppTheme.light(),
        online: false,
        inset: inset,
      );

      expect(tester.getRect(find.byType(AppFooter)), online);
    });

    testWidgets('offline, the bar sits over the footer at the bottom', (
      WidgetTester tester,
    ) async {
      final AppLocalizations l10n = await pumpFooter(
        tester,
        theme: AppTheme.light(),
        online: false,
        inset: inset,
      );

      expect(find.text(l10n.noInternet), findsOneWidget);

      final Rect bar = tester.getRect(find.byType(NoInternetBar));
      final Rect footer = tester.getRect(find.byType(AppFooter));

      expect(bar.bottom, footer.bottom, reason: 'both reach the screen edge');
      expect(
        bar.overlaps(footer),
        isTrue,
        reason: 'it covers the footer rather than displacing it',
      );
    });
  });
}
