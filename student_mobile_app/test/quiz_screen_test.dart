// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Taking a quiz: the navigation rules and the controls.
//
// The screen is a strip of numbers over one question at a time. Three rules do
// all the work and are easy to break by accident:
//
//  * a number opens only once the question before it is answered, so the strip
//    fills left to right and nothing is skipped;
//  * the button is Next until the last question and Submit there, and each is
//    enabled only when it should be;
//  * the option control is a radio when one answer is wanted and a checkbox
//    when several are — the only hint the learner gets before tapping.

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

  final String nodeUrl = ApiEndPoints.node(
    orgId,
    '$courseId',
    '$moduleId',
    '$nodeId',
  );

  Map<String, dynamic> question({
    required int id,
    required String text,
    bool multiple = false,
  }) => <String, dynamic>{
    'id': id,
    'question_text': text,
    'allow_multiple_correct': multiple,
    'options': <dynamic>[
      <String, dynamic>{'id': id * 10 + 1, 'option_text': 'First'},
      <String, dynamic>{'id': id * 10 + 2, 'option_text': 'Second'},
    ],
  };

  void serveQuiz({int? timerMinutes, List<Map<String, dynamic>>? questions}) =>
      api.on(
        nodeUrl,
        status: 200,
        body: <String, dynamic>{
          'id': nodeId,
          'module': moduleId,
          'title': 'Quiz for flutter dev',
          'quizzes': <dynamic>[
            <String, dynamic>{
              'id': 84,
              'name': 'Quiz for flutter dev',
              'timer_minutes': timerMinutes,
              'pass_percentage': 80,
              'must_pass_to_continue': true,
              'questions':
                  questions ??
                  <Map<String, dynamic>>[
                    question(id: 1, text: 'First question'),
                    question(id: 2, text: 'Second question'),
                    question(id: 3, text: 'Third question', multiple: true),
                  ],
            },
          ],
        },
      );

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_quiz_ui_');
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

  Future<QuizViewModel> loaded() async {
    final QuizViewModel vm = QuizViewModel(
      orgId: orgId,
      courseId: courseId,
      moduleId: moduleId,
      nodeId: nodeId,
    );
    await vm.load();
    return vm;
  }

  /// Answers the question at [index] with its first option.
  void answer(QuizViewModel vm, int index) => vm.pick(
    vm.quiz!.questions[index],
    vm.quiz!.questions[index].options.first.id,
  );

  group('moving between questions', () {
    test('the first is always open, the rest wait their turn', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      expect(vm.canJumpTo(0), isTrue);
      expect(vm.canJumpTo(1), isFalse);
      expect(vm.canJumpTo(2), isFalse);
    });

    test('answering one opens the next, and only the next', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      answer(vm, 0);

      expect(vm.canJumpTo(1), isTrue);
      expect(
        vm.canJumpTo(2),
        isFalse,
        reason: 'the strip fills left to right; nothing is skipped',
      );
    });

    test('a locked number does not move the learner', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      vm.goTo(2);

      expect(vm.index, 0, reason: 'goTo enforces the rule, not just the UI');
    });

    test('going back is always allowed', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      answer(vm, 0);
      vm.next();
      answer(vm, 1);
      vm.next();
      expect(vm.index, 2);

      vm.goTo(0);
      expect(vm.index, 0);
    });
  });

  group('when the buttons work', () {
    test('Next needs the current question answered', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      expect(vm.isCurrentAnswered, isFalse);
      answer(vm, 0);
      expect(vm.isCurrentAnswered, isTrue);
    });

    test('Submit needs every question answered', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      answer(vm, 0);
      answer(vm, 1);
      expect(vm.allAnswered, isFalse);

      answer(vm, 2);
      expect(vm.allAnswered, isTrue);
    });

    test('an empty quiz is not "all answered"', () async {
      serveQuiz(questions: <Map<String, dynamic>>[]);
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      expect(vm.total, 0);
      expect(vm.allAnswered, isFalse);
    });
  });

  group('picking', () {
    test('a single-answer question replaces the pick', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      final QuizQuestion q = vm.quiz!.questions[0];
      vm.pick(q, q.options[0].id);
      vm.pick(q, q.options[1].id);

      expect(vm.isPicked(q.id, q.options[0].id), isFalse);
      expect(vm.isPicked(q.id, q.options[1].id), isTrue);
    });

    test('a multi-answer question accumulates and toggles off', () async {
      serveQuiz();
      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);

      final QuizQuestion q = vm.quiz!.questions[2];
      expect(q.allowMultipleCorrect, isTrue);

      vm.pick(q, q.options[0].id);
      vm.pick(q, q.options[1].id);
      expect(vm.isPicked(q.id, q.options[0].id), isTrue);
      expect(vm.isPicked(q.id, q.options[1].id), isTrue);

      vm.pick(q, q.options[0].id);
      expect(vm.isPicked(q.id, q.options[0].id), isFalse);
    });
  });

  test('a timed quiz submits what it has, not what it wanted', () async {
    // The clock overrides the "answer everything" rule: whatever is there goes
    // in. This exercises the same submit path the expiry uses.
    serveQuiz(timerMinutes: 3);
    api.on(
      ApiEndPoints.submitQuiz('84'),
      status: 200,
      body: <String, dynamic>{'id': 1, 'score': 33.0, 'passed': false},
    );

    final QuizViewModel vm = await loaded();
    addTearDown(vm.dispose);
    expect(vm.remaining, const Duration(minutes: 3));

    answer(vm, 0);
    expect(await vm.submit(), isTrue);

    final Map<String, dynamic> sent =
        api.requestFor(ApiEndPoints.submitQuiz('84'))!.data
            as Map<String, dynamic>;
    expect(
      (sent['answers'] as List<dynamic>).length,
      1,
      reason: 'blank questions are simply absent, not sent empty',
    );
    expect(vm.result, isNotNull);
  });

  group('the clock running out', () {
    test('an untouched quiz is not submitted at all', () async {
      // An empty attempt is not neutral: it spends one of the learner's tries
      // and records a zero on a quiz they never started — most often because
      // they opened it, were called away, and came back to a dead screen.
      serveQuiz(timerMinutes: 5);
      api.on(
        ApiEndPoints.submitQuiz('84'),
        status: 200,
        body: <String, dynamic>{'id': 1, 'score': 0.0, 'passed': false},
      );

      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);
      vm.onTimeUp();

      expect(vm.expired, isTrue);
      expect(vm.expiredUnanswered, isTrue);
      expect(
        api.hit(ApiEndPoints.submitQuiz('84')),
        isFalse,
        reason: 'there was nothing to grade',
      );
      expect(vm.result, isNull, reason: 'so there is no result to open');
    });

    test('one answer is enough for it to go in', () async {
      serveQuiz(timerMinutes: 5);
      api.on(
        ApiEndPoints.submitQuiz('84'),
        status: 200,
        body: <String, dynamic>{'id': 1, 'score': 33.0, 'passed': false},
      );

      final QuizViewModel vm = await loaded();
      addTearDown(vm.dispose);
      answer(vm, 0);
      vm.onTimeUp();

      // The submit is fired and not awaited, so give it a turn.
      for (int i = 0; i < 50 && vm.result == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 1));
      }

      expect(vm.expired, isTrue);
      expect(vm.expiredUnanswered, isFalse);
      expect(api.hit(ApiEndPoints.submitQuiz('84')), isTrue);
      expect(vm.result, isNotNull);
    });
  });

  // ── The screen ───────────────────────────────────────────────────────────

  Future<void> pumpQuiz(WidgetTester tester) async {
    tester.view.physicalSize = const Size(420, 1600);
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
            home: const QuizScreen(
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

  AppButton buttonNamed(WidgetTester tester, String label) =>
      tester.widget<AppButton>(find.widgetWithText(AppButton, label));

  /// Whether each option's control is drawn as a circle — a radio — rather
  /// than a rounded square.
  ///
  /// Measured as "radius is half the box", not against a literal number:
  /// [ChoiceIndicator] never uses `BoxShape.circle` (see its doc comment), so
  /// the geometry is the only thing that says which control it is, and the
  /// exact checkbox radius is a styling choice a test should not pin.
  Set<bool> indicatorsAreCircles(WidgetTester tester) => tester
      .widgetList<ChoiceIndicator>(find.byType(ChoiceIndicator))
      .map((ChoiceIndicator indicator) {
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
      })
      .toSet();

  testWidgets('the strip numbers every question and marks the current one', (
    WidgetTester tester,
  ) async {
    serveQuiz();
    await pumpQuiz(tester);

    expect(find.text('Question 1 of 3'), findsOneWidget);
    expect(find.text('First question'), findsOneWidget);
    for (final String n in <String>['1', '2', '3']) {
      expect(find.text(n), findsOneWidget);
    }
    // The old UI's escape hatch is gone.
    expect(find.text('All questions'), findsNothing);
  });

  testWidgets('Previous is dead on the first question', (
    WidgetTester tester,
  ) async {
    serveQuiz();
    await pumpQuiz(tester);

    expect(buttonNamed(tester, 'Previous').onPressed, isNull);
    expect(
      buttonNamed(tester, 'Next').onPressed,
      isNull,
      reason: 'nothing is answered yet',
    );
  });

  testWidgets('answering opens Next, and Next moves on', (
    WidgetTester tester,
  ) async {
    serveQuiz();
    await pumpQuiz(tester);

    await tester.tap(find.text('First'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(buttonNamed(tester, 'Next').onPressed, isNotNull);

    await tester.tap(find.widgetWithText(AppButton, 'Next'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Question 2 of 3'), findsOneWidget);
    expect(buttonNamed(tester, 'Previous').onPressed, isNotNull);
  });

  testWidgets('a single-answer question draws radios, a multi draws boxes', (
    WidgetTester tester,
  ) async {
    serveQuiz(
      questions: <Map<String, dynamic>>[
        question(id: 1, text: 'Pick one'),
        question(id: 2, text: 'Pick several', multiple: true),
      ],
    );
    await pumpQuiz(tester);

    expect(indicatorsAreCircles(tester), <bool>{
      true,
    }, reason: 'one answer wanted, so radios');

    await tester.tap(find.text('First'));
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(find.widgetWithText(AppButton, 'Next'));
    // Past the 180ms indicator tween, so the radius has finished moving.
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Pick several'), findsOneWidget);
    expect(indicatorsAreCircles(tester), <bool>{
      false,
    }, reason: 'a multi-answer question must not offer radios');
  });

  testWidgets('crossing the radio/checkbox boundary mid-tween is safe', (
    WidgetTester tester,
  ) async {
    // `BoxDecoration.lerp` between a circle and a rounded rectangle yields a
    // circle *with* a border radius, which asserts. Stopping mid-tween is what
    // used to trigger it.
    serveQuiz(
      questions: <Map<String, dynamic>>[
        question(id: 1, text: 'Pick one'),
        question(id: 2, text: 'Pick several', multiple: true),
        question(id: 3, text: 'Pick one again'),
      ],
    );
    await pumpQuiz(tester);

    for (int i = 0; i < 2; i++) {
      await tester.tap(find.text('First'));
      await tester.pump(const Duration(milliseconds: 250));
      await tester.tap(find.widgetWithText(AppButton, 'Next'));
      await tester.pump(const Duration(milliseconds: 90));
      await tester.pump(const Duration(milliseconds: 200));
    }

    expect(tester.takeException(), isNull);
    expect(find.text('Pick one again'), findsOneWidget);
  });

  testWidgets('the strip jumps to an open question and refuses a locked one', (
    WidgetTester tester,
  ) async {
    serveQuiz();
    await pumpQuiz(tester);

    // Question 3 is two steps away and its predecessor is blank.
    await tester.tap(find.text('3'));
    await tester.pump(const Duration(milliseconds: 250));
    expect(find.text('Question 1 of 3'), findsOneWidget);

    await tester.tap(find.text('First'));
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(find.text('2'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Question 2 of 3'), findsOneWidget);
  });

  testWidgets('the last question asks to confirm before submitting', (
    WidgetTester tester,
  ) async {
    serveQuiz(
      questions: <Map<String, dynamic>>[question(id: 1, text: 'Only one')],
    );
    await pumpQuiz(tester);

    expect(buttonNamed(tester, 'Submit quiz').onPressed, isNull);

    await tester.tap(find.text('First'));
    await tester.pump(const Duration(milliseconds: 250));
    expect(buttonNamed(tester, 'Submit quiz').onPressed, isNotNull);

    await tester.tap(find.widgetWithText(AppButton, 'Submit quiz'));
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Submit this quiz?'), findsOneWidget);
    expect(
      api.hit(ApiEndPoints.submitQuiz('84')),
      isFalse,
      reason: 'nothing is sent until the learner confirms',
    );
  });

  group('nothing to show', () {
    // `current` used to be `_quiz!.questions[_index]`, safe only because the
    // screen returned early on `total == 0` first. The guarantee lived in the
    // caller, which is one refactor away from a crash on a learner's device.
    test('a quiz that never loaded has no current question', () {
      final QuizViewModel vm = QuizViewModel(
        orgId: 1,
        courseId: 1,
        moduleId: 1,
        nodeId: 1,
      );
      addTearDown(vm.dispose);

      expect(vm.current, isNull);
      expect(vm.total, 0);
      expect(vm.isAnswered(0), isFalse, reason: 'not a RangeError');
      expect(vm.isAnswered(-1), isFalse);
      expect(vm.isAnswered(99), isFalse);
      expect(vm.allAnswered, isFalse);
      expect(vm.isCurrentAnswered, isFalse);
      expect(vm.canJumpTo(0), isFalse);
    });
  });

  testWidgets('the strip scrolls the current number into view', (
    WidgetTester tester,
  ) async {
    // Only about nine dots fit across a phone. Answering past that used to
    // leave the strip showing 1-9 while the learner was on 10 — the one piece
    // of UI whose job is saying where they are.
    serveQuiz(
      questions: <Map<String, dynamic>>[
        for (int i = 1; i <= 13; i++) question(id: i, text: 'Question $i'),
      ],
    );
    await pumpQuiz(tester);

    final Finder strip = find.byType(SingleChildScrollView).first;
    expect(
      tester.widget<SingleChildScrollView>(strip).scrollDirection,
      Axis.horizontal,
    );

    double offset() => tester
        .state<ScrollableState>(
          find.descendant(of: strip, matching: find.byType(Scrollable)),
        )
        .position
        .pixels;

    expect(offset(), 0, reason: 'question one is already in view');

    // Answer and advance ten times, the way a learner would.
    for (int i = 0; i < 10; i++) {
      await tester.tap(find.text('First').first);
      await tester.pump();
      await tester.tap(find.text('Next'));
      await tester.pump(const Duration(milliseconds: 500));
    }

    expect(
      offset(),
      greaterThan(0),
      reason: 'the strip followed the learner down the quiz',
    );

    // And the number they are on is genuinely on screen, not merely scrolled
    // somewhere near it.
    final Finder eleven = find.text('11');
    expect(eleven, findsOneWidget);
    final Rect dot = tester.getRect(eleven);
    final Rect view = tester.getRect(strip);
    expect(dot.left, greaterThanOrEqualTo(view.left - 0.5));
    expect(dot.right, lessThanOrEqualTo(view.right + 0.5));
  });
}
