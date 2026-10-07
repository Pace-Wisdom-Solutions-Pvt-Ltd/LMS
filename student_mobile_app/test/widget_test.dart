// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Smoke tests for the app shell.
//
// These boot the real widget tree — provider tiers, theming from the resolved
// brand, ResponsiveSizer, the router — so a wiring mistake in any of them fails
// here rather than on device.
//
// Three things to know before adding tests here:
//
//  * Never use `pumpAndSettle`. The splash holds for `AppMotion.splashFloor`
//    on a timer, and several screens carry shimmer or looping motion, so
//    pumpAndSettle can block until its 10-minute timeout. Pump bounded
//    durations instead.
//  * Session changes hit Hive and the keychain — real I/O that cannot complete
//    inside the fake-async zone a widget test runs in. Drive them through
//    `tester.runAsync`.
//  * The splash holds the first frame for `AppMotion.splashFloor` by design, so
//    a test that wants the next screen must pump past it: use bootPastSplash.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

/// Comfortably past the splash floor.
const Duration _pastSplash = Duration(seconds: 5);

/// Pumps through the splash and the route transition that follows it.
///
/// Four pumps, not one: the first runs the post-frame callback, the second
/// fires the floor timer, the third lets the resulting navigation build, and
/// the fourth finishes the page transition.
Future<void> bootPastSplash(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(_pastSplash);
  await tester.pump();
  await tester.pump(AppMotion.push);
}

