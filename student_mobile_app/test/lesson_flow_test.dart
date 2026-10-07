// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The core learning loop: the roadmap's lock rules and auto-complete.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

/// Lets a fired-and-forgotten async call finish. The completion request goes
/// through the fake adapter, so a bare microtask yield is not enough.
Future<void> _settle() =>
    Future<void>.delayed(const Duration(milliseconds: 50));

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_lesson_');
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

  group('roadmap', () {
    // api/examples/13-course-roadmap.json, trimmed to the shape that matters.
    Roadmap build() => Roadmap.fromJson(<String, dynamic>{
      'id': 1,
      'title': 'Python Fundamentals',
      'is_completed': false,
      'modules': <dynamic>[
        <String, dynamic>{
          'id': 1,
          'title': 'Getting Started',
          'sequence_order': 1,
          'is_accessible': true,
          'nodes': <dynamic>[
            <String, dynamic>{
              'id': 1,
              'module': 1,
              'title': 'Introduction to Python',
              'has_learning_material': true,
              'is_completed': true,
              'is_accessible': true,
            },
            <String, dynamic>{
              'id': 2,
              'module': 1,
              'title': 'Installing Python',
              'prerequisite_node': 1,
              'has_learning_material': true,
              'is_completed': false,
              'is_accessible': true,
            },
            <String, dynamic>{
              'id': 3,
              'module': 1,
              'title': 'Quiz: Python Basics',
              'prerequisite_node': 2,
              'has_quiz': true,
              'is_completed': false,
              'is_accessible': false,
            },
          ],
        },
      ],
    });

    test('the current lesson is the first open, unfinished one', () {
      expect(build().currentNode?.id, 2);
    });

    test('counts completion across every module', () {
      final Roadmap r = build();
      expect(r.totalNodes, 3);
      expect(r.completedNodes, 1);
      expect(r.completionPercentage, closeTo(33.3, 0.1));
    });

    test('names the lesson blocking a locked one', () {
      final Roadmap r = build();
      final RoadmapNode locked = r.nodeById(3)!;
      expect(locked.isLocked, isTrue);
      expect(r.blockerFor(locked)?.title, 'Installing Python');
    });

    test('classifies a row by what it opens', () {
      final Roadmap r = build();
      expect(r.nodeById(1)!.kind, LessonKind.lesson);
      expect(r.nodeById(3)!.kind, LessonKind.quiz);
    });
  });

  group('lesson auto-complete', () {
    LessonViewModel model() =>
        LessonViewModel(orgId: 2, courseId: 1, moduleId: 1, nodeId: 1);

    test('fires at 90% watched, not before', () async {
      api.on(
        ApiEndPoints.completeNode('1'),
        status: 200,
        body: <String, dynamic>{'message': 'Node marked as completed.'},
      );

      final LessonViewModel vm = model();
      vm.onVideoProgress(0.5);
      await _settle();
      expect(api.hit(ApiEndPoints.completeNode('1')), isFalse);

      vm.onVideoProgress(0.91);
      await _settle();
      expect(api.hit(ApiEndPoints.completeNode('1')), isTrue);
      expect(vm.isCompleted, isTrue);
    });

    test('completing twice only calls the backend once', () async {
      api.on(
        ApiEndPoints.completeNode('1'),
        status: 200,
        body: <String, dynamic>{'message': 'ok'},
      );

      final LessonViewModel vm = model();
      await vm.complete();
      await vm.complete();

      expect(
        api.requests
            .where(
              (RequestOptions r) => r.path == ApiEndPoints.completeNode('1'),
            )
            .length,
        1,
      );
    });

    test('a 403 renders as locked, not as an error', () async {
      api.on(
        ApiEndPoints.node(2, '1', '1', '1'),
        status: 403,
        body: <String, dynamic>{
          'detail': 'This content is locked. Please complete the previous module first to unlock it.',
        },
      );

      final LessonViewModel vm = model();
      await vm.load();

      expect(vm.isLocked, isTrue);
      expect(
        vm.state,
        ViewState.success,
        reason: 'a locked lesson is a state, not a failure',
      );
    });
  });

  group('courses filtering', () {
    List<Course> courses() => <Course>[
      Course.fromJson(<String, dynamic>{
        'id': 1,
        'title': 'Python Fundamentals',
        'completion_percentage': 0,
        'batches_detail': <dynamic>[
          <String, dynamic>{'id': 1, 'name': 'Python Batch - Oct 2026'},
        ],
      }),
      Course.fromJson(<String, dynamic>{
        'id': 2,
        'title': 'Advanced Django',
        'completion_percentage': 45,
      }),
      Course.fromJson(<String, dynamic>{
        'id': 3,
        'title': 'Git Basics',
        'completion_percentage': 100,
      }),
    ];

    test('buckets by percentage: 0 / 1-99 / 100', () {
      final List<Course> c = courses();
      expect(c[0].isNotStarted, isTrue);
      expect(c[1].isInProgress, isTrue);
      expect(c[2].isCompleted, isTrue);
    });

    test('search matches title and batch name', () {
      final List<Course> c = courses();
      expect(c[0].matches('python'), isTrue);
      expect(
        c[0].matches('Oct 2026'),
        isTrue,
        reason: 'batch name is searchable',
      );
      expect(c[1].matches('python'), isFalse);
    });
  });
}
