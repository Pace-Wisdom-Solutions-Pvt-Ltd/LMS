// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Signing in on an account with several organizations.
//
// `startSession` notifies before the organization is picked, and the session
// is the router's `refreshListenable` — so the guard runs at that moment, with
// the learner logged in and still standing on the sign-in screen.
//
// Sending them to Home there pulled the sign-in route out from under the
// picker `SignInScreen` was about to show over it. The sheet returned `null`,
// which that code reads as "cancelled", and it answers a cancelled pick by
// signing the learner out — so Home appeared for a frame and sign-in came
// straight back. Accounts with a single organization never hit it:
// `startSession` chooses that one itself, so nothing is owed.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  late Directory tempDir;

  LoginSuccess loginWith(int count) => LoginSuccess(
    user: const AppUser(id: 'u1', email: 'sara@acme.edu'),
    accessToken: 'a',
    refreshToken: 'r',
    organizations: <OrgMembership>[
      for (int i = 1; i <= count; i++)
        OrgMembership(orgId: i, orgName: 'Org $i', role: 'student'),
    ],
  );

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_signin_redirect_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    await appSession.clearSession();
    await HiveStorage.clearAllBoxes();
    AuthTokenStore.load();
  });

  test(
    'several organizations: the learner is left on sign-in to pick',
    () async {
      await appSession.startSession(loginWith(3));

      expect(appSession.isLoggedIn, isTrue);
      expect(appSession.needsOrgChoice, isTrue);

      expect(
        AppRoutes.redirectFor(appSession, AppRoutePaths.signIn),
        isNull,
        reason: 'no redirect — the picker is about to open over this route',
      );
    },
  );

  test('once the organization is chosen, sign-in gives way to Home', () async {
    await appSession.startSession(loginWith(3));
    await appSession.selectOrg(2);

    expect(appSession.needsOrgChoice, isFalse);

    expect(
      AppRoutes.redirectFor(appSession, AppRoutePaths.signIn),
      AppRoutePaths.home,
    );
  });

  test('one organization: straight through, nothing is owed', () async {
    await appSession.startSession(loginWith(1));

    expect(
      appSession.needsOrgChoice,
      isFalse,
      reason: 'startSession scopes to the only membership itself',
    );

    expect(
      AppRoutes.redirectFor(appSession, AppRoutePaths.signIn),
      AppRoutePaths.home,
    );
  });

  test('signed out, a protected route still sends you to sign-in', () {
    expect(
      AppRoutes.redirectFor(appSession, AppRoutePaths.home),
      AppRoutePaths.signIn,
    );
  });

  test('the splash is always left to decide for itself', () async {
    await appSession.startSession(loginWith(3));

    expect(
      AppRoutes.redirectFor(appSession, AppRoutePaths.splash),
      isNull,
      reason: 'it shows the picker itself when a choice is owed',
    );
  });
}
