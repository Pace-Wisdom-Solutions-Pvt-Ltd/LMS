// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The learner's own record, fetched in one place.
//
// `GET /api/users/{id}/` was never called: every screen read the copy that
// arrived with the login response, so a name or a picture changed anywhere
// else never reached this app until the learner signed out and in again.
//
// `ProfileViewModel` now fetches it, cache first and network always, and
// writes the result into `SessionProvider` — the one holder the rest of the
// app already watches.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const String userId = 'b1f3f937-9999-4430-8ee7-6c7208897165';
  const int orgId = 2;

  Map<String, dynamic> profileBody({
    String firstName = 'Diya',
    String lastName = 'Rao',
  }) => <String, dynamic>{
    'id': userId,
    'email': 'student2@lms.local',
    'first_name': firstName,
    'last_name': lastName,
    'phone_number': '',
    'profile_picture': null,
    'is_active': true,
    'status': 'active',
    'roles': <String>['student'],
    'organizations': <dynamic>[
      <String, dynamic>{'org_id': 2, 'name': 'Demo', 'role': 'student'},
    ],
  };

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_profile_fetch_');
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
    await HiveStorage.clearAllBoxes();
    AuthTokenStore.load();
  });

  /// A signed-in session holding the record login handed it.
  Future<SessionProvider> signedIn({String firstName = 'Old'}) async {
    final SessionProvider session = SessionProvider();
    await session.startSession(
      LoginSuccess(
        user: AppUser(
          id: userId,
          email: 'student2@lms.local',
          firstName: firstName,
        ),
        accessToken: 'a',
        refreshToken: 'r',
        organizations: const <OrgMembership>[
          OrgMembership(orgId: 2, orgName: 'Demo', role: 'student'),
        ],
      ),
    );
    return session;
  }

  test(
    'a cached record is still refreshed, and the new one is persisted',
    () async {
      final SessionProvider session = await signedIn();
      api.on(ApiEndPoints.user(userId), status: 200, body: profileBody());

      final ProfileViewModel vm = ProfileViewModel(session: session);
      await vm.load();

      expect(
        api.hit(ApiEndPoints.user(userId)),
        isTrue,
        reason: 'the cached copy is from login, however old — always refetch',
      );
      expect(session.user?.firstName, 'Diya');
      expect(
        AuthTokenStore.user?['first_name'],
        'Diya',
        reason: 'and it is written through to Hive, not just held in memory',
      );
      expect(session.user?.roles, <String>['student']);
    },
  );

  test('with a record cached there is no loading state to show', () async {
    final SessionProvider session = await signedIn();
    api.on(
      ApiEndPoints.user(userId),
      status: 200,
      body: profileBody(),
      delay: const Duration(milliseconds: 120),
    );

    final ProfileViewModel vm = ProfileViewModel(session: session);
    final Future<void> pending = vm.load();

    expect(
      vm.isLoadingFromEmpty,
      isFalse,
      reason: 'a stale record on screen beats a shimmer over nothing',
    );
    await pending;
  });

  test(
    'with nothing cached there is no id, so nothing can be fetched',
    () async {
      // The cached record is the **only** thing that holds the learner's id —
      // `AuthTokenStore.userId` reads it and nothing else. So the case the
      // skeleton was written for (cache gone, tokens fine) cannot resolve: the
      // view model has nothing to ask `GET /api/users/{id}/` with, and says so
      // instead of spinning.
      final SessionProvider session = await signedIn();
      await session.setUser(
        const AppUser(id: userId, email: 'student2@lms.local'),
      );
      await HiveStorage.remove(HSKeys.user);
      AuthTokenStore.load();

      final SessionProvider cold = SessionProvider();
      await cold.hydrate();
      expect(cold.user, isNull, reason: 'nothing to draw');
      expect(AuthTokenStore.userId, isNull, reason: 'and nothing to ask with');

      api.on(ApiEndPoints.user(userId), status: 200, body: profileBody());

      final ProfileViewModel vm = ProfileViewModel(session: cold);
      await vm.load();

      expect(api.hit(ApiEndPoints.user(userId)), isFalse);
      expect(vm.state, ViewState.error);
    },
  );

  testWidgets('a failed fetch still leaves the account settings reachable', (
    WidgetTester tester,
  ) async {
    // The theme, the password and Sign out belong to the account, not to the
    // record. Replacing the whole screen with an error card stranded a
    // learner who could not even sign out of it.
    tester.view.physicalSize = const Size(420, 2200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.runAsync(() async {
      final SessionProvider session = await signedIn();
      await session.setUser(
        const AppUser(id: userId, email: 'student2@lms.local'),
      );
      await HiveStorage.remove(HSKeys.user);
      AuthTokenStore.load();

      final SessionProvider cold = SessionProvider();
      await cold.hydrate();

      await tester.pumpWidget(
        MultiProvider(
          providers: <SingleChildWidget>[
            ChangeNotifierProvider<SessionProvider>.value(value: cold),
            ChangeNotifierProvider<BrandingProvider>(
              create: (_) => BrandingProvider(),
            ),
            ChangeNotifierProvider<ProfileViewModel>(
              create: (_) => ProfileViewModel(session: cold),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('en'),
            supportedLocales: const <Locale>[Locale('en')],
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const ProfileScreen(),
          ),
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 400));
    });

    expect(find.text('Could not load your profile.'), findsOneWidget);
    expect(find.text('Sign out'), findsWidgets);
    expect(find.text('Change password'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });

  test('signing out raises its flag for the whole round trip', () async {
    // The screen only renders `isSigningOut`; the work and the state both
    // belong to the view model, so this is where the two can be checked
    // against each other.
    final SessionProvider session = await signedIn();
    api.on(
      ApiEndPoints.logout,
      status: 200,
      body: <String, dynamic>{},
      delay: const Duration(milliseconds: 120),
    );

    final ProfileViewModel vm = ProfileViewModel(session: session);
    addTearDown(vm.dispose);

    expect(vm.isSigningOut, isFalse);
    final Future<void> pending = vm.signOut();
    expect(vm.isSigningOut, isTrue, reason: 'set before the first await');

    await pending;
    expect(vm.isSigningOut, isFalse, reason: 'and released in a finally');
    expect(session.isLoggedIn, isFalse);
  });

  test('a second sign-out while one is running is ignored', () async {
    final SessionProvider session = await signedIn();
    api.on(
      ApiEndPoints.logout,
      status: 200,
      body: <String, dynamic>{},
      delay: const Duration(milliseconds: 120),
    );

    final ProfileViewModel vm = ProfileViewModel(session: session);
    addTearDown(vm.dispose);

    final Future<void> first = vm.signOut();
    await vm.signOut();
    await first;

    expect(
      api.requests
          .where((RequestOptions r) => r.path == ApiEndPoints.logout)
          .length,
      1,
      reason: 'the overlay blocks taps, but the guard is what makes it true',
    );
  });

  group('memberships refresh with the record', () {
    /// The profile body, with however many organizations the account now has.
    Map<String, dynamic> bodyWithOrgs(List<Map<String, dynamic>> orgs) =>
        <String, dynamic>{...profileBody(), 'organizations': orgs};

    test(
      'an org added elsewhere reaches the picker without a re-login',
      () async {
        final SessionProvider session = await signedIn();
        expect(
          session.canSwitchOrg,
          isFalse,
          reason: 'login handed it one membership',
        );

        api.on(
          ApiEndPoints.user(userId),
          status: 200,
          body: bodyWithOrgs(<Map<String, dynamic>>[
            <String, dynamic>{'org_id': 2, 'name': 'Demo', 'role': 'student'},
            <String, dynamic>{'org_id': 7, 'name': 'Second', 'role': 'student'},
            <String, dynamic>{'org_id': 9, 'name': 'Third', 'role': 'teacher'},
          ]),
        );

        final ProfileViewModel vm = ProfileViewModel(session: session);
        addTearDown(vm.dispose);
        await vm.load();

        // The symptom this fixes: Profile's organization row is only tappable
        // when there is somewhere to switch to.
        expect(session.organizations, hasLength(3));
        expect(session.canSwitchOrg, isTrue);

        // And the new one is selectable — `selectOrg` refuses anything it does
        // not consider a membership, which it would have done before.
        expect(await session.selectOrg(7), isTrue);
      },
    );

    test('a body that omits organizations leaves the picker alone', () async {
      final SessionProvider session = await signedIn();
      final Map<String, dynamic> body = profileBody()..remove('organizations');
      api.on(ApiEndPoints.user(userId), status: 200, body: body);

      final ProfileViewModel vm = ProfileViewModel(session: session);
      addTearDown(vm.dispose);
      await vm.load();

      expect(
        session.organizations,
        hasLength(1),
        reason: 'an absent key is not the same as "no organizations"',
      );
    });

    test(
      'losing the active org drops it rather than 403ing every call',
      () async {
        final SessionProvider session = await signedIn();
        await session.selectOrg(2);
        expect(session.orgId, 2);

        // Removed from org 2 on the web; two others remain.
        api.on(
          ApiEndPoints.user(userId),
          status: 200,
          body: bodyWithOrgs(<Map<String, dynamic>>[
            <String, dynamic>{'org_id': 7, 'name': 'Second', 'role': 'student'},
            <String, dynamic>{'org_id': 9, 'name': 'Third', 'role': 'student'},
          ]),
        );

        final ProfileViewModel vm = ProfileViewModel(session: session);
        addTearDown(vm.dispose);
        await vm.load();

        expect(session.orgId, isNull);
        expect(session.needsOrgChoice, isTrue, reason: 'the picker decides');
      },
    );

    test('losing all but one org scopes to the survivor silently', () async {
      final SessionProvider session = await signedIn();
      await session.selectOrg(2);

      api.on(
        ApiEndPoints.user(userId),
        status: 200,
        body: bodyWithOrgs(<Map<String, dynamic>>[
          <String, dynamic>{'org_id': 7, 'name': 'Second', 'role': 'student'},
        ]),
      );

      final ProfileViewModel vm = ProfileViewModel(session: session);
      addTearDown(vm.dispose);
      await vm.load();

      expect(session.orgId, 7);
      expect(session.needsOrgChoice, isFalse);
    });
  });

  group('switching organization', () {
    Future<SessionProvider> withTwoOrgs() async {
      final SessionProvider session = SessionProvider();
      await session.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: orgId, orgName: 'Demo', role: 'student'),
            OrgMembership(orgId: 9, orgName: 'Other', role: 'student'),
          ],
        ),
      );
      await session.selectOrg(orgId);
      return session;
    }

    test('fetches the new brand before it switches the session', () async {
      // The org is in `sessionKey`, so `selectOrg` tears this view model down
      // along with the subtree. A brand fetched after it would be awaited by
      // an object that no longer exists — and the loader would vanish with it.
      final SessionProvider session = await withTwoOrgs();
      final BrandingProvider branding = BrandingProvider();
      addTearDown(branding.dispose);

      api.on(
        ApiEndPoints.organization(9),
        status: 200,
        body: <String, dynamic>{
          'id': 9,
          'name': 'Other',
          'primary_color': '#B91C1C',
        },
        delay: const Duration(milliseconds: 80),
      );

      final ProfileViewModel vm = ProfileViewModel(
        session: session,
        branding: branding,
      );
      addTearDown(vm.dispose);

      final Future<bool> pending = vm.switchOrg(9);
      expect(vm.isSwitchingOrg, isTrue, reason: 'set before the first await');
      expect(session.orgId, orgId, reason: 'still the old org for now');

      expect(await pending, isTrue);
      expect(branding.orgName, 'Other');
      expect(session.orgId, 9, reason: 'the session switches last');
      expect(vm.isSwitchingOrg, isFalse);
    });

    test('an organization the account does not belong to is refused', () async {
      // And refused *before* the fetch, so it cannot leave the wrong brand on
      // screen.
      final SessionProvider session = await withTwoOrgs();
      final BrandingProvider branding = BrandingProvider();
      addTearDown(branding.dispose);

      final ProfileViewModel vm = ProfileViewModel(
        session: session,
        branding: branding,
      );
      addTearDown(vm.dispose);

      expect(await vm.switchOrg(404), isFalse);
      expect(api.hit(ApiEndPoints.organization(404)), isFalse);
      expect(session.orgId, orgId);
    });
  });

  test('a failed refresh keeps the record that is already on screen', () async {
    final SessionProvider session = await signedIn(firstName: 'Old');
    api.on(
      ApiEndPoints.user(userId),
      status: 500,
      body: <String, dynamic>{'detail': 'Server error'},
    );

    final ProfileViewModel vm = ProfileViewModel(session: session);
    await vm.load();

    expect(
      session.user?.firstName,
      'Old',
      reason: 'online-only: never blank it',
    );
    expect(vm.state, ViewState.success);
  });
}
