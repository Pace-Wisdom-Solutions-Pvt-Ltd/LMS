// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The certificate on a finished course's roadmap.
//
// The roadmap payload carries it now, and `certificate: null` is the normal
// state of a course whose lessons are all done but whose last task is still
// waiting on a trainer. So completion alone must not put a card on screen —
// there would be nothing behind its buttons.
//
// The card is the shared `CertificateCard`, the same one Progress lists, which
// is the point: the two screens cannot drift apart on what View, Download and
// Share do. Here it is the `.forCourse` variant — this screen already *is* the
// course, so the card reads "Your certificate" rather than naming it again.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;
  const int courseId = 1;
  const String reference = 'CERT-C-1-DEEFDA1C';

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_roadmap_cert_');
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

  /// The certificate object exactly as the roadmap nests it — no
  /// `certificate_title`, no `download_url`, which is why neither can be
  /// required to print a card.
  Map<String, dynamic> certificate() => <String, dynamic>{
    'id': 1,
    'certificate_id': reference,
    'certificate_type': 'Course',
    'issued_at': '2026-10-08T08:37:02.904648Z',
    'student': <String, dynamic>{
      'id': 'ae5af8a1-5534-49ea-b227-e1cc4e54a6aa',
      'email': 'leelanjans828@gmail.com',
      'full_name': 'Leelanjan S',
    },
    'course': <String, dynamic>{
      'id': courseId,
      'title': 'POSH Training',
      'description': 'POSH Training',
    },
    'organization': <String, dynamic>{'id': 1, 'name': 'wisdom pace'},
    'template': null,
    'html_content': '<!DOCTYPE html><html lang="en"><head>…',
    'preview_url': 'https://localhost:8000/api/certificates/$reference/html/',
  };

  Map<String, dynamic> roadmap({
    required bool completed,
    required bool withCertificate,
  }) => <String, dynamic>{
    'id': courseId,
    'title': 'POSH Training',
    'description': 'POSH Training',
    'status': 'Published',
    'is_completed': completed,
    'certificate': withCertificate ? certificate() : null,
    'modules': <dynamic>[
      <String, dynamic>{
        'id': 1155,
        'title': 'Beginner',
        'sequence_order': 1,
        'chapters': <dynamic>[],
        'is_accessible': true,
        'nodes': <dynamic>[
          <String, dynamic>{
            'id': 2032,
            'module': 1155,
            'title': 'Lesson one',
            'description': '',
            'sequence_order': 1,
            'has_learning_material': true,
            'has_task': false,
            'has_quiz': false,
            'has_assessment': false,
            'quizzes': <dynamic>[],
            'is_completed': completed,
            'is_accessible': true,
          },
        ],
      },
    ],
  };

  Future<AppLocalizations> pumpRoadmap(
    WidgetTester tester, {
    required bool completed,
    required bool withCertificate,
  }) async {
    api.on(
      ApiEndPoints.roadmap(orgId, '$courseId'),
      status: 200,
      body: roadmap(completed: completed, withCertificate: withCertificate),
    );

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
        ChangeNotifierProvider<SessionProvider>.value(
          value: session,
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('en'),
            supportedLocales: const <Locale>[Locale('en')],
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const RoadmapScreen(courseId: courseId),
          ),
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 400));
    });

    return AppLocalizations.delegate.load(const Locale('en'));
  }

  group('the model', () {
    test('reads the nested certificate off the roadmap', () {
      final Roadmap r = Roadmap.fromJson(
        roadmap(completed: true, withCertificate: true),
      );

      expect(r.hasCertificate, isTrue);
      expect(r.certificate?.certificateId, reference);
      expect(r.certificate?.courseName, 'POSH Training');
      // No `certificate_title` in this shape; the course name has to stand in,
      // or the card prints nothing.
      expect(r.certificate?.title, 'POSH Training');
      expect(r.certificate?.issuedAt?.toUtc().year, 2026);
    });

    test('a null certificate is a wait, not an absence', () {
      // The ordinary state of a finished course awaiting a trainer's marks.
      final Roadmap r = Roadmap.fromJson(
        roadmap(completed: true, withCertificate: false),
      );

      expect(r.isCompleted, isTrue);
      expect(r.certificate, isNull);
      expect(
        r.hasCertificate,
        isFalse,
        reason: 'completion alone is not an issued certificate',
      );
      expect(
        r.awaitsCertificate,
        isTrue,
        reason: 'and the screen has something to say about that',
      );
    });

    test('an unfinished course neither offers nor promises one', () {
      final Roadmap r = Roadmap.fromJson(
        roadmap(completed: false, withCertificate: true),
      );
      expect(r.hasCertificate, isFalse);
      expect(r.awaitsCertificate, isFalse);
    });

    test('the download is addressed by reference, not by preview_url', () {
      final Roadmap r = Roadmap.fromJson(
        roadmap(completed: true, withCertificate: true),
      );

      expect(
        ApiEndPoints.downloadCertificate(r.certificate!.certificateId),
        '/api/certificates/$reference/download/',
      );
      expect(
        r.certificate!.downloadUrl,
        isEmpty,
        reason: 'this shape does not even send one',
      );
    });
  });

  group('the screen', () {
    testWidgets('a finished course offers its certificate', (
      WidgetTester tester,
    ) async {
      final AppLocalizations l10n = await pumpRoadmap(
        tester,
        completed: true,
        withCertificate: true,
      );

      expect(find.byType(CertificateCard), findsOneWidget);
      expect(find.text(l10n.courseCertificateTitle), findsOneWidget);
      expect(find.text(l10n.courseCertificateBody), findsOneWidget);

      // The course, the issue date and the reference are what the Progress
      // list needs to tell one card from another. Here there is one card, on
      // the course's own screen, so none of the three belongs on it. Scoped
      // to the card: the course name is of course still up in the header.
      Finder onCard(String text) => find.descendant(
        of: find.byType(CertificateCard),
        matching: find.text(text),
      );
      expect(onCard('POSH Training'), findsNothing);
      expect(onCard(reference), findsNothing);
      expect(onCard(formatLongDate(DateTime.utc(2026, 10, 8))), findsNothing);

      // The same three actions as Progress, because it is the same card.
      for (final String label in <String>[
        l10n.view,
        l10n.download,
        l10n.share,
      ]) {
        expect(find.byTooltip(label), findsOneWidget, reason: 'no "$label"');
      }
    });

    testWidgets('a finished course with nothing issued says what it awaits', (
      WidgetTester tester,
    ) async {
      final AppLocalizations l10n = await pumpRoadmap(
        tester,
        completed: true,
        withCertificate: false,
      );

      // No card — there is nothing behind its buttons to fetch.
      expect(find.byType(CertificateCard), findsNothing);
      expect(find.byTooltip(l10n.download), findsNothing);
      // But not silence either.
      expect(find.text(l10n.certificatePendingTitle), findsOneWidget);
      expect(find.text(l10n.certificatePendingBody), findsOneWidget);
    });

    testWidgets('an unfinished course says nothing at all', (
      WidgetTester tester,
    ) async {
      final AppLocalizations l10n = await pumpRoadmap(
        tester,
        completed: false,
        withCertificate: true,
      );

      expect(find.byType(CertificateCard), findsNothing);
      expect(
        find.text(l10n.certificatePendingTitle),
        findsNothing,
        reason: 'promising a certificate mid-course is not the roadmap\'s job',
      );
    });

    testWidgets('downloading it reports failure in the card\'s own words', (
      WidgetTester tester,
    ) async {
      // Proves the roadmap is wired to the real download, not just drawing a
      // card: the refusal has to come back through RoadmapViewModel.
      api.on(
        ApiEndPoints.downloadCertificate(reference),
        status: 500,
        body: <String, dynamic>{'detail': 'nope'},
      );
      final AppLocalizations l10n = await pumpRoadmap(
        tester,
        completed: true,
        withCertificate: true,
      );

      await tester.runAsync(() async {
        await tester.tap(find.byTooltip(l10n.download));
        await Future<void>.delayed(const Duration(milliseconds: 80));
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pump(const Duration(milliseconds: 300));
      });

      expect(find.text(l10n.certificateDownloadFailed), findsOneWidget);
    });
  });
}
