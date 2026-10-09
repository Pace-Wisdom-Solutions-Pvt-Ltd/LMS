// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// "Completed" inside an expanded row.
//
// A completed quiz or task row used to say so only in the marker — a green
// tick in a 50px circle, next to a button reading "View result", which is
// thin evidence that the thing is actually finished. All three bodies now end
// with the same line, from the same widget, so the row states it in words.
//
// Material is the one that *replaces* its button with the line: there is
// nothing left to do. Quiz and task keep theirs, because the result and the
// submission are still worth opening, so for them the line is additional.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;
  const int courseId = 182;
  const int nodeId = 2032;
  const String rowTitle = 'Node one';

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_done_label_');
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

  /// One node of whichever kind, complete or not.
  Map<String, dynamic> node({
    required bool completed,
    bool quiz = false,
    bool task = false,
    bool material = false,
  }) => <String, dynamic>{
    'id': nodeId,
    'module': 1155,
    'title': rowTitle,
    'description': '',
    'sequence_order': 1,
    'prerequisite_node': null,
    'focus_areas': '',
    'quick_outline': '',
    'has_learning_material': material,
    'has_task': task,
    'has_quiz': quiz,
    'has_assessment': false,
    'quizzes': quiz
        ? <dynamic>[
            <String, dynamic>{
              'id': 84,
              'name': 'Quiz for flutter dev',
              'timer_minutes': 3,
              'pass_percentage': 80,
              'must_pass_to_continue': false,
              'questions': <dynamic>[
                <String, dynamic>{
                  'id': 185,
                  'question_text': 'One',
                  'allow_multiple_correct': false,
                  'options': <dynamic>[
                    <String, dynamic>{'id': 735, 'option_text': 'a'},
                  ],
                },
              ],
            },
          ]
        : <dynamic>[],
    'progress': completed
        ? <String, dynamic>{
            'status': 'Completed',
            'last_accessed': '2026-09-30T07:05:59Z',
            // Passed, so no retake is offered and the button stays "View
            // result" — the state where the line is the only thing that says
            // the node itself is done.
            'quiz_score': quiz ? 100 : null,
          }
        : null,
    'is_completed': completed,
    'is_accessible': true,
  };

  /// Pumps the roadmap and expands the single row.
  Future<void> pumpExpanded(
    WidgetTester tester,
    Map<String, dynamic> theNode,
  ) async {
    api.on(
      ApiEndPoints.roadmap(orgId, '$courseId'),
      status: 200,
      body: <String, dynamic>{
        'id': courseId,
        'title': 'Flutter course',
        'description': '',
        'is_completed': false,
        'modules': <dynamic>[
          <String, dynamic>{
            'id': 1155,
            'title': 'Beginner',
            'sequence_order': 1,
            'chapters': <dynamic>[],
            'nodes': <dynamic>[theNode],
            'is_accessible': true,
          },
        ],
      },
    );
    // Material rows fetch their detail on expand; the others never ask.
    api.on(
      ApiEndPoints.node(orgId, '$courseId', '1155', '$nodeId'),
      status: 200,
      body: <String, dynamic>{
        'id': nodeId,
        'title': rowTitle,
        'learning_material': <String, dynamic>{
          'id': 9,
          'material_type': 'Text',
          'content_text': 'Some reading.',
        },
      },
    );

    tester.view.physicalSize = const Size(420, 2000);
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

      await tester.tap(find.text(rowTitle).first);
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 400));
    });
  }

  final Finder done = find.text('Completed');

  /// The line's own tick, by its size. A passed quiz's score chip draws the
  /// same glyph at 13, so `byIcon` alone would match that too and the quiz
  /// case would pass for the wrong reason.
  final Finder tick = find.byWidgetPredicate(
    (Widget w) =>
        w is Icon && w.icon == Icons.check_circle_rounded && w.size == 18,
  );

  testWidgets('a completed quiz row says so, under its button', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester, node(completed: true, quiz: true));

    expect(done, findsOneWidget);
    expect(tick, findsOneWidget);
    expect(
      find.text('View result'),
      findsOneWidget,
      reason: 'the line is additional here, not a replacement',
    );
  });

  testWidgets('a completed task row says so, under its button', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester, node(completed: true, task: true));

    expect(done, findsOneWidget);
    expect(tick, findsOneWidget);
    expect(find.text('View task'), findsOneWidget);
  });

  testWidgets('an unfinished quiz row claims nothing', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester, node(completed: false, quiz: true));

    expect(done, findsNothing);
    expect(tick, findsNothing);
    expect(find.text('Start quiz'), findsOneWidget);
  });

  testWidgets('an unfinished task row claims nothing', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester, node(completed: false, task: true));

    expect(done, findsNothing);
    expect(tick, findsNothing);
  });

  testWidgets('material replaces its button with the line', (
    WidgetTester tester,
  ) async {
    // The same widget, reached the other way: the node is finished, so the
    // button that offered to finish it is gone.
    await pumpExpanded(tester, node(completed: true, material: true));

    expect(done, findsOneWidget);
    expect(tick, findsOneWidget);
    expect(find.text('Mark as completed'), findsNothing);
  });
}
