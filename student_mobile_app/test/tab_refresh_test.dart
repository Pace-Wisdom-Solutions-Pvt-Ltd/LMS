// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Keeping the tabs honest after a lesson is finished.
//
// Home, Courses and Progress live in the shell's `IndexedStack`: built once,
// never covered, never rebuilt. The roadmap is pushed over the shell on the
// **root** navigator, so finishing a lesson there changes every number on all
// three tabs and none of them notices — the learner comes back to the
// percentage they left with, and it stays until the next sign-in.
//
// The shell is the one widget that learns it has been uncovered, so it pulls
// [TabRefresher]. These tests boot the real app and walk that path: no stand-in
// router, because the thing being proved is that the shell's own route sees a
// pop on the root navigator.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;
  const int courseId = 182;

  final String dashboardUrl = ApiEndPoints.dashboard(orgId);
  final String coursesUrl = ApiEndPoints.myCourses(orgId);
  final String progressUrl = ApiEndPoints.myProgress(orgId);

  void serveEverything() {
    api.on(
      ApiEndPoints.organization(orgId),
      status: 200,
      body: <String, dynamic>{'id': orgId, 'name': 'Demo'},
    );
    api.on(
      dashboardUrl,
      status: 200,
      body: <String, dynamic>{
        'cards': <String, dynamic>{'overall_completion_percentage': 40},
        'progress': <dynamic>[],
      },
    );
    api.on(coursesUrl, status: 200, body: <dynamic>[]);
    api.on(
      progressUrl,
      status: 200,
      body: <String, dynamic>{'overall_completion_percentage': 40},
    );
    api.on(ApiEndPoints.certificates(orgId), status: 200, body: <dynamic>[]);
    api.on(
      ApiEndPoints.roadmap(orgId, '$courseId'),
      status: 200,
      body: <String, dynamic>{
        'id': courseId,
        'title': 'Flutter course',
        'modules': <dynamic>[],
      },
    );
  }

  int calls(String path) =>
      api.requests.where((RequestOptions r) => r.path == path).length;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    // The reachability checker polls on a real timer that outlives the tree.
    InternetProvider.pollingEnabled = false;

    tempDir = await Directory.systemTemp.createTemp('lms_tab_refresh_');
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
  /// the splash timer and the shimmer would hold open for its full timeout.
  Future<void> settle(WidgetTester tester) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    await tester.pump(const Duration(milliseconds: 400));
  }

  /// Boots the real app signed in, with one organization, and settles on Home.
  Future<void> bootOnHome(WidgetTester tester) async {
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
      await settle(tester);
    });
  }

  Future<void> openTab(WidgetTester tester, String location) async {
    await tester.runAsync(() async {
      appRouter.go(location);
      await settle(tester);
      await settle(tester);
    });
  }

  /// The roadmap's shape exactly: pushed over the shell on the **root**
  /// navigator, then closed after something was completed up there.
  Future<void> openCourseAndComeBack(WidgetTester tester) async {
    await tester.runAsync(() async {
      appRouter.pushNamed(
        AppRouteNames.roadmap,
        pathParameters: <String, String>{'courseId': '$courseId'},
      );
      await settle(tester);
      await settle(tester);

      appRouter.pop();
      await settle(tester);
      await settle(tester);
    });
  }

  testWidgets('uncovering the shell refetches every tab the learner has seen', (
    WidgetTester tester,
  ) async {
    serveEverything();
    await bootOnHome(tester);

    await openTab(tester, AppRoutePaths.courses);
    await openTab(tester, AppRoutePaths.progress);
    await openTab(tester, AppRoutePaths.home);

    expect(
      <int>[calls(dashboardUrl), calls(coursesUrl), calls(progressUrl)],
      <int>[1, 1, 1],
      reason: 'each tab loads once when it is first built',
    );

    await openCourseAndComeBack(tester);

    expect(
      <int>[calls(dashboardUrl), calls(coursesUrl), calls(progressUrl)],
      <int>[2, 2, 2],
      reason: 'all three report progress, and all three were out of date',
    );
  });

  testWidgets('a tab that was never opened is left alone', (
    WidgetTester tester,
  ) async {
    // Nothing on it is stale, because nothing on it was ever drawn — its own
    // screen loads it the first time the learner goes there.
    serveEverything();
    await bootOnHome(tester);

    expect(calls(dashboardUrl), 1, reason: 'Home is where the app lands');
    expect(calls(coursesUrl), 0);

    await openCourseAndComeBack(tester);

    expect(calls(dashboardUrl), 2);
    expect(calls(coursesUrl), 0);
    expect(calls(progressUrl), 0);
  });

  testWidgets('switching tabs does not refetch anything', (
    WidgetTester tester,
  ) async {
    // The shell reloads on being uncovered, not on every rebuild: moving
    // between tabs must not refetch the one being left or the one arrived at.
    serveEverything();
    await bootOnHome(tester);

    await openTab(tester, AppRoutePaths.courses);
    await openTab(tester, AppRoutePaths.home);
    await openTab(tester, AppRoutePaths.courses);

    expect(<int>[calls(dashboardUrl), calls(coursesUrl)], <int>[1, 1]);
  });
}