void main() {
  late Directory tempDir;

  /// A signed-in splash refreshes branding, and an unanswered request leaves a
  /// pending Dio timeout timer that fails the test. Everything here goes
  /// through the fake adapter so nothing reaches the network.
  final FakeApi api = FakeApi();

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    // The reachability checker polls on a real timer that outlives the tree.
    InternetProvider.pollingEnabled = false;

    tempDir = await Directory.systemTemp.createTemp('lms_widget_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
    api.install();
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    api.reset();
    // appSession, appBranding and appRouter are top-level singletons shared
    // across tests, so each test resets them or inherits the previous one.
    await appSession.clearSession();
    await appBranding.reset();
    appRouter.go(AppRoutePaths.splash);
  });

  testWidgets('boots to the splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.byType(SplashScreen), findsOneWidget);
    expect(
      find.byType(AppIcon),
      findsWidgets,
      reason: 'the splash shows the app mark before any org is known',
    );
    expect(
      find.byType(BrandMark),
      findsNothing,
      reason: 'there is no tenant to represent yet',
    );
  });

  testWidgets('the splash wears the org mark once one is picked', (
    WidgetTester tester,
  ) async {
    // Branding is hydrated from Hive before `runApp`, so a returning learner
    // gets their organization on the very first frame rather than watching the
    // app mark swap out a moment later.
    //
    // All of it runs in `runAsync`: a signed-in splash refreshes branding, and
    // Dio arms its timeout timers whatever the adapter is — neither those nor
    // the Hive writes make progress inside the fake-async zone.
    await tester.runAsync(() async {
      await AuthTokenStore.saveTokens(access: 'a', refresh: 'r');
      await appSession.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: 2, orgName: 'Demo Academy', role: 'student'),
          ],
        ),
      );
      await HiveStorage.store(HSKeys.brandOrgName, 'Demo Academy');
      appBranding.hydrateFromCache();

      api.on(
        ApiEndPoints.organization(2),
        status: 200,
        body: <String, dynamic>{'id': 2, 'name': 'Demo Academy'},
      );

      await tester.pumpWidget(const MyApp());
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 120));

      expect(find.byType(SplashScreen), findsOneWidget);
      expect(find.byType(BrandMark), findsOneWidget);
    });
  });

  testWidgets('a signed-out learner lands on sign in', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp());
    await bootPastSplash(tester);

    expect(find.byType(SignInScreen), findsOneWidget);
    expect(find.byType(MainShell), findsNothing);
  });

  testWidgets('sign-in validates live, but only once a field is touched', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp());
    await bootPastSplash(tester);

    final Finder email = find.byType(TextField).first;

    // Typing badly is not yet an error — the learner is still mid-word.
    await tester.enterText(email, 'not-an-email');
    await tester.pump();
    expect(find.text('Enter a valid email address.'), findsNothing);

    // Losing focus is the first fair moment to complain.
    FocusScope.of(tester.element(email)).unfocus();
    await tester.pump();
    await tester.pump(AppMotion.fadeIn);
    expect(find.text('Enter a valid email address.'), findsOneWidget);

    // Once touched it re-validates on every keystroke, so the error clears the
    // moment the input becomes valid.
    await tester.enterText(email, 'learner@example.com');
    await tester.pump();
    await tester.pump(AppMotion.fadeIn);
    expect(find.text('Enter a valid email address.'), findsNothing);
  });

  testWidgets('sign-in stays disabled until both fields are filled', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp());
    await bootPastSplash(tester);

    // The provider is created inside SignInScreen.build, so its own element is
    // above it — read from a descendant instead.
    SignInViewModel vm() => Provider.of<SignInViewModel>(
      tester.element(find.byType(AppTextField).first),
      listen: false,
    );

    expect(vm().canSubmit, isFalse);

    await tester.enterText(find.byType(TextField).first, 'learner@example.com');
    await tester.pump();
    expect(vm().canSubmit, isFalse, reason: 'password is still empty');

    await tester.enterText(find.byType(TextField).last, 'secret');
    await tester.pump();
    expect(vm().canSubmit, isTrue);
  });

  testWidgets('the auth guard keeps a signed-out learner out of the tabs', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp());
    await bootPastSplash(tester);

    appRouter.go(AppRoutePaths.home);
    await bootPastSplash(tester);

    expect(
      find.byType(SignInScreen),
      findsOneWidget,
      reason: 'the guard must bounce an unauthenticated /app location',
    );
  });

  testWidgets('the app themes itself from the resolved org brand', (
    WidgetTester tester,
  ) async {
    await tester.runAsync(() async {
      await HiveStorage.store(HSKeys.brandPrimary, '#0F766E');
      await HiveStorage.store(HSKeys.brandOrgName, 'Demo Academy');
      appBranding.hydrateFromCache();
    });

    await tester.pumpWidget(const MyApp());
    await tester.pump();

    final BuildContext context = tester.element(find.byType(SplashScreen));
    expect(Theme.of(context).colorScheme.primary, const Color(0xFF0F766E));
    expect(
      find.text('Demo Academy'),
      findsOneWidget,
      reason: 'the splash wordmark is the org name once one is known',
    );
  });

  testWidgets('AppTopBar shows a back button only when there is a way back', (
    WidgetTester tester,
  ) async {
    // The rule `AppTopBar` applies everywhere: a tab root has nothing to pop,
    // anything pushed over it does. Pumped on a bare Navigator rather than
    // through the app router, because the rule is the widget's, not
    // go_router's.
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        locale: const Locale('en'),
        supportedLocales: const <Locale>[Locale('en')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Builder(
          builder: (BuildContext context) => Scaffold(
            appBar: const AppTopBar(),
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const Scaffold(appBar: AppTopBar()),
                ),
              ),
              child: const Text('push'),
            ),
          ),
        ),
      ),
    );

    expect(
      find.byType(AppBackButton),
      findsNothing,
      reason: 'the first route has nothing to go back to',
    );

    await tester.tap(find.text('push'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byType(AppBackButton), findsOneWidget);
  });

  testWidgets('a tablet gets a navigation rail instead of a bottom bar', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.runAsync(() async {
      await AuthTokenStore.saveTokens(access: 'a', refresh: 'r');
      await appSession.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com', firstName: 'Diya'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: 2, orgName: 'Demo Academy', role: 'student'),
          ],
        ),
      );
    });

    await tester.pumpWidget(const MyApp());
    await tester.pump();
    appRouter.go(AppRoutePaths.home);
    await bootPastSplash(tester);

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });

  test('BaseProvider suppresses notifyListeners after dispose', () {
    final _Probe probe = _Probe();
    int notifications = 0;
    probe.addListener(() => notifications++);

    probe.setState(ViewState.busy);
    expect(notifications, 1);

    probe.dispose();
    probe.setState(ViewState.success); // must not throw
    expect(notifications, 1);
  });
}

class _Probe extends BaseProvider {}
