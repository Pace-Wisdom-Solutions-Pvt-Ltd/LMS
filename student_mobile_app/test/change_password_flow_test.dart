// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// What a change of password tells the learner, and where it leaves them.
//
// Two rules, both the sign-in screen's: **the server's message is shown
// verbatim in a snackbar**, and there is nothing to tap through on success —
// signing in again is the acknowledgement.
//
// The success path is the one worth a widget test rather than a view model one.
// A change of password ends the session, which changes `sessionKey` and so
// rebuilds the keyed subtree the MaterialApp — and therefore the
// ScaffoldMessenger — lives in. A notice raised before that is discarded with
// the old messenger, and the form's own context is dead by then. Only a pumped
// tree catches either mistake; both were made here first.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/config/l10n/app_localizations/app_localizations_en.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  final AppLocalizations l10n = AppLocalizationsEn();
  const int orgId = 2;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    // Polls on a real timer that would outlive the tree.
    InternetProvider.pollingEnabled = false;

    tempDir = await Directory.systemTemp.createTemp('lms_change_pw_');
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
    await appSession.clearSession();
    await appBranding.reset();
    appRouter.go(AppRoutePaths.splash);
  });

  /// One bounded step of real time plus a frame — never `pumpAndSettle`, which
  /// the splash timer and the shimmer would hold open for their full timeout.
  Future<void> settle(WidgetTester tester) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    await tester.pump(const Duration(milliseconds: 400));
  }

  /// Boots the real app signed in and settles on the change-password screen.
  Future<void> bootOnChangePassword(WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.runAsync(() async {
      await appSession.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: orgId, orgName: 'Demo', role: 'student'),
          ],
        ),
      );

      await tester.pumpWidget(const MyApp());
      // Real time, not pumped time: inside `runAsync` the splash's floor timer
      // is a real one, and pumping a duration does not move it.
      await Future<void>.delayed(AppMotion.splashFloor * 1.5);
      await settle(tester);
      await settle(tester);

      appRouter.goNamed(AppRouteNames.changePassword);
      await settle(tester);
      await settle(tester);
    });
  }

  /// Fills the three fields and taps the button, not the app bar title of the
  /// same name.
  Future<void> submitForm(WidgetTester tester) async {
    await tester.runAsync(() async {
      final Finder fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'old-password');
      await tester.enterText(fields.at(1), 'new-password');
      await tester.enterText(fields.at(2), 'new-password');
      await settle(tester);

      await tester.tap(find.widgetWithText(AppButton, l10n.changePassword));
      await settle(tester);
      await settle(tester);
    });
  }

  testWidgets('a rejection is the server\'s own sentence, and stays put', (
    WidgetTester tester,
  ) async {
    api.on(
      ApiEndPoints.changePassword,
      status: 400,
      body: <String, dynamic>{'detail': 'Current password is incorrect.'},
    );

    await bootOnChangePassword(tester);
    expect(find.byType(TextField), findsNWidgets(3));

    await submitForm(tester);

    expect(find.text('Current password is incorrect.'), findsOneWidget);
    expect(
      appRouter.state.matchedLocation,
      AppRoutePaths.changePassword,
      reason: 'a rejected change leaves the learner on the form',
    );
    expect(appSession.isLoggedIn, isTrue);
  });

  testWidgets('a success lands on sign-in with the snackbar still up', (
    WidgetTester tester,
  ) async {
    api.on(
      ApiEndPoints.changePassword,
      status: 200,
      body: <String, dynamic>{'detail': 'Password updated.'},
    );

    await bootOnChangePassword(tester);
    await submitForm(tester);

    expect(
      find.text(l10n.passwordChangedDone),
      findsOneWidget,
      reason:
          'raised on the tree the sign-out rebuilt, not the one it threw '
          'away with the messenger that was showing it',
    );
    expect(appRouter.state.matchedLocation, AppRoutePaths.signIn);
    expect(appSession.isLoggedIn, isFalse);
    expect(
      find.byType(BottomSheet),
      findsNothing,
      reason: 'signing in again is the acknowledgement',
    );
  });
}
