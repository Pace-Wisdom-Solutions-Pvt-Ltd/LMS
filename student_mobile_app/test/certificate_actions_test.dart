// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The certificate card's actions.
//
// They are icon-only on purpose, so the only thing naming them is the
// Semantics label. Losing one would be invisible on screen and total for
// anyone using a screen reader, which is exactly why it is pinned here rather
// than left to the eye.

import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

/// A repository that reports a download part-way through and then stops,
/// holding the view model inside the window the ring is about.
class _StalledDownload extends ProgressRepository {
  _StalledDownload({required this.received, required this.total});

  final int received;
  final int total;
  final Completer<ApiResponse> _never = Completer<ApiResponse>();

  @override
  Future<ApiResponse> downloadCertificate(
    int orgId,
    int certificateId, {
    ProgressCallback? onReceiveProgress,
  }) {
    onReceiveProgress?.call(received, total);
    return _never.future;
  }
}

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 2;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_cert_');
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

  Map<String, dynamic> certificate({
    required int id,
    required String type,
    required String title,
  }) => <String, dynamic>{
    'id': id,
    'certificate_id': 'CERT-C-$id-EC645BC6',
    'certificate_title': title,
    'certificate_type': type,
    'course_name': title,
    'issued_at': '2026-08-31T10:00:00Z',
  };

  /// Pumps the real screen over canned responses.
  ///
  /// Everything runs inside [WidgetTester.runAsync]: `SessionProvider` writes
  /// to Hive and Dio arms 30s timeout timers, and neither a real file write
  /// nor a real timer makes progress inside the fake-async zone — the test
  /// simply hangs. Frames are pumped for bounded durations rather than
  /// settled, because the ring and the tab underline animate.
  Future<void> pumpProgress(
    WidgetTester tester, {
    required List<Map<String, dynamic>> certificates,
    ProgressRepository? repository,
  }) async {
    api.on(
      ApiEndPoints.myProgress(orgId),
      status: 200,
      body: <String, dynamic>{
        'overall_completion_percentage': 10,
        'total_nodes': 10,
        'completed_nodes': 1,
        'batches': <dynamic>[
          <String, dynamic>{
            'id': 1,
            'name': 'Python Batch - Oct 2026',
            'courses': <dynamic>[
              <String, dynamic>{
                'id': 1,
                'title': 'Python Fundamentals',
                'completed_nodes': 1,
                'total_nodes': 10,
                'completion_percentage': 10,
              },
            ],
          },
        ],
      },
    );
    api.on(
      ApiEndPoints.certificates(orgId),
      status: 200,
      body: <String, dynamic>{
        'count': certificates.length,
        'next': null,
        'previous': null,
        'results': certificates,
      },
    );

    // The whole screen is taller than the default 800x600 surface, and the
    // certificate cards sit at the bottom of it. Off-screen widgets cannot be
    // tapped, so give the test a phone-shaped but very tall viewport instead
    // of scrolling to each one.
    tester.view.physicalSize = const Size(420, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

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
        MultiProvider(
          providers: <SingleChildWidget>[
            ChangeNotifierProvider<SessionProvider>.value(value: session),
            ChangeNotifierProvider<ProgressViewModel>(
              create: (_) => ProgressViewModel(repository: repository),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('en'),
            supportedLocales: const <Locale>[Locale('en')],
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const ProgressScreen(),
          ),
        ),
      );

      // The post-frame callback fires the load; give the fake adapter a real
      // event-loop turn to answer it.
      await tester.pump();
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
    });
  }

  testWidgets('every action is named for a screen reader, not on screen', (
    WidgetTester tester,
  ) async {
    await pumpProgress(
      tester,
      certificates: <Map<String, dynamic>>[
        certificate(id: 5, type: 'COURSE', title: 'Python Fundamentals'),
      ],
    );

    final AppLocalizations l10n = await AppLocalizations.delegate.load(
      const Locale('en'),
    );

    for (final String label in <String>[l10n.view, l10n.download, l10n.share]) {
      final Finder button = find.byTooltip(label);
      expect(button, findsOneWidget, reason: 'no "$label" action on the card');

      // Asserted against the widget, not the rendered semantics node, because
      // how neighbouring nodes merge is an implementation detail — that this
      // button is annotated as a button with this name is not.
      expect(
        find.ancestor(
          of: button,
          matching: find.byWidgetPredicate(
            (Widget w) =>
                w is Semantics &&
                w.properties.button == true &&
                w.properties.label == label,
          ),
        ),
        findsOneWidget,
        reason: '"$label" is the only thing naming that button',
      );

      expect(
        find.text(label),
        findsNothing,
        reason: 'the actions are icon-only — nothing is printed',
      );
    }
  });

  group('download progress', () {
    const Certificate certificate = Certificate(
      id: 5,
      courseId: 1,
      courseName: 'Python Fundamentals',
      certificateId: 'CERT-5',
      title: 'Python Fundamentals',
    );

    test('is the real fraction of the bytes received', () async {
      final ProgressViewModel vm = ProgressViewModel(
        repository: _StalledDownload(received: 512, total: 2048),
      );
      addTearDown(vm.dispose);

      unawaited(vm.downloadCertificate(orgId, certificate));
      await Future<void>.delayed(Duration.zero);

      expect(vm.isDownloading(5), isTrue);
      expect(vm.downloadProgress(5), closeTo(0.25, 0.001));
    });

    test('is null when the response never said how big it was', () async {
      // Dio reports `total: -1` without a `Content-Length`, and an invented
      // percentage that sticks is worse than an honest spinner.
      final ProgressViewModel vm = ProgressViewModel(
        repository: _StalledDownload(received: 512, total: -1),
      );
      addTearDown(vm.dispose);

      unawaited(vm.downloadCertificate(orgId, certificate));
      await Future<void>.delayed(Duration.zero);

      expect(vm.isDownloading(5), isTrue);
      expect(vm.downloadProgress(5), isNull);
    });
  });

  testWidgets('the card prints the percentage as the bytes arrive', (
    WidgetTester tester,
  ) async {
    await pumpProgress(
      tester,
      certificates: <Map<String, dynamic>>[
        certificate(id: 5, type: 'COURSE', title: 'Python Fundamentals'),
      ],
      repository: _StalledDownload(received: 512, total: 2048),
    );

    final AppLocalizations l10n = await AppLocalizations.delegate.load(
      const Locale('en'),
    );

    await tester.runAsync(() async {
      await tester.tap(find.byTooltip(l10n.download));
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump();
    });

    // Past the ring's own tween, which eases to the reported value rather
    // than snapping to it. Outside `runAsync`, where the test clock drives
    // the ticker.
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('25%'), findsOneWidget);

    final CircularProgressIndicator ring = tester
        .widget<CircularProgressIndicator>(
          find.byType(CircularProgressIndicator),
        );
    expect(
      ring.value,
      closeTo(0.25, 0.01),
      reason: 'the ring is drawn to the same fraction, not left spinning',
    );
  });

  testWidgets('a download in flight seals the card without collapsing it', (
    WidgetTester tester,
  ) async {
    // The card used to swap its button row for a centred spinner, which took
    // the card's height with it and bounced every card below. Worse, the
    // three actions vanished mid-tap.
    await pumpProgress(
      tester,
      certificates: <Map<String, dynamic>>[
        certificate(id: 5, type: 'COURSE', title: 'Python Fundamentals'),
      ],
    );

    final AppLocalizations l10n = await AppLocalizations.delegate.load(
      const Locale('en'),
    );

    // Held open, so the test sits inside the window it is about.
    api.on(
      ApiEndPoints.downloadCertificate(orgId, 5),
      status: 200,
      body: <String, dynamic>{},
      delay: const Duration(seconds: 5),
    );

    final double heightBefore = tester
        .getSize(find.byTooltip(l10n.download))
        .height;

    await tester.runAsync(() async {
      await tester.tap(find.byTooltip(l10n.download));
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 300));
    });

    expect(
      find.byType(CircularProgressIndicator),
      findsOneWidget,
      reason: 'the progress sits over the card',
    );
    for (final String label in <String>[l10n.view, l10n.download, l10n.share]) {
      expect(
        find.byTooltip(label),
        findsOneWidget,
        reason: '"$label" stays on the card rather than being replaced',
      );
    }
    expect(
      tester.getSize(find.byTooltip(l10n.download)).height,
      heightBefore,
      reason: 'and the card does not change size under the learner',
    );

    // Somewhere above the buttons something is swallowing input. Which
    // ancestor is an implementation detail; that one of them absorbs is not.
    final Iterable<AbsorbPointer> seals = tester.widgetList<AbsorbPointer>(
      find.ancestor(
        of: find.byTooltip(l10n.download),
        matching: find.byType(AbsorbPointer),
      ),
    );
    expect(
      seals.any((AbsorbPointer a) => a.absorbing),
      isTrue,
      reason: 'and none of them can be tapped',
    );
  });

  testWidgets('every certificate the endpoint returns is listed', (
    WidgetTester tester,
  ) async {
    // The learner earned all of it; `certificate_type` hides nothing.
    await pumpProgress(
      tester,
      certificates: <Map<String, dynamic>>[
        certificate(id: 5, type: 'COURSE', title: 'Python Fundamentals'),
        certificate(id: 6, type: 'SOMETHING_ELSE', title: 'Other Award'),
      ],
    );

    expect(find.text('Python Fundamentals'), findsWidgets);
    expect(find.text('Other Award'), findsWidgets);
  });

  testWidgets('no certificates explains itself instead of going blank', (
    WidgetTester tester,
  ) async {
    await pumpProgress(tester, certificates: <Map<String, dynamic>>[]);

    final AppLocalizations l10n = await AppLocalizations.delegate.load(
      const Locale('en'),
    );

    expect(find.text(l10n.certificatesEmptyTitle), findsOneWidget);
    expect(find.byTooltip(l10n.download), findsNothing);
  });

  testWidgets('the breakdown names the batch a course came through', (
    WidgetTester tester,
  ) async {
    await pumpProgress(tester, certificates: <Map<String, dynamic>>[]);

    expect(find.text('Python Batch - Oct 2026'), findsOneWidget);
    expect(find.text('Python Fundamentals'), findsOneWidget);
    expect(find.text('10%'), findsWidgets);
  });
}
