// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Home with nothing on it yet.
//
// A new learner's first sight of the app was a 72px icon in the middle of an
// otherwise blank screen — no greeting, no cards, nothing to read. That looks
// like a failed load rather than like a beginning. Every section now stands
// whether or not it has data and explains its own absence inside its own card,
// with the greeting above them.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    InternetProvider.pollingEnabled = false;
    tempDir = await Directory.systemTemp.createTemp('lms_home_empty_');
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

  Future<void> pumpHome(
    WidgetTester tester, {
    required List<Map<String, dynamic>> progress,
  }) async {
    tester.view.physicalSize = const Size(420, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    api.on(
      ApiEndPoints.dashboard(orgId),
      status: 200,
      body: <String, dynamic>{
        'cards': <String, dynamic>{
          'enrolled_courses': progress.length,
          'overall_completion_percentage': 0,
          'certificates_earned': 0,
        },
        'progress': progress,
      },
    );
    api.on(
      ApiEndPoints.user('u1'),
      status: 200,
      body: <String, dynamic>{
        'id': 'u1',
        'email': 'l@x.com',
        'first_name': 'Diya',
      },
    );

    await tester.runAsync(() async {
      final SessionProvider session = SessionProvider();
      await session.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com', firstName: 'Diya'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: const <OrgMembership>[
            OrgMembership(orgId: orgId, orgName: 'Demo', role: 'student'),
          ],
        ),
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: <SingleChildWidget>[
            ChangeNotifierProvider<SessionProvider>.value(value: session),
            ChangeNotifierProvider<BrandingProvider>(
              create: (_) => BrandingProvider(),
            ),
            ChangeNotifierProvider<DashboardViewModel>(
              create: (_) => DashboardViewModel(),
            ),
            ChangeNotifierProvider<ProfileViewModel>(
              create: (_) => ProfileViewModel(session: session),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('en'),
            supportedLocales: const <Locale>[Locale('en')],
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const HomeScreen(),
          ),
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 600));
    });
  }

  testWidgets('an empty Home still greets, and says what happens next', (
    WidgetTester tester,
  ) async {
    await pumpHome(tester, progress: <Map<String, dynamic>>[]);

    final AppLocalizations l10n = await AppLocalizations.delegate.load(
      const Locale('en'),
    );

    expect(
      find.text(l10n.greeting('Diya')),
      findsOneWidget,
      reason: 'the greeting is not conditional on having courses',
    );
    // Every section is still here, headed as it will be once there is data.
    for (final String heading in <String>[
      l10n.homeOverallTitle,
      l10n.homeCourseProgressTitle,
      l10n.homeCourseStatusTitle,
      l10n.homeGlanceTitle,
    ]) {
      expect(find.text(heading), findsOneWidget, reason: '"$heading" is gone');
    }

    // And each of the three chart cards says its own piece inside itself,
    // rather than one notice standing in for all of them.
    expect(find.text(l10n.homeOverallEmptyTitle), findsOneWidget);
    expect(find.text(l10n.homeCourseProgressEmptyTitle), findsOneWidget);
    expect(find.text(l10n.homeCourseStatusEmptyTitle), findsOneWidget);
    expect(find.byType(EmptyState), findsNWidgets(3));

    expect(
      find.byType(GaugeArc),
      findsNothing,
      reason: 'a gauge pinned at 0% reads as a number, not as an absence',
    );
    expect(find.byType(StatusDonut), findsNothing);
  });

  testWidgets('a learner with courses gets the four cards instead', (
    WidgetTester tester,
  ) async {
    await pumpHome(
      tester,
      progress: <Map<String, dynamic>>[
        <String, dynamic>{
          'course_id': 1,
          'course_title': 'Flutter',
          'completion_percentage': 40,
        },
      ],
    );

    final AppLocalizations l10n = await AppLocalizations.delegate.load(
      const Locale('en'),
    );

    expect(find.text(l10n.homeOverallEmptyTitle), findsNothing);
    expect(find.byType(EmptyState), findsNothing);
    expect(find.byType(GaugeArc), findsOneWidget);
    expect(find.text('Flutter'), findsOneWidget);
  });
}
