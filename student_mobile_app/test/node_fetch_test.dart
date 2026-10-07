// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Quiz and quiz result fetch by id.
//
// These screens used to be handed a `Quiz` and a `{quiz, result}` map through
// `extra`. That made them undeep-linkable, unable
// to survive a reload, and liable to render whatever the previous screen
// happened to be holding. They now take the ids of the node and call for
// themselves; these tests pin that they really do call, and what they read.

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
  const int quizNodeId = 2032;

  String nodeUrl(int nodeId) =>
      ApiEndPoints.node(orgId, '$courseId', '$moduleId', '$nodeId');

  Map<String, dynamic> quizBody({List<int> picked = const <int>[]}) =>
      <String, dynamic>{
        'id': 84,
        'name': 'Quiz for flutter dev',
        'timer_minutes': 3,
        'pass_percentage': 80,
        'must_pass_to_continue': true,
        'questions': <dynamic>[
          <String, dynamic>{
            'id': 185,
            'question_text': 'Which one?',
            'allow_multiple_correct': false,
            'options': <dynamic>[
              <String, dynamic>{'id': 735, 'option_text': 'Right'},
              <String, dynamic>{'id': 736, 'option_text': 'Wrong'},
            ],
            'selected_options': picked,
          },
        ],
      };

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_node_fetch_');
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

  setUp(() => api.reset());

  group('the quiz screen fetches its quiz', () {
    QuizViewModel makeVm() => QuizViewModel(
      orgId: orgId,
      courseId: courseId,
      moduleId: moduleId,
      nodeId: quizNodeId,
    );

    test(
      'reads it off the node endpoint, not off a handed-over model',
      () async {
        api.on(
          nodeUrl(quizNodeId),
          status: 200,
          body: <String, dynamic>{
            'id': quizNodeId,
            'module': moduleId,
            'title': 'Quiz for flutter dev',
            'quizzes': <dynamic>[quizBody()],
          },
        );

        final QuizViewModel vm = makeVm();
        await vm.load();
        addTearDown(vm.dispose);

        expect(api.hit(nodeUrl(quizNodeId)), isTrue);
        expect(vm.quiz?.name, 'Quiz for flutter dev');
        expect(vm.total, 1);
        expect(vm.quiz?.passPercentage, 80);
      },
    );

    test('a timed quiz starts its clock on load', () async {
      api.on(
        nodeUrl(quizNodeId),
        status: 200,
        body: <String, dynamic>{
          'id': quizNodeId,
          'module': moduleId,
          'quizzes': <dynamic>[quizBody()],
        },
      );

      final QuizViewModel vm = makeVm();
      await vm.load();
      addTearDown(vm.dispose);

      expect(vm.remaining, const Duration(minutes: 3));
    });

    test('a 403 is a lock, not an error', () async {
      api.on(
        nodeUrl(quizNodeId),
        status: 403,
        body: <String, dynamic>{'detail': 'Locked'},
      );

      final QuizViewModel vm = makeVm();
      await vm.load();
      addTearDown(vm.dispose);

      expect(vm.isLocked, isTrue);
      expect(vm.state, ViewState.success);
      expect(vm.quiz, isNull);
    });

    test('a node with no quiz is empty, not broken', () async {
      api.on(
        nodeUrl(quizNodeId),
        status: 200,
        body: <String, dynamic>{
          'id': quizNodeId,
          'module': moduleId,
          'quizzes': <dynamic>[],
        },
      );

      final QuizViewModel vm = makeVm();
      await vm.load();
      addTearDown(vm.dispose);

      expect(vm.hasNoQuiz, isTrue);
      expect(vm.total, 0);
    });

    test('a failure is retryable', () async {
      api.on(
        nodeUrl(quizNodeId),
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
      );

      final QuizViewModel vm = makeVm();
      await vm.load();
      addTearDown(vm.dispose);
      expect(vm.state, ViewState.error);

      api.on(
        nodeUrl(quizNodeId),
        status: 200,
        body: <String, dynamic>{
          'id': quizNodeId,
          'module': moduleId,
          'quizzes': <dynamic>[quizBody()],
        },
      );
      await vm.load();
      expect(vm.quiz, isNotNull);
    });
  });

  group('the quiz result rebuilds from the roadmap', () {
    // `progress` is absent from the OpenAPI `Node` schema — `quiz_score` lives
    // on the roadmap's copy of a node and nowhere else — so this is the one
    // screen that cannot read the node endpoint.
    Map<String, dynamic> roadmapBody({double? score}) => <String, dynamic>{
      'id': courseId,
      'title': 'Flutter course',
      'modules': <dynamic>[
        <String, dynamic>{
          'id': moduleId,
          'title': 'Beginner',
          'sequence_order': 1,
          'nodes': <dynamic>[
            <String, dynamic>{
              'id': quizNodeId,
              'module': moduleId,
              'title': 'Quiz for flutter dev',
              'has_quiz': true,
              'quizzes': <dynamic>[
                quizBody(picked: <int>[735]),
              ],
              'progress': score == null
                  ? null
                  : <String, dynamic>{
                      'status': 'Completed',
                      'quiz_score': score,
                    },
              'is_completed': score != null,
              'is_accessible': true,
            },
          ],
          'is_accessible': true,
        },
      ],
    };

    QuizResultViewModel makeVm() => QuizResultViewModel(
      orgId: orgId,
      courseId: courseId,
      nodeId: quizNodeId,
    );

    test(
      'takes the score from progress and the answers from the quiz',
      () async {
        api.on(
          ApiEndPoints.roadmap(orgId, '$courseId'),
          status: 200,
          body: roadmapBody(score: 100),
        );

        final QuizResultViewModel vm = makeVm();
        await vm.load();

        final QuizOutcome outcome = vm.outcome!;
        expect(outcome.score, 100);
        expect(outcome.passed, isTrue);
        expect(outcome.quiz.name, 'Quiz for flutter dev');
        expect(
          outcome.submittedAnswers[185],
          <int>[735],
          reason:
              'the roadmap persists selected_options, so the review survives',
        );
        expect(
          outcome.correctCount,
          isNull,
          reason: 'counting correct answers would mean reading is_correct',
        );
      },
    );

    test('a score under the pass mark is a failure', () async {
      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 200,
        body: roadmapBody(score: 50),
      );

      final QuizResultViewModel vm = makeVm();
      await vm.load();

      expect(vm.outcome!.passed, isFalse);
    });

    test('no recorded attempt is an empty state, not an error', () async {
      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 200,
        body: roadmapBody(),
      );

      final QuizResultViewModel vm = makeVm();
      await vm.load();

      expect(vm.hasNoAttempt, isTrue);
      expect(vm.state, ViewState.success);
    });

    test('a failure is retryable', () async {
      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
      );

      final QuizResultViewModel vm = makeVm();
      await vm.load();
      expect(vm.state, ViewState.error);

      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 200,
        body: roadmapBody(score: 100),
      );
      await vm.load();
      expect(vm.outcome, isNotNull);
    });
  });

  test('every node route is addressable by ids alone', () {
    // The point of the refactor: each path carries everything the screen needs
    // to fetch, so it can be deep-linked and reloaded.
    for (final String path in <String>[
      AppRoutePaths.task,
      AppRoutePaths.quiz,
      AppRoutePaths.quizResult,
      AppRoutePaths.coding,
    ]) {
      expect(path, contains(':courseId'));
      expect(path, contains(':moduleId'));
      expect(path, contains(':nodeId'));
    }
  });
}
