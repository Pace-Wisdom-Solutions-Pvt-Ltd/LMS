// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Coding practice: the models, the content-type rules, and the submit/poll loop.
//
// This is the least-verified area in the app — the handoff bundle captured no
// coding examples at all, and `run/` and `submit/` are typed as bare objects.
// The payloads below are the ones actually observed on `dev`, so they are the
// closest thing to a contract that exists; the tolerance tests around them
// pin the *shapes* the readers must survive, not shapes anyone has seen.

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

  // ── The observed payloads ─────────────────────────────────────────────────

  /// `coding_questions[0]` as the **roadmap** embeds it: no `description`, no
  /// `allowed_languages`, but the samples and the latest submission are there.
  Map<String, dynamic> roadmapProblem() => <String, dynamic>{
    'id': 29,
    'problem_name': 'jdnkjhd djhbwd j jwhbdjh dwnmwd',
    'question_text': 'write a dart code for flutter',
    'programming_language': 'python',
    'function_signature':
        'def extract_widget_names(dart_code_string: str) -> str:',
    'input_format': 'A single string containing Dart code provided via stdin.',
    'output_format':
        'A single line containing the names of the identified '
        'widgets separated by a single space.',
    'time_limit': 2,
    'memory_limit': 256,
    'duration': null,
    'sequence_order': 1,
    'sample_test_cases': <dynamic>[
      <String, dynamic>{
        'id': 217,
        'input_data': 'Container(child: Column(children: []))',
        'expected_output': 'Container Column',
        'is_sample': true,
      },
      <String, dynamic>{
        'id': 218,
        'input_data': "Text('Hello')",
        'expected_output': 'Text',
        'is_sample': true,
      },
    ],
    'latest_submission': null,
  };

  Map<String, dynamic> roadmapProblem2() => <String, dynamic>{
    'id': 30,
    'problem_name': 'sbhjwdsbj dhjbdwhj wdjhbdjhmw',
    'question_text': 'Write c++ for flutter dart',
    'programming_language': 'cpp',
    'function_signature':
        'std::string formatDartList(const std::vector<int>& data)',
    'time_limit': 2,
    'memory_limit': 256,
    'duration': null,
    'sequence_order': 2,
    'sample_test_cases': <dynamic>[
      <String, dynamic>{
        'id': 225,
        'input_data': '3\n1 2 3',
        'expected_output': '[1, 2, 3]',
        'is_sample': true,
      },
    ],
    'latest_submission': null,
  };

  /// The same problem as the **node endpoint** returns it: `description`,
  /// `allowed_languages`, and an `ai_generated_meta` that carries the hidden
  /// cases too.
  Map<String, dynamic> detailProblem() => <String, dynamic>{
    ...roadmapProblem(),
    'node': nodeId,
    'description':
        'A Flutter developer needs a utility function that converts a raw '
        'string representation of a Dart class structure into a simplified '
        "'Widget Tree' representation.",
    'ai_generated_meta': <String, dynamic>{
      'test_cases': <dynamic>[
        <String, dynamic>{
          'input': 'Container(child: Column(children: []))',
          'is_sample': true,
          'expected_output': 'Container Column',
        },
        <String, dynamic>{
          'input': 'A(B(C(D(E(F(G()))))))',
          'is_sample': false,
          'expected_output': 'A B C D E F G',
        },
        <String, dynamic>{
          'input': 'const int x = 5;',
          'is_sample': false,
          'expected_output': '',
        },
      ],
    },
    'allowed_languages': <dynamic>[
      <String, dynamic>{'key': 'python', 'label': 'Python'},
      <String, dynamic>{'key': 'javascript', 'label': 'JavaScript'},
      <String, dynamic>{'key': 'java', 'label': 'Java'},
      <String, dynamic>{'key': 'cpp', 'label': 'C++'},
      <String, dynamic>{'key': 'c', 'label': 'C'},
      <String, dynamic>{'key': 'csharp', 'label': 'C#'},
    ],
  };

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
  String submitUrl(int q) => ApiEndPoints.codingSubmit(
    orgId,
    '$courseId',
    '$moduleId',
    '$nodeId',
    '$q',
  );
  String submissionUrl(int q, int s) => ApiEndPoints.codingSubmission(
    orgId,
    '$courseId',
    '$moduleId',
    '$nodeId',
    '$q',
    '$s',
  );

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_coding_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
    api.install();
    // Polling real seconds in a unit test is just waiting.
    CodingViewModel.pollInterval = Duration.zero;
    CodingViewModel.maxPolls = 3;
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() => api.reset());

  CodingViewModel makeVm() => CodingViewModel(
    orgId: orgId,
    courseId: courseId,
    moduleId: moduleId,
    nodeId: nodeId,
  );

  // ── Models ────────────────────────────────────────────────────────────────

  group('the roadmap\'s embedded copy', () {
    test('names every problem without a second call', () {
      final RoadmapNode node = RoadmapNode.fromJson(<String, dynamic>{
        'id': nodeId,
        'module': moduleId,
        'title': 'Coding question comes here',
        'has_coding_questions': true,
        'is_accessible': true,
        'coding_questions': <dynamic>[roadmapProblem2(), roadmapProblem()],
      });

      expect(node.hasCodingQuestions, isTrue);
      expect(node.codingQuestions, hasLength(2));
      // Sorted by sequence_order, not by the order the API happened to send.
      expect(node.codingQuestions.first.id, 29);
      expect(
        node.codingQuestions.first.title,
        'jdnkjhd djhbwd j jwhbdjh dwnmwd',
      );
      expect(node.codingQuestions.last.programmingLanguage, 'cpp');
      expect(node.codingQuestions.first.sampleTestCases, hasLength(2));
    });

    test('falls back to question_text when there is no description', () {
      final CodingQuestion q = CodingQuestion.fromJson(roadmapProblem());
      expect(q.description, isEmpty);
      expect(q.statement, 'write a dart code for flutter');
      expect(
        q.hasSeparatePrompt,
        isFalse,
        reason: 'the prompt is the statement here, so printing both repeats it',
      );
    });
  });

  group('the node endpoint\'s copy', () {
    test('reads the long statement and the language list', () {
      final CodingQuestion q = CodingQuestion.fromJson(detailProblem());

      expect(q.statement, startsWith('A Flutter developer needs'));
      expect(q.hasSeparatePrompt, isTrue);
      expect(q.languages.map((CodingLanguage l) => l.key), <String>[
        'python',
        'javascript',
        'java',
        'cpp',
        'c',
        'csharp',
      ]);
      expect(q.languages[3].label, 'C++');
      expect(q.defaultLanguage, 'python');
      expect(q.timeLimit, 2);
      expect(q.memoryLimit, 256);
      expect(q.duration, isNull);
    });

    test('drops the hidden test cases at the model boundary', () {
      // `ai_generated_meta.test_cases` leaks the hidden cases *and* their
      // expected outputs, the same way the quiz node endpoint leaks
      // `is_correct`. Only samples may reach a widget.
      final Map<String, dynamic> json = detailProblem()
        ..remove('sample_test_cases');
      final CodingQuestion q = CodingQuestion.fromJson(json);

      expect(q.sampleTestCases, hasLength(1));
      expect(q.sampleTestCases.single.expectedOutput, 'Container Column');
      expect(
        q.sampleTestCases.map((CodingTestCase c) => c.input),
        isNot(contains('A(B(C(D(E(F(G()))))))')),
      );
    });

    test('prefers sample_test_cases when both are present', () {
      final CodingQuestion q = CodingQuestion.fromJson(detailProblem());
      expect(q.sampleTestCases, hasLength(2));
    });
  });

  group('language list tolerance', () {
    test('accepts {key,label} objects, bare strings and a comma string', () {
      expect(
        CodingLanguage.listFrom(<dynamic>[
          <String, dynamic>{'key': 'cpp', 'label': 'C++'},
        ]).single.label,
        'C++',
      );
      expect(
        CodingLanguage.listFrom(<dynamic>['cpp', 'python']).first.label,
        'C++',
        reason: 'a bare key must still print as a language name',
      );
      expect(
        CodingLanguage.listFrom('python, cpp').map((CodingLanguage l) => l.key),
        <String>['python', 'cpp'],
      );
    });

    test('never leaves the picker empty', () {
      final CodingQuestion bare = CodingQuestion.fromJson(<String, dynamic>{
        'id': 1,
      });
      expect(bare.languages, isNotEmpty);
      expect(bare.defaultLanguage, isNotEmpty);
    });

    test('the authored language alone is enough', () {
      final CodingQuestion q = CodingQuestion.fromJson(<String, dynamic>{
        'id': 1,
        'programming_language': 'cpp',
      });
      expect(q.languages.single.label, 'C++');
      expect(q.defaultLanguage, 'cpp');
    });

    test('an authored language outside the allowed list is not selected', () {
      final CodingQuestion q = CodingQuestion.fromJson(<String, dynamic>{
        'id': 1,
        'programming_language': 'rust',
        'allowed_languages': <dynamic>['python', 'java'],
      });
      expect(q.defaultLanguage, 'python');
    });
  });

  group('submissions and runs', () {
    test('a queued submission is not judged yet', () {
      final CodingSubmission s = CodingSubmission.fromJson(<String, dynamic>{
        'id': 7,
        'status': 'queued',
        'language': 'python',
      });
      expect(s.status, CodingStatus.queued);
      expect(s.isJudged, isFalse);
      expect(s.isAccepted, isFalse);
    });

    test('a verdict alone counts as judged', () {
      // A backend that grades synchronously may never send `status`.
      final CodingSubmission s = CodingSubmission.fromJson(<String, dynamic>{
        'id': 7,
        'verdict': 'Accepted',
        'score': 100,
      });
      expect(s.isJudged, isTrue);
      expect(s.isAccepted, isTrue);
      expect(s.score, 100);
    });

    test('a rejecting verdict is not read as acceptance', () {
      for (final String verdict in <String>[
        'wrong_answer',
        'Not Accepted',
        'time_limit_exceeded',
        'compilation_error',
      ]) {
        expect(
          CodingSubmission.fromJson(<String, dynamic>{
            'id': 1,
            'verdict': verdict,
          }).isAccepted,
          isFalse,
          reason: '"$verdict" must not pass as accepted',
        );
      }
    });

    test('with no verdict, every case passing is acceptance', () {
      final CodingSubmission s = CodingSubmission.fromJson(<String, dynamic>{
        'id': 7,
        'status': 'done',
        'results': <dynamic>[
          <String, dynamic>{'passed': true},
          <String, dynamic>{'passed': true},
        ],
      });
      expect(s.isAccepted, isTrue);
      expect(s.passedCount, 2);
      expect(s.totalCount, 2);
    });

    test('a case with no pass flag is judged by comparing the output', () {
      final CodingCaseResult ok = CodingCaseResult.fromJson(<String, dynamic>{
        'input': '1 2',
        'expected_output': '3',
        'stdout': '3\n',
      });
      final CodingCaseResult bad = CodingCaseResult.fromJson(<String, dynamic>{
        'expected_output': '3',
        'stdout': '4',
      });

      expect(ok.passed, isTrue, reason: 'trailing newlines are not a failure');
      expect(bad.passed, isFalse);
      expect(bad.actualOutput, '4');
    });

    test('an explicit flag beats the string comparison', () {
      final CodingCaseResult r = CodingCaseResult.fromJson(<String, dynamic>{
        'expected_output': '3',
        'actual_output': '3',
        'passed': false,
      });
      expect(r.passed, isFalse, reason: 'the judge has the last word');
    });

    test('a run reads either shape', () {
      final CodingRunResult cases = CodingRunResult.fromJson(<String, dynamic>{
        'results': <dynamic>[
          <String, dynamic>{'passed': true},
          <String, dynamic>{'passed': false},
        ],
      });
      expect(cases.hasCases, isTrue);
      expect(cases.passedCount, 1);
      expect(cases.allPassed, isFalse);

      final CodingRunResult custom = CodingRunResult.fromJson(<String, dynamic>{
        'stdout': 'Container Column',
      });
      expect(custom.hasCases, isFalse);
      expect(custom.output, 'Container Column');

      final CodingRunResult bare = CodingRunResult.fromList(<Object?>[
        <String, dynamic>{'passed': true},
      ]);
      expect(bare.cases, hasLength(1));
    });

    test('a compile error is surfaced, not swallowed', () {
      final CodingRunResult r = CodingRunResult.fromJson(<String, dynamic>{
        'compile_output': "SyntaxError: unexpected EOF",
      });
      expect(r.isEmpty, isFalse);
      expect(r.error, contains('SyntaxError'));
    });
  });

  // ── Content types, from the observed learning_material payloads ───────────

  group('learning material content types', () {
    LearningMaterial material(String type, {String? url, String? file}) =>
        LearningMaterial.fromJson(<String, dynamic>{
          'id': 1,
          'content_type': type,
          'content_url': url,
          'content_file': file,
        });

    test('a YouTube lesson filed as "Link" still plays inline', () {
      // The real payload types a YouTube lesson `Link`, with the URL in
      // content_url. Keying off content_type alone sent the learner out to a
      // browser for a video the app can play.
      final LearningMaterial m = material(
        'Link',
        url: 'https://youtu.be/vmbRkgO4sQM?si=ZQKP8S6-o7dQKOIu',
      );

      expect(m.isYouTube, isTrue);
      expect(m.isVideo, isTrue);
      expect(m.isLink, isFalse, reason: 'it is a video, not a reading');
    });

    test('watch?v= and /embed/ links are YouTube too', () {
      // Only *that* it is YouTube matters here. Which video it is, is read
      // from the URL by `youtube_player_iframe` — this app does not extract
      // an id, so there is no second implementation of that to get wrong.
      expect(
        material(
          'Video',
          url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
        ).isYouTube,
        isTrue,
      );
      expect(
        material(
          'Link',
          url: 'https://www.youtube.com/embed/kqtD5dpn9C8',
        ).isYouTube,
        isTrue,
      );
    });

    test('a presigned PDF is a document', () {
      // The extension is followed by the whole AWS query string, so a test
      // against the full URL never matches — it has to use the path.
      final LearningMaterial m = material(
        'PDF',
        file:
            'https://dev-lms-poc.s3.amazonaws.com/media/orgs/x/GAVS_refer.pdf'
            '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc',
      );

      expect(m.isDocument, isTrue);
      expect(m.isVideo, isFalse);
      expect(m.isLink, isFalse);
    });

    test('a .docx filed as "Doc" is a document', () {
      expect(
        material(
          'Doc',
          file: 'https://s3.amazonaws.com/x/PW-BACC-L4-04_L.docx?X-Amz-Date=1',
        ).isDocument,
        isTrue,
      );
    });

    test('a presigned mp4 filed as "Video" is a video', () {
      final LearningMaterial m = material(
        'Video',
        file: 'https://s3.amazonaws.com/x/SampleVideo_128.mp4?X-Amz-Expires=1',
      );

      expect(m.isVideo, isTrue);
      expect(m.isYouTube, isFalse);
      expect(m.isDocument, isFalse);
    });

    test('a plain reading link stays a link', () {
      final LearningMaterial m = material(
        'Link',
        url: 'https://python.org/downloads',
      );
      expect(m.isLink, isTrue);
      expect(m.isVideo, isFalse);
    });
  });

  // ── The view model ────────────────────────────────────────────────────────

  group('loading', () {
    test(
      'fetches the full list and primes the editor from signature/',
      () async {
        api.on(questionsUrl, status: 200, body: <dynamic>[detailProblem()]);
        api.on(
          signatureUrl(29),
          status: 200,
          body: <String, dynamic>{
            'language': 'python',
            'signature': 'def extract_widget_names(s):\n    pass',
          },
        );

        final CodingViewModel vm = makeVm();
        await vm.load();

        expect(vm.questions, hasLength(1));
        expect(vm.current!.id, 29);
        expect(vm.codeFor(29), contains('def extract_widget_names'));
        expect(
          api.requestFor(signatureUrl(29))?.queryParameters['language'],
          'python',
        );
      },
    );

    test('falls back to the question\'s own signature', () async {
      api.on(questionsUrl, status: 200, body: <dynamic>[detailProblem()]);
      api.on(
        signatureUrl(29),
        status: 500,
        body: <String, dynamic>{'detail': 'nope'},
      );

      final CodingViewModel vm = makeVm();
      await vm.load();

      expect(
        vm.codeFor(29),
        'def extract_widget_names(dart_code_string: str) -> str:',
        reason: 'an empty editor is a worse start than the authored signature',
      );
    });

    test('a 403 is a lock, not an error', () async {
      api.on(
        questionsUrl,
        status: 403,
        body: <String, dynamic>{'detail': 'Locked'},
      );

      final CodingViewModel vm = makeVm();
      await vm.load();

      expect(vm.locked, isTrue);
      expect(vm.state, ViewState.success);
    });

    test('a real failure is an error state that can be retried', () async {
      api.on(
        questionsUrl,
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
      );

      final CodingViewModel vm = makeVm();
      await vm.load();
      expect(vm.state, ViewState.error);

      api.on(questionsUrl, status: 200, body: <dynamic>[detailProblem()]);
      await vm.load(refresh: true);
      expect(vm.questions, hasLength(1));
    });
  });

  group('switching language', () {
    Future<CodingViewModel> loaded() async {
      api.on(questionsUrl, status: 200, body: <dynamic>[detailProblem()]);
      api.on(
        signatureUrl(29),
        status: 200,
        body: <String, dynamic>{'signature': 'def solve():\n    pass'},
      );
      final CodingViewModel vm = makeVm();
      await vm.load();
      return vm;
    }

    test('swaps starter code the learner has not touched', () async {
      final CodingViewModel vm = await loaded();
      expect(vm.codeFor(29), 'def solve():\n    pass');

      api.on(
        signatureUrl(29),
        status: 200,
        body: <String, dynamic>{'signature': 'int solve() {}'},
      );
      await vm.setLanguage(vm.current!, 'cpp');

      expect(vm.languageFor(vm.current!), 'cpp');
      expect(vm.codeFor(29), 'int solve() {}');
    });

    test('never replaces code the learner wrote', () async {
      final CodingViewModel vm = await loaded();
      vm.setCode(29, 'print("mine")');

      api.on(
        signatureUrl(29),
        status: 200,
        body: <String, dynamic>{'signature': 'int solve() {}'},
      );
      await vm.setLanguage(vm.current!, 'cpp');

      expect(
        vm.codeFor(29),
        'print("mine")',
        reason: 'losing typed code to a language tap is unforgivable',
      );
      expect(vm.languageFor(vm.current!), 'cpp');
    });

    test('a language already fetched costs no second request', () async {
      final CodingViewModel vm = await loaded();
      await vm.setLanguage(vm.current!, 'cpp');
      await vm.setLanguage(vm.current!, 'python');
      await vm.setLanguage(vm.current!, 'cpp');

      expect(
        api.requests.where((RequestOptions r) => r.path == signatureUrl(29)),
        hasLength(2),
        reason: 'python and cpp, once each',
      );
    });
  });

  group('running', () {
    Future<CodingViewModel> loaded() async {
      api.on(questionsUrl, status: 200, body: <dynamic>[detailProblem()]);
      api.on(
        signatureUrl(29),
        status: 200,
        body: <String, dynamic>{'signature': 'def solve(): pass'},
      );
      final CodingViewModel vm = makeVm();
      await vm.load();
      return vm;
    }

    test('sends the code and the chosen language', () async {
      final CodingViewModel vm = await loaded();
      api.on(
        runUrl(29),
        status: 200,
        body: <String, dynamic>{
          'results': <dynamic>[
            <String, dynamic>{
              'input': 'Text(\'Hello\')',
              'expected_output': 'Text',
              'actual_output': 'Text',
              'passed': true,
            },
          ],
        },
      );

      vm.setCode(29, 'print(1)');
      await vm.run(vm.current!);

      final Map<String, dynamic> sent =
          api.requestFor(runUrl(29))!.data as Map<String, dynamic>;
      expect(sent['source_code'], 'print(1)');
      expect(sent['language'], 'python');
      expect(
        sent.containsKey('stdin'),
        isFalse,
        reason: 'stdin has minLength 1, so an empty one is a 400',
      );
      expect(vm.runFor(29)!.allPassed, isTrue);
    });

    test('custom input is sent when the learner typed some', () async {
      final CodingViewModel vm = await loaded();
      api.on(runUrl(29), status: 200, body: <String, dynamic>{'stdout': 'ok'});

      vm.setCode(29, 'print(1)');
      vm.setStdin(29, 'Text()');
      await vm.run(vm.current!);

      expect(
        (api.requestFor(runUrl(29))!.data as Map<String, dynamic>)['stdin'],
        'Text()',
      );
      expect(vm.runFor(29)!.output, 'ok');
    });

    test('an empty editor never fires a request', () async {
      final CodingViewModel vm = await loaded();
      vm.setCode(29, '   ');
      await vm.run(vm.current!);

      expect(api.hit(runUrl(29)), isFalse);
    });

    test('a failure is reported against that problem', () async {
      final CodingViewModel vm = await loaded();
      api.on(
        runUrl(29),
        status: 400,
        body: <String, dynamic>{'detail': 'Language not allowed'},
      );

      vm.setCode(29, 'print(1)');
      await vm.run(vm.current!);

      expect(vm.actionErrorFor(29), 'Language not allowed');
      expect(vm.runFor(29), isNull);
    });
  });

  group('submitting', () {
    Future<CodingViewModel> loaded() async {
      api.on(questionsUrl, status: 200, body: <dynamic>[detailProblem()]);
      api.on(
        signatureUrl(29),
        status: 200,
        body: <String, dynamic>{'signature': 'def solve(): pass'},
      );
      final CodingViewModel vm = makeVm();
      await vm.load();
      vm.setCode(29, 'print(1)');
      return vm;
    }

    test('polls until the judge is done, then completes the node', () async {
      final CodingViewModel vm = await loaded();

      // Judging is asynchronous: submit answers `queued`, the verdict lands on
      // the submission endpoint.
      api.on(
        submitUrl(29),
        status: 200,
        body: <String, dynamic>{'id': 77, 'status': 'queued'},
      );
      api.on(
        submissionUrl(29, 77),
        status: 200,
        body: <String, dynamic>{
          'id': 77,
          'status': 'done',
          'verdict': 'Accepted',
          'score': 100,
          'results': <dynamic>[
            <String, dynamic>{'passed': true},
          ],
        },
      );
      api.on(
        ApiEndPoints.completeNode('$nodeId'),
        status: 200,
        body: <String, dynamic>{'detail': 'done'},
      );

      expect(await vm.submit(vm.current!), isTrue);
      expect(vm.submissionFor(29)!.isAccepted, isTrue);
      expect(vm.submissionFor(29)!.score, 100);
      expect(vm.isSubmitting(29), isFalse);
      expect(api.hit(submissionUrl(29, 77)), isTrue);
      expect(
        api.hit(ApiEndPoints.completeNode('$nodeId')),
        isTrue,
        reason: 'every problem on the node is solved',
      );
    });

    test('a judged submission needs no poll at all', () async {
      final CodingViewModel vm = await loaded();
      api.on(
        submitUrl(29),
        status: 200,
        body: <String, dynamic>{
          'id': 78,
          'status': 'done',
          'verdict': 'Accepted',
        },
      );
      api.on(
        ApiEndPoints.completeNode('$nodeId'),
        status: 200,
        body: <String, dynamic>{'detail': 'done'},
      );

      expect(await vm.submit(vm.current!), isTrue);
      expect(api.hit(submissionUrl(29, 78)), isFalse);
    });

    test('a judge that never finishes gives up rather than hanging', () async {
      final CodingViewModel vm = await loaded();
      api.on(
        submitUrl(29),
        status: 200,
        body: <String, dynamic>{'id': 79, 'status': 'queued'},
      );
      api.on(
        submissionUrl(29, 79),
        status: 200,
        body: <String, dynamic>{'id': 79, 'status': 'running'},
      );

      expect(await vm.submit(vm.current!), isFalse);
      expect(
        api.requests.where(
          (RequestOptions r) => r.path == submissionUrl(29, 79),
        ),
        hasLength(CodingViewModel.maxPolls),
      );
      expect(vm.submissionFor(29)!.isJudged, isFalse);
      expect(
        vm.isSubmitting(29),
        isFalse,
        reason: 'the button must come back even when the verdict never does',
      );
    });

    test('a rejected answer does not complete the node', () async {
      final CodingViewModel vm = await loaded();
      api.on(
        submitUrl(29),
        status: 200,
        body: <String, dynamic>{
          'id': 80,
          'status': 'done',
          'verdict': 'Wrong Answer',
          'results': <dynamic>[
            <String, dynamic>{'passed': false, 'expected_output': 'Text'},
          ],
        },
      );

      expect(await vm.submit(vm.current!), isFalse);
      expect(api.hit(ApiEndPoints.completeNode('$nodeId')), isFalse);
      expect(vm.isSolved(vm.current!), isFalse);
    });

    test('one solved problem out of two does not complete the node', () async {
      api.on(
        questionsUrl,
        status: 200,
        body: <dynamic>[detailProblem(), roadmapProblem2()],
      );
      api.on(
        signatureUrl(29),
        status: 200,
        body: <String, dynamic>{'signature': 'def solve(): pass'},
      );
      api.on(
        submitUrl(29),
        status: 200,
        body: <String, dynamic>{
          'id': 81,
          'status': 'done',
          'verdict': 'Accepted',
        },
      );

      final CodingViewModel vm = makeVm();
      await vm.load();
      vm.setCode(29, 'print(1)');

      expect(await vm.submit(vm.current!), isTrue);
      expect(vm.allSolved, isFalse);
      expect(api.hit(ApiEndPoints.completeNode('$nodeId')), isFalse);
    });

    test('latest_submission counts as solved on arrival', () async {
      api.on(
        questionsUrl,
        status: 200,
        body: <dynamic>[
          <String, dynamic>{
            ...detailProblem(),
            'latest_submission': <String, dynamic>{
              'id': 12,
              'status': 'done',
              'verdict': 'Accepted',
            },
          },
        ],
      );
      api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});

      final CodingViewModel vm = makeVm();
      await vm.load();

      expect(vm.isSolved(vm.current!), isTrue);
      expect(vm.allSolved, isTrue);
    });
  });

  test('each problem keeps its own code and language', () async {
    api.on(
      questionsUrl,
      status: 200,
      body: <dynamic>[detailProblem(), roadmapProblem2()],
    );
    api.on(signatureUrl(29), status: 200, body: <String, dynamic>{});
    api.on(signatureUrl(30), status: 200, body: <String, dynamic>{});

    final CodingViewModel vm = makeVm();
    await vm.load();

    vm.setCode(29, 'first');
    vm.select(1);
    expect(vm.current!.id, 30);
    vm.setCode(30, 'second');

    vm.select(0);
    expect(vm.codeFor(29), 'first');
    expect(vm.codeFor(30), 'second');
    expect(
      vm.languageFor(vm.questions[1]),
      'cpp',
      reason: 'each problem defaults to its own authored language',
    );
  });
}
