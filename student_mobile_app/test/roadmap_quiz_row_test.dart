// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The expanded quiz row.
//
// It has three states now — untaken, failed, passed — and they differ only by
// which chips are present. That is the kind of conditional that rots quietly,
// so it is pumped rather than reasoned about.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;
  const int courseId = 182;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_quiz_row_');
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

  /// One quiz node, with `pass_percentage: 80` like the real payload.
  Map<String, dynamic> quizNode({
    bool completed = false,
    double? score,
    bool mustPass = true,
  }) => <String, dynamic>{
    'id': 2032,
    'module': 1155,
    'title': 'Quiz for flutter dev',
    'description': '',
    'sequence_order': 6,
    'prerequisite_node': null,
    'focus_areas': '',
    'quick_outline': '',
    'has_learning_material': false,
    'has_task': false,
    'has_quiz': true,
    'has_assessment': false,
    'has_coding_questions': false,
    'quizzes': <dynamic>[
      <String, dynamic>{
        'id': 84,
        'name': 'Quiz for flutter dev',
        'timer_minutes': 3,
        'pass_percentage': 80,
        'must_pass_to_continue': mustPass,
        'questions': <dynamic>[
          <String, dynamic>{
            'id': 185,
            'question_text': 'One',
            'allow_multiple_correct': false,
            'options': <dynamic>[
              <String, dynamic>{'id': 735, 'option_text': 'a'},
            ],
          },
          <String, dynamic>{
            'id': 186,
            'question_text': 'Two',
            'allow_multiple_correct': true,
            'options': <dynamic>[
              <String, dynamic>{'id': 739, 'option_text': 'b'},
            ],
          },
        ],
      },
    ],
    'progress': completed
        ? <String, dynamic>{
            'status': 'Completed',
            'last_accessed': '2026-09-30T07:05:59Z',
            'quiz_score': score,
          }
        : null,
    'is_completed': completed,
    'is_accessible': true,
    'coding_questions': <dynamic>[],
  };

  /// Pumps the roadmap and opens the quiz row.
  Future<void> pumpExpanded(
    WidgetTester tester, {
    bool completed = false,
    double? score,
    bool mustPass = true,
  }) async {
    api.on(
      ApiEndPoints.roadmap(orgId, '$courseId'),
      status: 200,
      body: <String, dynamic>{
        'id': courseId,
        'title': 'Flutter course',
        'description': 'Flutter course Description',
        'is_completed': false,
        'modules': <dynamic>[
          <String, dynamic>{
            'id': 1155,
            'title': 'Beginner',
            'sequence_order': 1,
            'chapters': <dynamic>[],
            'nodes': <dynamic>[
              quizNode(completed: completed, score: score, mustPass: mustPass),
            ],
            'is_accessible': true,
          },
        ],
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

      // The row title, which is also the quiz name — tapping it expands.
      await tester.tap(find.text('Quiz for flutter dev').first);
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 400));
    });
  }

  final Finder questions = find.text('2 questions');
  final Finder timer = find.text('3 minutes');
  final Finder mustPass = find.text(
    'You need to pass this quiz before the next lesson unlocks.',
  );

  testWidgets('a passed quiz shows the score and nothing else', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester, completed: true, score: 100);

    expect(find.text('Scored 100%'), findsWidgets);
    expect(find.text('View result'), findsOneWidget);
    // The terms of the attempt are settled once it is passed.
    expect(questions, findsNothing);
    expect(timer, findsNothing);
    expect(mustPass, findsNothing);
  });

  testWidgets('a failed quiz keeps the terms of a retake', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester, completed: true, score: 40);

    expect(find.text('Scored 40%'), findsWidgets);
    expect(
      find.text('Start quiz'),
      findsOneWidget,
      reason:
          'must_pass_to_continue gates the next lesson, so it must be retaken',
    );
    expect(find.text('View result'), findsNothing);
    expect(questions, findsOneWidget);
    expect(timer, findsOneWidget);
    expect(mustPass, findsOneWidget);
  });

  testWidgets(
    'a failed quiz on a settled node offers the result, not a retake',
    (WidgetTester tester) async {
      // Complete, and nothing downstream waits on a pass — another attempt
      // would change nothing, so there is no point offering one.
      await pumpExpanded(tester, completed: true, score: 40, mustPass: false);

      expect(find.text('Scored 40%'), findsWidgets);
      expect(find.text('View result'), findsOneWidget);
      expect(find.text('Start quiz'), findsNothing);
    },
  );

  testWidgets('an untaken quiz shows the terms and no score', (
    WidgetTester tester,
  ) async {
    await pumpExpanded(tester);

    expect(find.textContaining('Scored'), findsNothing);
    expect(find.text('Start quiz'), findsOneWidget);
    expect(questions, findsOneWidget);
    expect(timer, findsOneWidget);
    expect(mustPass, findsOneWidget);
  });
}
