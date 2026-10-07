// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Reloading a screen when it is uncovered.
//
// `await context.pushNamed(...); refresh();` looks like it reloads when the
// learner comes back, and for a plain push-then-pop it does — but **go_router
// drops the completer of a route that gets replaced**. The quiz replaces
// itself with its result, so that future never resolved: not on the
// replacement, not on the later pop. The roadmap stayed stale after every
// quiz, silently.
//
// `appRouteObserver` + `RouteAware.didPopNext` replaces it. These tests walk
// the exact path that used to fail.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;
  const int courseId = 182;

  final String roadmapUrl = ApiEndPoints.roadmap(orgId, '$courseId');

  void serveRoadmap({Duration? delay}) => api.on(
    roadmapUrl,
    delay: delay,
    status: 200,
    body: <String, dynamic>{
      'id': courseId,
      'title': 'Flutter course',
      'modules': <dynamic>[
        <String, dynamic>{
          'id': 1155,
          'title': 'Beginner',
          'sequence_order': 1,
          'nodes': <dynamic>[
            <String, dynamic>{
              'id': 2031,
              'module': 1155,
              'title': 'Task 1',
              'has_task': true,
              'is_accessible': true,
            },
            <String, dynamic>{
              'id': 2032,
              'module': 1155,
              'title': 'Quiz for flutter dev',
              'has_quiz': true,
              'is_accessible': true,
              'quizzes': <dynamic>[
                <String, dynamic>{
                  'id': 84,
                  'name': 'Quiz for flutter dev',
                  'pass_percentage': 80,
                  'questions': <dynamic>[
                    <String, dynamic>{
                      'id': 1,
                      'question_text': 'One',
                      'options': <dynamic>[
                        <String, dynamic>{'id': 11, 'option_text': 'a'},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          'is_accessible': true,
        },
      ],
    },
  );

  int roadmapCalls() =>
      api.requests.where((RequestOptions r) => r.path == roadmapUrl).length;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_return_');
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
  });

  /// A router holding the real roadmap under two throwaway screens, so the
  /// push/replace/pop sequence can be driven by hand.
  ///
  /// The observer is the real one — that registration is half of the fix.
  GoRouter buildRouter() => GoRouter(
    initialLocation: '/course/$courseId',
    observers: <NavigatorObserver>[appRouteObserver],
    routes: <RouteBase>[
      GoRoute(
        path: '/course/:courseId',
        builder: (BuildContext c, GoRouterState s) =>
            const RoadmapScreen(courseId: courseId),
      ),
      GoRoute(
        path: '/pushed',
        name: 'pushed',
        builder: (BuildContext c, GoRouterState s) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => c.pushReplacementNamed('replaced'),
              child: const Text('replace me'),
            ),
          ),
        ),
      ),
      GoRoute(
        path: '/replaced',
        name: 'replaced',
        builder: (BuildContext c, GoRouterState s) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => c.pop(),
              child: const Text('pop me'),
            ),
          ),
        ),
      ),
    ],
  );

  Future<GoRouter> pumpRoadmap(WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final GoRouter router = buildRouter();

    await tester.runAsync(() async {
      final SessionProvider session = SessionProvider();
      await session.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: orgId, orgName: 'Demo', role: 'student'),
          ],
        ),
      );

      await tester.pumpWidget(
        ChangeNotifierProvider<SessionProvider>.value(
          value: session,
          child: MaterialApp.router(
            theme: AppTheme.light(),
            locale: const Locale('en'),
            supportedLocales: const <Locale>[Locale('en')],
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            routerConfig: router,
          ),
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 400));
    });

    return router;
  }

  testWidgets('a screen that replaces itself still reloads the roadmap', (
    WidgetTester tester,
  ) async {
    serveRoadmap();
    final GoRouter router = await pumpRoadmap(tester);

    expect(roadmapCalls(), 1, reason: 'the first load');

    await tester.runAsync(() async {
      router.pushNamed('pushed');
      await tester.pump(const Duration(milliseconds: 400));

      // The quiz's shape: the pushed screen swaps itself for its result.
      await tester.tap(find.text('replace me'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('pop me'), findsOneWidget);

      // This is the moment that used to do nothing at all.
      await tester.tap(find.text('pop me'));
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 400));
    });

    expect(
      roadmapCalls(),
      2,
      reason: 'uncovering the roadmap reloads it, replacement or not',
    );
  });

  testWidgets('a plain push and pop reloads it exactly once', (
    WidgetTester tester,
  ) async {
    // The case that always worked must not now fire twice.
    serveRoadmap();
    final GoRouter router = await pumpRoadmap(tester);
    expect(roadmapCalls(), 1);

    await tester.runAsync(() async {
      router.pushNamed('pushed');
      await tester.pump(const Duration(milliseconds: 400));

      router.pop();
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 400));
    });

    expect(roadmapCalls(), 2);
  });

  testWidgets('merely opening a row does not reload', (
    WidgetTester tester,
  ) async {
    // `didPopNext` fires on being uncovered, not on every rebuild — a tap that
    // never leaves the screen must not refetch.
    serveRoadmap();
    await pumpRoadmap(tester);
    expect(roadmapCalls(), 1);

    await tester.runAsync(() async {
      await tester.tap(find.text('Task 1'));
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 400));
    });

    expect(roadmapCalls(), 1);
  });

  testWidgets('a route the app did not navigate to is not an uncovering', (
    WidgetTester tester,
  ) async {
    // Chewie's fullscreen video is a bare `PageRouteBuilder` pushed on the
    // root navigator by the player widget itself. Popping it used to read as
    // "the learner came back from a lesson": the roadmap reloaded, which
    // swapped the playing row for `_NodeUpdating` and disposed the player
    // mid-animation, so exiting fullscreen threw on a disposed
    // `VideoPlayerController` every frame. The same went for a dialog or a
    // sheet.
    serveRoadmap();
    await pumpRoadmap(tester);
    expect(roadmapCalls(), 1);

    final NavigatorState nav = Navigator.of(
      tester.element(find.byType(RoadmapScreen)),
      rootNavigator: true,
    );

    await tester.runAsync(() async {
      // Deliberately not a `Page` — that is the whole distinction.
      unawaited(
        nav.push(
          PageRouteBuilder<void>(
            pageBuilder: (_, _, _) => const Scaffold(body: Text('fullscreen')),
          ),
        ),
      );
      // An imperative push needs a frame scheduled before it is built, unlike
      // go_router's, which rebuilds the delegate itself.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('fullscreen'), findsOneWidget);

      nav.pop();
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 400));
    });

    expect(
      roadmapCalls(),
      1,
      reason: 'a player, a dialog or a sheet closing is not a navigation',
    );
  });

  testWidgets('a node being re-read offers nothing to tap', (
    WidgetTester tester,
  ) async {
    // The window this closes: the learner submits a quiz, comes back, and the
    // roadmap still holds the pre-submission answer until the reload lands —
    // long enough to tap Start quiz again and burn a second attempt.
    //
    // The roadmap request is left unanswered, which freezes the app exactly
    // in that window.
    serveRoadmap();
    final GoRouter router = await pumpRoadmap(tester);

    // Open the quiz row, so its Start button is on screen.
    await tester.runAsync(() async {
      await tester.tap(find.text('Quiz for flutter dev'));
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 400));
    });
    expect(find.text('Start quiz'), findsOneWidget);

    // Leave and come back, with the reload held open — that window is the
    // whole point of the test.
    serveRoadmap(delay: const Duration(seconds: 5));
    await tester.runAsync(() async {
      router.pushNamed('pushed');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.text('replace me'));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.text('pop me'));
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 200));
    });

    expect(
      find.text('Start quiz'),
      findsNothing,
      reason: 'a second attempt must not be one tap away mid-reload',
    );
    expect(find.text('Updating this lesson'), findsOneWidget);
  });
}
