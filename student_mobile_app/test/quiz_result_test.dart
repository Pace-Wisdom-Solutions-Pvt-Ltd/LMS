// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The quiz result's review.
//
// It lists what the learner picked, and the control in front of each answer is
// the same one they picked it with: a radio where one answer was wanted, a
// checkbox where several were. Both screens share [ChoiceIndicator], so the
// shape cannot come to mean two different things.
//
// The review deliberately never says whether an answer was right — that would
// need `is_correct`, which this app does not read (rule 2).

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 5;
  const int courseId = 182;
  const int moduleId = 1155;
  const int nodeId = 2032;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_quiz_result_');
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

  /// The roadmap is where a finished attempt is read back from: `quiz_score`
  /// lives on its copy of the node, and the embedded questions already carry
  /// the learner's `selected_options`.
  void serveRoadmap() => api.on(
    ApiEndPoints.roadmap(orgId, '$courseId'),
    status: 200,
    body: <String, dynamic>{
      'id': courseId,
      'title': 'Flutter course',
      'modules': <dynamic>[
        <String, dynamic>{
          'id': moduleId,
          'title': 'Beginner',
          'sequence_order': 1,
          'nodes': <dynamic>[
            <String, dynamic>{
              'id': nodeId,
              'module': moduleId,
              'title': 'Quiz for flutter dev',
              'has_quiz': true,
              'quizzes': <dynamic>[
                <String, dynamic>{
                  'id': 84,
                  'name': 'Quiz for flutter dev',
                  'pass_percentage': 80,
                  'must_pass_to_continue': true,
                  'questions': <dynamic>[
                    <String, dynamic>{
                      'id': 185,
                      'question_text': 'Pick one',
                      'allow_multiple_correct': false,
                      'options': <dynamic>[
                        <String, dynamic>{'id': 735, 'option_text': 'Alpha'},
                        <String, dynamic>{'id': 736, 'option_text': 'Beta'},
                      ],
                      'selected_options': <int>[735],
                    },
                    <String, dynamic>{
                      'id': 186,
                      'question_text': 'Pick several',
                      'allow_multiple_correct': true,
                      'options': <dynamic>[
                        <String, dynamic>{'id': 739, 'option_text': 'Gamma'},
                        <String, dynamic>{'id': 740, 'option_text': 'Delta'},
                      ],
                      'selected_options': <int>[739, 740],
                    },
                  ],
                },
              ],
              'progress': <String, dynamic>{
                'status': 'Completed',
                'quiz_score': 100.0,
              },
              'is_completed': true,
              'is_accessible': true,
            },
          ],
          'is_accessible': true,
        },
      ],
    },
  );

  Future<void> pumpResult(WidgetTester tester) async {
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
            home: const QuizResultScreen(
              courseId: courseId,
              moduleId: moduleId,
              nodeId: nodeId,
            ),
          ),
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 900));
    });
  }

  /// True when this indicator is drawn as a circle — a radio — rather than a
  /// rounded square. Measured as "radius is half the box", because
  /// [ChoiceIndicator] never uses `BoxShape.circle`.
  bool isCircle(WidgetTester tester, ChoiceIndicator indicator) {
    final AnimatedContainer box = tester.widget<AnimatedContainer>(
      find.descendant(
        of: find.byWidget(indicator),
        matching: find.byType(AnimatedContainer),
      ),
    );
    final double radius =
        ((box.decoration! as BoxDecoration).borderRadius! as BorderRadius)
            .topLeft
            .x;
    return (radius - indicator.size / 2).abs() < 0.01;
  }

  testWidgets(
    'the review marks each answer with the control it was picked by',
    (WidgetTester tester) async {
      serveRoadmap();
      await pumpResult(tester);

      expect(find.text('Alpha'), findsOneWidget);
      expect(find.text('Gamma'), findsOneWidget);
      expect(find.text('Delta'), findsOneWidget);

      /// The indicator sitting beside one answer's text.
      bool circleBeside(String answer) {
        final Finder row = find
            .ancestor(of: find.text(answer), matching: find.byType(Row))
            .first;
        return isCircle(
          tester,
          tester.widget<ChoiceIndicator>(
            find.descendant(of: row, matching: find.byType(ChoiceIndicator)),
          ),
        );
      }

      expect(
        circleBeside('Alpha'),
        isTrue,
        reason: 'one answer was wanted, so the record shows a radio',
      );
      expect(
        circleBeside('Gamma'),
        isFalse,
        reason: 'several answers were wanted, so the record shows a checkbox',
      );
      expect(circleBeside('Delta'), isFalse);
    },
  );

  testWidgets('the review never says whether an answer was right', (
    WidgetTester tester,
  ) async {
    serveRoadmap();
    await pumpResult(tester);

    // The option the learner did not pick is simply absent — no cross, no
    // tick, and no sign of which one was correct.
    expect(find.text('Beta'), findsNothing);
  });
}
