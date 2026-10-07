// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The coding screen, end to end over canned responses.
//
// Worth pumping rather than trusting: the screen holds two text controllers
// whose text is owned by the view model, and the sync between them is the one
// place a learner could silently lose typed code. The rest is layout that has
// to survive a long problem statement on a phone.

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
  const int nodeId = 2033;

  final String questionsUrl = ApiEndPoints.codingQuestions(
    orgId,
    '$courseId',
    '$moduleId',
    '$nodeId',
  );
  String signatureUrl(int q) => ApiEndPoints.codingSignature(
    orgId,
    '$courseId',
    '$moduleId',
    '$nodeId',
    '$q',
  );
  String runUrl(int q) =>
      ApiEndPoints.codingRun(orgId, '$courseId', '$moduleId', '$nodeId', '$q');

  Map<String, dynamic> problem({
    required int id,
    required String name,
    required String language,
    int order = 1,
    String signature = '',
  }) => <String, dynamic>{
    'id': id,
    'node': nodeId,
    'problem_name': name,
    'question_text': 'write a dart code for flutter',
    'description':
        'A Flutter developer needs a utility function that converts a raw '
        'string representation of a Dart class structure into a simplified '
        "'Widget Tree' representation.",
    'programming_language': language,
    'function_signature': signature,
    'input_format': 'A single string containing Dart code provided via stdin.',
    'output_format': 'A single line of widget names separated by a space.',
    'time_limit': 2,
    'memory_limit': 256,
    'duration': null,
    'sequence_order': order,
    'sample_test_cases': <dynamic>[
      <String, dynamic>{
        'id': 217,
        'input_data': 'Container(child: Column(children: []))',
        'expected_output': 'Container Column',
        'is_sample': true,
      },
    ],
    'allowed_languages': <dynamic>[
      <String, dynamic>{'key': 'python', 'label': 'Python'},
      <String, dynamic>{'key': 'cpp', 'label': 'C++'},
    ],
    'latest_submission': null,
  };

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_coding_screen_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
    api.install();
    CodingViewModel.pollInterval = Duration.zero;
    CodingViewModel.maxPolls = 2;
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    api.reset();
    await HiveStorage.clearAllBoxes();
  });

  /// Pumps the real screen. Everything is inside [WidgetTester.runAsync]:
  /// `SessionProvider` writes to Hive and Dio arms timeout timers, neither of
  /// which makes progress in the fake-async zone. Frames are pumped for
  /// bounded durations rather than settled, because the chips animate.
  Future<void> pumpCoding(WidgetTester tester) async {
    // Taller than the default 800x600 surface: the editor and the action bar
    // sit below a long statement, and an off-screen widget cannot be tapped.
    tester.view.physicalSize = const Size(420, 2600);
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
            home: const CodingScreen(
              courseId: courseId,
              moduleId: moduleId,
              nodeId: nodeId,
            ),
          ),
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 400));
    });
  }

  testWidgets('shows the problem, its limits and its sample case', (
    WidgetTester tester,
  ) async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[
        problem(id: 29, name: 'Widget names', language: 'python'),
      ],
    );
    api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});

    await pumpCoding(tester);

    expect(find.text('Widget names'), findsWidgets);
    expect(find.text('Sample cases'), findsOneWidget);
    expect(find.text('Container Column'), findsOneWidget);
    expect(find.text('2s per case'), findsOneWidget);
    expect(find.text('256 MB'), findsOneWidget);
    // Both allowed languages are offered at once rather than behind a tap.
    expect(find.text('Python'), findsOneWidget);
    expect(find.text('C++'), findsOneWidget);
  });

  testWidgets('the hidden cases never reach the screen', (
    WidgetTester tester,
  ) async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[
        <String, dynamic>{
          ...problem(id: 29, name: 'Widget names', language: 'python'),
          'sample_test_cases': <dynamic>[],
          'ai_generated_meta': <String, dynamic>{
            'test_cases': <dynamic>[
              <String, dynamic>{
                'input': 'Text()',
                'is_sample': true,
                'expected_output': 'Text',
              },
              <String, dynamic>{
                'input': 'SECRET-CASE',
                'is_sample': false,
                'expected_output': 'SECRET-ANSWER',
              },
            ],
          },
        },
      ],
    );
    api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});

    await pumpCoding(tester);

    expect(find.text('Text'), findsOneWidget);
    expect(find.text('SECRET-CASE'), findsNothing);
    expect(find.text('SECRET-ANSWER'), findsNothing);
  });

  testWidgets('Run and Submit stay disabled until there is code', (
    WidgetTester tester,
  ) async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[
        problem(id: 29, name: 'Widget names', language: 'python'),
      ],
    );
    // No starter code from either source, so the editor opens empty.
    api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});

    await pumpCoding(tester);

    for (final String label in <String>['Run', 'Submit']) {
      expect(
        tester
            .widget<AppButton>(find.widgetWithText(AppButton, label))
            .onPressed,
        isNull,
        reason: '$label must not fire against an empty editor',
      );
    }

    await tester.enterText(find.byType(TextField).first, 'print(1)');
    await tester.pump(const Duration(milliseconds: 60));

    expect(
      tester.widget<AppButton>(find.widgetWithText(AppButton, 'Run')).onPressed,
      isNotNull,
    );
  });

  testWidgets('starter code arrives in the editor without clobbering typing', (
    WidgetTester tester,
  ) async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[
        problem(id: 29, name: 'Widget names', language: 'python'),
      ],
    );
    api.on(
      signatureUrl(29),
      status: 200,
      body: <String, dynamic>{'signature': 'def solve(s):\n    pass'},
    );

    await pumpCoding(tester);

    final Finder editor = find.byType(TextField).first;
    expect(
      tester.widget<TextField>(editor).controller!.text,
      'def solve(s):\n    pass',
    );

    await tester.enterText(editor, 'print("mine")');
    await tester.pump(const Duration(milliseconds: 60));

    // Switching language refetches a starter; the learner's code must survive.
    api.on(
      signatureUrl(29),
      status: 200,
      body: <String, dynamic>{'signature': 'int solve() {}'},
    );
    await tester.runAsync(() async {
      await tester.tap(find.text('C++'));
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 120));
    });

    expect(tester.widget<TextField>(editor).controller!.text, 'print("mine")');
  });

  testWidgets('a run reports each case', (WidgetTester tester) async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[
        problem(
          id: 29,
          name: 'Widget names',
          language: 'python',
          signature: 'def solve(s): pass',
        ),
      ],
    );
    api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});
    api.on(
      runUrl(29),
      status: 200,
      body: <String, dynamic>{
        'results': <dynamic>[
          <String, dynamic>{'passed': true},
          <String, dynamic>{
            'passed': false,
            'expected_output': 'Text',
            'actual_output': 'Widget',
          },
        ],
      },
    );

    await pumpCoding(tester);

    await tester.runAsync(() async {
      await tester.tap(find.widgetWithText(AppButton, 'Run'));
      await Future<void>.delayed(const Duration(milliseconds: 80));
      await tester.pump(const Duration(milliseconds: 120));
      await tester.pump(const Duration(milliseconds: 300));
    });

    expect(find.text('1 of 2 cases passed'), findsOneWidget);
    expect(find.text('Passed'), findsOneWidget);
    expect(find.text('Failed'), findsOneWidget);
    // Only the failure is unpacked — a pass is one line.
    expect(find.text('Your output'), findsOneWidget);
    expect(find.text('Widget'), findsOneWidget);
  });

  testWidgets('several problems become tabs that keep their own code', (
    WidgetTester tester,
  ) async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[
        problem(id: 29, name: 'Widget names', language: 'python'),
        problem(id: 30, name: 'Format a list', language: 'cpp', order: 2),
      ],
    );
    api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});
    api.on(signatureUrl(30), status: 200, body: <String, dynamic>{});

    await pumpCoding(tester);

    expect(find.text('Problem 1 of 2'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'first');
    await tester.pump(const Duration(milliseconds: 60));

    await tester.runAsync(() async {
      await tester.tap(find.byKey(const ValueKey<int>(30)));
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 200));
    });

    expect(find.text('Problem 2 of 2'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      isEmpty,
      reason: 'the second problem has its own editor',
    );

    await tester.runAsync(() async {
      await tester.tap(find.byKey(const ValueKey<int>(29)));
      await Future<void>.delayed(const Duration(milliseconds: 60));
      await tester.pump(const Duration(milliseconds: 200));
    });

    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      'first',
      reason: 'coming back to a problem must not lose what was typed',
    );
  });

  testWidgets('a locked node says so instead of showing an error', (
    WidgetTester tester,
  ) async {
    api.on(
      questionsUrl,
      status: 403,
      body: <String, dynamic>{'detail': 'Locked'},
    );

    await pumpCoding(tester);

    expect(find.text('Lesson locked'), findsOneWidget);
  });
}
