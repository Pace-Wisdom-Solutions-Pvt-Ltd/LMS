// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The roadmap: what it parses, and when it calls the node endpoint.
//
// Rows expand in place, and expanding is what fetches a node's detail. The
// rules worth pinning are which nodes need that call at all, that the open row
// is cached so reopening is free, and that a lock (403) is a state rather than
// an error.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const int orgId = 2;
  const int courseId = 1;

  Map<String, dynamic> node({
    required int id,
    int module = 1,
    String title = 'Introduction to Python',
    bool material = false,
    bool task = false,
    bool quiz = false,
    bool assessment = false,
    bool completed = false,
    bool accessible = true,
    int? prerequisite,
    String focusAreas = '',
    String quickOutline = '',
    double? quizScore,
    Object? chapter = 1,
  }) => <String, dynamic>{
    'id': id,
    'module': module,
    'chapter': chapter,
    'title': title,
    'description': 'What Python is and why it is popular.',
    'sequence_order': id,
    'prerequisite_node': prerequisite,
    'drip_delay_days': 0,
    'focus_areas': focusAreas,
    'quick_outline': quickOutline,
    'type': 'item',
    'has_learning_material': material,
    'has_task': task,
    'has_quiz': quiz,
    'has_assessment': assessment,
    'quizzes': quiz
        ? <dynamic>[
            <String, dynamic>{
              'id': 1,
              'name': 'Python Basics Quiz',
              'timer_minutes': 10,
              'pass_percentage': 60,
              'must_pass_to_continue': true,
              'questions': <dynamic>[
                <String, dynamic>{
                  'id': 1,
                  'question_text': 'Which keyword defines a function?',
                  'allow_multiple_correct': false,
                  'options': <dynamic>[
                    <String, dynamic>{'id': 1, 'option_text': 'def'},
                    <String, dynamic>{'id': 2, 'option_text': 'func'},
                  ],
                  'selected_options': <dynamic>[],
                },
              ],
            },
          ]
        : <dynamic>[],
    'progress': completed
        ? <String, dynamic>{
            'status': 'Completed',
            'last_accessed': '2026-09-30T07:05:59.778538Z',
            'quiz_score': quizScore,
          }
        : null,
    'is_completed': completed,
    'is_accessible': accessible,
  };

  Map<String, dynamic> roadmapBody(List<Map<String, dynamic>> nodes) =>
      <String, dynamic>{
        'id': courseId,
        'title': 'Python Fundamentals',
        'description': 'Learn Python from scratch.',
        'is_completed': false,
        'modules': <dynamic>[
          <String, dynamic>{
            'id': 1,
            'title': 'Getting Started',
            'description': 'Set up Python.',
            'sequence_order': 1,
            'chapters': <dynamic>[
              <String, dynamic>{
                'id': 1,
                'title': 'Getting Started - Lessons',
                'sequence_order': 1,
              },
            ],
            'nodes': nodes,
            'is_accessible': true,
          },
        ],
      };

  String nodeUrl(int nodeId, {int module = 1}) =>
      ApiEndPoints.node(orgId, '$courseId', '$module', '$nodeId');

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_roadmap_');
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

  Future<RoadmapViewModel> loaded(List<Map<String, dynamic>> nodes) async {
    api.on(
      ApiEndPoints.roadmap(orgId, '$courseId'),
      status: 200,
      body: roadmapBody(nodes),
    );
    final RoadmapViewModel vm = RoadmapViewModel(
      orgId: orgId,
      courseId: courseId,
    );
    await vm.load();
    return vm;
  }

  group('parsing', () {
    test('reads the flags the expanded row branches on', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
        node(id: 2, task: true, accessible: false),
        node(id: 3, quiz: true, accessible: false),
        node(id: 4, assessment: true, accessible: false),
      ]);

      final Roadmap r = vm.roadmap!;
      expect(r.nodeById(1)!.hasLearningMaterial, isTrue);
      expect(r.nodeById(2)!.hasTask, isTrue);
      expect(r.nodeById(3)!.hasQuiz, isTrue);
      expect(
        r.nodeById(4)!.hasAssessment,
        isTrue,
        reason: 'has_assessment was previously dropped at the model boundary',
      );
    });

    test('carries the quiz in full, so Start needs no second call', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true),
      ]);

      final Quiz quiz = vm.roadmap!.nodeById(1)!.quiz!;
      expect(quiz.name, 'Python Basics Quiz');
      expect(quiz.timerMinutes, 10);
      expect(quiz.mustPassToContinue, isTrue);
      expect(quiz.questions, hasLength(1));
    });

    test('the module heading falls back to its chapter', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
      ]);

      expect(vm.roadmap!.modules.single.heading, 'Getting Started');
    });

    test('progress counts completed nodes against the total', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true, completed: true),
        node(id: 2, material: true),
      ]);

      expect(vm.roadmap!.completedNodes, 1);
      expect(vm.roadmap!.totalNodes, 2);
      expect(vm.roadmap!.completionPercentage, 50);
    });
  });

  group('expanding', () {
    test('only material and tasks call the node endpoint', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true),
        node(id: 2, assessment: true),
      ]);

      for (final int id in <int>[1, 2]) {
        await vm.toggle(vm.roadmap!.nodeById(id)!);
      }

      expect(
        api.requests.where((RequestOptions r) => r.path.contains('/nodes/')),
        isEmpty,
        reason: 'a quiz is already on the roadmap; the rest open elsewhere',
      );
    });

    test('material fetches its detail once and caches it', () async {
      api.on(
        nodeUrl(1),
        status: 200,
        body: <String, dynamic>{
          'id': 1,
          'module': 1,
          'title': 'Introduction to Python',
          'learning_material': <String, dynamic>{
            'id': 1,
            'content_type': 'Video',
            'content_url': 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
          },
          'task': null,
          'quizzes': <dynamic>[],
        },
      );

      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
      ]);
      final RoadmapNode n = vm.roadmap!.nodeById(1)!;

      await vm.toggle(n);
      expect(vm.detailOf(1)?.material?.isVideo, isTrue);
      expect(vm.detailOf(1)?.material?.isYouTube, isTrue);

      await vm.toggle(n); // collapse
      await vm.toggle(n); // reopen

      expect(
        api.requests.where((RequestOptions r) => r.path == nodeUrl(1)).length,
        1,
        reason: 'reopening a row must not refetch what it already has',
      );
    });

    test('only one row stays open', () async {
      api.on(nodeUrl(1), status: 200, body: <String, dynamic>{'id': 1});
      api.on(nodeUrl(2), status: 200, body: <String, dynamic>{'id': 2});

      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
        node(id: 2, material: true),
      ]);

      await vm.toggle(vm.roadmap!.nodeById(1)!);
      expect(vm.isOpen(1), isTrue);

      await vm.toggle(vm.roadmap!.nodeById(2)!);
      expect(vm.isOpen(2), isTrue);
      expect(
        vm.isOpen(1),
        isFalse,
        reason: 'two open videos would compete for audio',
      );
    });

    test('a 403 is a lock state, not an error to render', () async {
      api.on(
        nodeUrl(1),
        status: 403,
        body: <String, dynamic>{'detail': 'Locked'},
      );

      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true, accessible: false),
      ]);

      await vm.toggle(vm.roadmap!.nodeById(1)!);

      expect(vm.detailErrorOf(1), isNull);
      expect(vm.detailOf(1), isNull);
    });

    test('a real failure is reported and can be retried', () async {
      api.on(
        nodeUrl(1),
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
      );

      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
      ]);
      await vm.toggle(vm.roadmap!.nodeById(1)!);

      expect(vm.detailErrorOf(1), isNotNull);

      api.on(nodeUrl(1), status: 200, body: <String, dynamic>{'id': 1});
      await vm.retryDetail(1);

      expect(vm.detailErrorOf(1), isNull);
      expect(vm.detailOf(1), isNotNull);
    });
  });

  group('completing', () {
    test('reloads the roadmap, because it can unlock the next node', () async {
      api.on(
        ApiEndPoints.completeNode('1'),
        status: 200,
        body: <String, dynamic>{'detail': 'done'},
      );

      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
        node(id: 2, material: true, accessible: false, prerequisite: 1),
      ]);

      // The server decides what unlocks, so the reload is the point.
      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 200,
        body: roadmapBody(<Map<String, dynamic>>[
          node(id: 1, material: true, completed: true),
          node(id: 2, material: true, prerequisite: 1),
        ]),
      );

      expect(await vm.complete(1), isTrue);
      expect(vm.roadmap!.nodeById(1)!.isCompleted, isTrue);
      expect(
        vm.roadmap!.nodeById(2)!.isAccessible,
        isTrue,
        reason: 'the unlock comes from the reload, never from a local guess',
      );
    });

    test('an already-complete node is a no-op, not a second call', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true, completed: true),
      ]);

      expect(await vm.complete(1), isFalse);
      expect(api.hit(ApiEndPoints.completeNode('1')), isFalse);
    });
  });

  test('returning from another screen drops the stale detail', () async {
    api.on(
      nodeUrl(1),
      status: 200,
      body: <String, dynamic>{
        'id': 1,
        'module': 1,
        'learning_material': <String, dynamic>{
          'id': 1,
          'content_type': 'PDF',
          'content_file': 'https://s3.test/doc.pdf?X-Amz-Signature=a',
        },
      },
    );

    final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
      node(id: 1, material: true),
    ]);
    await vm.toggle(vm.roadmap!.nodeById(1)!);
    expect(vm.detailOf(1)?.material, isNotNull);

    await vm.refreshAfterReturn(1);

    expect(
      api.requests.where((RequestOptions r) => r.path == nodeUrl(1)).length,
      2,
      reason: 'completion state is exactly what may have changed',
    );
  });

  group('a node being re-read', () {
    test('is locked while in flight and released when it lands', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true),
      ]);

      expect(vm.isRefreshing(1), isFalse);

      final Future<void> refreshing = vm.refreshAfterReturn(1);
      expect(
        vm.isRefreshing(1),
        isTrue,
        reason:
            'marked before the first await, so the row is locked on the '
            'frame the learner lands back on',
      );

      await refreshing;
      expect(vm.isRefreshing(1), isFalse);
    });

    test('is released even when the reload fails', () async {
      // Otherwise the lesson is stuck behind a spinner with no way out but
      // leaving the screen.
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true),
      ]);

      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
      );
      await vm.refreshAfterReturn(1);

      expect(vm.isRefreshing(1), isFalse);
    });

    test('no node id locks nothing', () async {
      // The RouteAware callback knows the screen was uncovered, not what was
      // open.
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true),
      ]);

      await vm.refreshAfterReturn(null);

      expect(vm.isRefreshing(1), isFalse);
      expect(vm.roadmap, isNotNull);
    });
  });

  group('chapters', () {
    /// A module shaped like the real payload: two chapters, nodes split
    /// between them.
    Map<String, dynamic> chapteredBody() => <String, dynamic>{
      'id': courseId,
      'title': 'Flutter course',
      'modules': <dynamic>[
        <String, dynamic>{
          'id': 1,
          'title': 'Beginner',
          'sequence_order': 1,
          'chapters': <dynamic>[
            <String, dynamic>{
              'id': 11,
              'title': 'Chapter 2',
              'description': 'The second one',
              'sequence_order': 2,
            },
            <String, dynamic>{
              'id': 9,
              'title': 'Chapter 1',
              'description': 'Introduction to flutter',
              'sequence_order': 1,
            },
          ],
          'nodes': <dynamic>[
            node(id: 1, material: true, chapter: 9),
            node(id: 2, material: true, chapter: 11),
            node(id: 3, material: true, chapter: 9),
          ],
          'is_accessible': true,
        },
      ],
    };

    Future<RoadmapModule> loadedModule(Map<String, dynamic> body) async {
      api.on(ApiEndPoints.roadmap(orgId, '$courseId'), status: 200, body: body);
      final RoadmapViewModel vm = RoadmapViewModel(
        orgId: orgId,
        courseId: courseId,
      );
      await vm.load();
      return vm.roadmap!.modules.single;
    }

    test(
      'reads the chapter name, description and the node that owns it',
      () async {
        final RoadmapModule m = await loadedModule(chapteredBody());

        expect(m.chapters, hasLength(2));
        expect(
          m.chapters.firstWhere((RoadmapChapter c) => c.id == 9).description,
          'Introduction to flutter',
        );
        expect(m.nodes.first.chapterId, 9);
      },
    );

    test('groups nodes under their chapter, in sequence order', () async {
      final RoadmapModule m = await loadedModule(chapteredBody());
      final List<RoadmapSection> sections = m.sections;

      expect(sections, hasLength(2));
      expect(
        sections.first.chapter?.title,
        'Chapter 1',
        reason: 'sequence_order decides, not the order they were sent',
      );
      expect(sections.first.nodes.map((RoadmapNode n) => n.id), <int>[1, 3]);
      expect(sections.last.nodes.map((RoadmapNode n) => n.id), <int>[2]);
    });

    test('a module with no chapters is one group with no heading', () async {
      final Map<String, dynamic> body = chapteredBody();
      (body['modules'] as List<dynamic>).first['chapters'] = <dynamic>[];

      final RoadmapModule m = await loadedModule(body);
      final List<RoadmapSection> sections = m.sections;

      expect(sections, hasLength(1));
      expect(sections.single.chapter, isNull);
      expect(
        sections.single.nodes,
        hasLength(3),
        reason: 'the chapter ids on the nodes are ignored, not obeyed',
      );
    });

    test('a node whose chapter is missing is still shown', () async {
      // Dropping a lesson because its grouping was wrong would be far worse
      // than showing it outside one.
      final Map<String, dynamic> body = chapteredBody();
      (body['modules'] as List<dynamic>).first['nodes'] = <dynamic>[
        node(id: 1, material: true, chapter: 9),
        node(id: 2, material: true, chapter: null),
        node(id: 3, material: true, chapter: 999),
      ];

      final RoadmapModule m = await loadedModule(body);
      final List<RoadmapSection> sections = m.sections;

      expect(sections.last.chapter, isNull);
      expect(sections.last.nodes.map((RoadmapNode n) => n.id), <int>[2, 3]);
      expect(
        sections.fold<int>(0, (int n, RoadmapSection s) => n + s.nodes.length),
        3,
        reason: 'every node reaches the screen, grouped or not',
      );
    });

    test('an empty chapter gets no heading of its own', () async {
      final Map<String, dynamic> body = chapteredBody();
      (body['modules'] as List<dynamic>).first['nodes'] = <dynamic>[
        node(id: 1, material: true, chapter: 9),
      ];

      final RoadmapModule m = await loadedModule(body);
      expect(m.sections, hasLength(1));
      expect(m.sections.single.chapter?.id, 9);
    });
  });

  group('folding', () {
    test('everything starts open and toggles independently', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true),
      ]);

      expect(vm.isModuleCollapsed(1), isFalse, reason: 'open until closed');
      expect(vm.isChapterCollapsed(9), isFalse);

      vm.toggleModule(1);
      expect(vm.isModuleCollapsed(1), isTrue);
      expect(
        vm.isChapterCollapsed(9),
        isFalse,
        reason: 'a module and a chapter fold separately',
      );

      vm.toggleModule(1);
      expect(vm.isModuleCollapsed(1), isFalse);
    });
  });

  test('a task row costs no node request at all', () async {
    // `has_task` is enough to draw the button, and the task screen fetches
    // what it needs — so expanding a task row used to spend a whole request
    // deciding whether to render one.
    final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
      node(id: 1, task: true),
    ]);

    await vm.toggle(vm.roadmap!.nodeById(1)!);

    expect(vm.roadmap!.nodeById(1)!.needsDetail, isFalse);
    expect(api.hit(nodeUrl(1)), isFalse);
  });

  group('fields the models were dropping', () {
    test('focus areas and quick outline are read off the roadmap', () async {
      // Both ride on the roadmap payload, so a quiz row — which never calls
      // the node endpoint — can still show them.
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(
          id: 1,
          quiz: true,
          focusAreas: 'Loops and ranges',
          quickOutline: 'Ten minutes, two examples',
        ),
      ]);

      final RoadmapNode n = vm.roadmap!.nodeById(1)!;
      expect(n.focusAreas, 'Loops and ranges');
      expect(n.quickOutline, 'Ten minutes, two examples');
      expect(n.hasNotes, isTrue);
    });

    test('one of the two is enough to show the block', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, material: true, focusAreas: 'Loops and ranges'),
        node(id: 2, material: true, quickOutline: 'Two examples'),
        node(id: 3, material: true),
      ]);

      expect(vm.roadmap!.nodeById(1)!.hasNotes, isTrue);
      expect(vm.roadmap!.nodeById(2)!.hasNotes, isTrue);
      expect(
        vm.roadmap!.nodeById(3)!.hasNotes,
        isFalse,
        reason: 'neither field set means no container at all',
      );
    });

    test('a module the learner has not reached has no nodes at all', () async {
      api.on(
        ApiEndPoints.roadmap(orgId, '$courseId'),
        status: 200,
        body: <String, dynamic>{
          'id': courseId,
          'title': 'Flutter course',
          'modules': <dynamic>[
            <String, dynamic>{
              'id': 1,
              'title': 'Beginner',
              'sequence_order': 1,
              'chapters': <dynamic>[],
              'nodes': <dynamic>[node(id: 1, material: true)],
              'is_accessible': true,
            },
            <String, dynamic>{
              'id': 2,
              'title': 'Intermediate',
              'sequence_order': 2,
              'chapters': <dynamic>[
                <String, dynamic>{
                  'id': 10,
                  'title': 'Chapter',
                  'sequence_order': 1,
                },
              ],
              'nodes': <dynamic>[],
              'is_accessible': false,
            },
          ],
        },
      );

      final RoadmapViewModel vm = RoadmapViewModel(
        orgId: orgId,
        courseId: courseId,
      );
      await vm.load();

      final RoadmapModule locked = vm.roadmap!.modules.last;
      expect(locked.nodes, isEmpty);
      expect(
        locked.isAccessible,
        isFalse,
        reason: 'the section needs this to say "locked" rather than nothing',
      );
      // An empty module must not drag the percentage down: it contributes no
      // nodes to either side of the fraction.
      expect(vm.roadmap!.totalNodes, 1);
    });
  });

  group('a finished quiz carries its score', () {
    test('quiz_score is read off progress', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true, completed: true, quizScore: 100),
      ]);

      final RoadmapNode n = vm.roadmap!.nodeById(1)!;
      expect(n.progress?.status, 'Completed');
      expect(n.quizScore, 100);
      expect(n.passedQuiz, isTrue, reason: 'the fixture quiz asks for 60%');
    });

    test('a score under the quiz\'s own pass mark is not a pass', () async {
      final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
        node(id: 1, quiz: true, completed: true, quizScore: 40),
      ]);

      expect(vm.roadmap!.nodeById(1)!.passedQuiz, isFalse);
    });

    test(
      'an untaken quiz has no score, and neither does anything else',
      () async {
        final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
          node(id: 1, quiz: true),
          node(id: 2, material: true, completed: true),
        ]);

        expect(vm.roadmap!.nodeById(1)!.quizScore, isNull);
        expect(vm.roadmap!.nodeById(1)!.passedQuiz, isFalse);
        expect(
          vm.roadmap!.nodeById(2)!.quizScore,
          isNull,
          reason: 'quiz_score is null on every node that is not a quiz',
        );
        expect(vm.roadmap!.nodeById(2)!.progress?.status, 'Completed');
      },
    );
  });

  test('a node assessment offers nothing to open', () async {
    // `has_assessment` is a roadmap-only flag with no payload anywhere behind
    // it — no assessment object, no id, and it has never been true, so the
    // row says the work happens elsewhere rather than opening something.
    final RoadmapViewModel vm = await loaded(<Map<String, dynamic>>[
      node(id: 1, assessment: true),
    ]);

    final RoadmapNode n = vm.roadmap!.nodeById(1)!;
    expect(n.hasAssessment, isTrue, reason: 'still parsed, so a flip shows up');
    expect(n.opensElsewhere, isTrue);

    await vm.toggle(n);
    expect(
      api.requests.where((RequestOptions r) => r.path.contains('/nodes/')),
      isEmpty,
      reason: 'there is no node detail worth fetching for it',
    );
  });

  group('the task flags the API actually sends', () {
    test('allow_code_block is what enables the code box', () async {
      // There is no `allow_code` in the schema. Reading only that name meant
      // a task permitting code alongside anything else offered no code input.
      final TaskDetail task = TaskDetail.fromJson(<String, dynamic>{
        'id': 19,
        'title': 'Task 1',
        'allow_link': true,
        'allow_paragraph': true,
        'allow_pdf': true,
        'allow_screenshot': true,
        'allow_code_block': true,
        'allow_file': true,
      });

      expect(task.hasNoStatedInputs, isFalse);
      expect(task.allowCode, isTrue);
      expect(task.offersCode, isTrue);
      expect(task.offersLink, isTrue);
      expect(task.offersParagraph, isTrue);
      expect(task.offersFile, isTrue);
    });

    test(
      'allow_pdf or allow_screenshot alone still offers the file picker',
      () {
        final TaskDetail task = TaskDetail.fromJson(<String, dynamic>{
          'id': 1,
          'allow_screenshot': true,
        });

        expect(task.offersFile, isTrue);
        expect(
          task.offersCode,
          isFalse,
          reason: 'a stated input list means the others are not on offer',
        );
      },
    );

    test('the trainer attachment is read, so the brief is reachable', () {
      final TaskDetail task = TaskDetail.fromJson(<String, dynamic>{
        'id': 19,
        'attachment':
            'https://dev-lms-poc.s3.amazonaws.com/media/orgs/x/book.jpg'
            '?X-Amz-Signature=abc',
      });

      expect(task.hasAttachment, isTrue);
      expect(task.attachment, contains('book.jpg'));
    });

    test('a task with no flags at all still shows a form', () {
      final TaskDetail task = TaskDetail.fromJson(<String, dynamic>{'id': 1});
      expect(task.hasNoStatedInputs, isTrue);
      expect(task.offersCode, isTrue);
      expect(task.offersFile, isTrue);
    });
  });
}
