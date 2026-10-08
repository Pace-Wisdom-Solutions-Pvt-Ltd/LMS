// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Switching organization has to refetch every tab.
//
// Every learner endpoint is scoped by `org_id`, so after a switch the numbers
// on Home, Courses and Progress all belong to the organization the learner
// just left.
//
// Going to Home does not fix that, which is the whole reason these tests
// exist. `MyApp` keys the session provider tier on `SessionProvider.sessionKey`
// — the org is in that key — so the view models are correctly discarded and
// rebuilt empty. The screens are not: `appRouter` is a singleton whose
// navigator holds a `GlobalKey`, so the rebuild *reparents* their `State`
// rather than recreating it, `initState` never runs a second time, and the
// learner lands on a shell that calls nothing at all.
//
// So Profile routes through the **splash**. It is not part of the shell, so
// leaving for it disposes all four branches, and coming back builds them from
// scratch — the cold-start path, which does fetch. These tests boot the real
// app, because what is being proved is which parts of the tree survive.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgA = 5;
  const int orgB = 9;

  /// The three tab endpoints, plus the org record branding reads.
  void serve(int org) {
    api.on(
      ApiEndPoints.organization(org),
      status: 200,
      body: <String, dynamic>{'id': org, 'name': 'Org $org'},
    );
    api.on(
      ApiEndPoints.dashboard(org),
      status: 200,
      body: <String, dynamic>{
        'cards': <String, dynamic>{'overall_completion_percentage': org},
        'progress': <dynamic>[],
      },
    );
    api.on(ApiEndPoints.myCourses(org), status: 200, body: <dynamic>[]);
    api.on(
      ApiEndPoints.myProgress(org),
      status: 200,
      body: <String, dynamic>{'overall_completion_percentage': org},
    );
    api.on(ApiEndPoints.certificates(org), status: 200, body: <dynamic>[]);
  }

  int calls(String path) =>
      api.requests.where((RequestOptions r) => r.path == path).length;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    InternetProvider.pollingEnabled = false;

    tempDir = await Directory.systemTemp.createTemp('lms_org_switch_');
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

  Future<void> settle(WidgetTester tester) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    await tester.pump(const Duration(milliseconds: 400));
  }

  /// Waits out the splash: its floor runs on a real timer, and it routes on by
  /// itself once the floor is up.
  ///
  /// Generous on frames on purpose. Landing on the splash takes one of its own
  /// for the page transition, and leaving it has to cover the shell building,
  /// the tabs mounting and their post-frame loads reaching the fake adapter.
  Future<void> passSplash(WidgetTester tester) async {
    await settle(tester);
    await settle(tester);
    await Future<void>.delayed(AppMotion.splashFloor * 1.5);
    for (int i = 0; i < 6; i++) {
      await settle(tester);
    }
  }

  /// Boots the real app signed in to [orgA], with [orgB] also available.
  Future<void> bootOnHome(WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    serve(orgA);
    serve(orgB);

    await tester.runAsync(() async {
      await appSession.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: orgA, orgName: 'Org A', role: 'student'),
            OrgMembership(orgId: orgB, orgName: 'Org B', role: 'student'),
          ],
        ),
      );
      // Two memberships, so login leaves the choice open the way the picker
      // would; take it before the first frame.
      await appSession.selectOrg(orgA);

      await tester.pumpWidget(const MyApp());
      await passSplash(tester);
    });
  }

  /// The switch exactly as Profile performs it.
  Future<void> switchTo(WidgetTester tester, int org) async {
    await tester.runAsync(() async {
      await appSession.selectOrg(org);
      appRouter.goNamed(AppRouteNames.splash);
      await passSplash(tester);
    });
  }

  testWidgets('Home refetches for the organization switched to', (
    WidgetTester tester,
  ) async {
    await bootOnHome(tester);
    expect(calls(ApiEndPoints.dashboard(orgA)), 1);
    expect(calls(ApiEndPoints.dashboard(orgB)), isZero);

    await switchTo(tester, orgB);

    expect(
      calls(ApiEndPoints.dashboard(orgB)),
      1,
      reason: 'the shell has to open the way it does on a cold start',
    );
    expect(appRouter.state.matchedLocation, AppRoutePaths.home);
  });

  testWidgets('a tab visited before the switch refetches too', (
    WidgetTester tester,
  ) async {
    await bootOnHome(tester);

    // Mount Courses and Progress. Their `State` is what a route straight to
    // Home would have preserved, stale, with nothing asking it to reload.
    await tester.runAsync(() async {
      appRouter.go(AppRoutePaths.courses);
      await settle(tester);
      await settle(tester);
      appRouter.go(AppRoutePaths.progress);
      await settle(tester);
      await settle(tester);
    });
    expect(calls(ApiEndPoints.myCourses(orgA)), 1);
    expect(calls(ApiEndPoints.myProgress(orgA)), 1);

    await switchTo(tester, orgB);

    // Home is rebuilt by the splash; the other two refetch when first opened,
    // because the branch that held them was disposed with the shell.
    expect(calls(ApiEndPoints.dashboard(orgB)), 1);

    await tester.runAsync(() async {
      appRouter.go(AppRoutePaths.courses);
      await settle(tester);
      await settle(tester);
      appRouter.go(AppRoutePaths.progress);
      await settle(tester);
      await settle(tester);
    });

    expect(calls(ApiEndPoints.myCourses(orgB)), 1);
    expect(calls(ApiEndPoints.myProgress(orgB)), 1);
    expect(
      calls(ApiEndPoints.myCourses(orgA)),
      1,
      reason: 'the old org is never asked again',
    );
  });

  testWidgets('the old shell is gone, not hidden behind the new one', (
    WidgetTester tester,
  ) async {
    await bootOnHome(tester);
    await switchTo(tester, orgB);

    // One shell, one of each tab. A shell that survived the switch would
    // leave a second copy in the tree.
    expect(find.byType(MainShell), findsOneWidget);
    expect(find.byType(HomeScreen), findsOneWidget);
  });
}
