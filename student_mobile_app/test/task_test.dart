// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The task screen: one load, two sections.
//
// The node describes the task and `GET …/task/submit/` lists every attempt.
// Both go out together, because a form without its `allow_*` flags and a
// history without its task are each worse than asking the learner to retry.
// The `?submitted=` hint and `task/result/` are gone — the list endpoint
// answers both questions the screen used to split between two calls.

import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  late AppLocalizations strings;
  final FakeApi api = FakeApi();

  const int orgId = 5;
  const int courseId = 182;
  const int moduleId = 1155;
  const int nodeId = 2031;

  final String nodeUrl = ApiEndPoints.node(
    orgId,
    '$courseId',
    '$moduleId',
    '$nodeId',
  );
  final String submitUrl = ApiEndPoints.submitTask('$nodeId');

  void serveNode({bool allowLink = true, bool allowFile = true}) => api.on(
    nodeUrl,
    status: 200,
    body: <String, dynamic>{
      'id': nodeId,
      'module': moduleId,
      'title': 'Create Your First Flutter App',
      'task': <String, dynamic>{
        'id': 19,
        'title': 'Create Your First Flutter App',
        'description': 'Build a counter and push it to GitHub.',
        'allow_link': allowLink,
        'allow_file': allowFile,
      },
    },
  );

  Map<String, dynamic> attempt({
    int id = 1,
    int number = 1,
    String status = 'pending',
    String feedback = '',
    Object? score,
    Object? canResubmit = false,
    String link = 'https://github.com/me/work',
  }) => <String, dynamic>{
    'submission_id': id,
    'task_title': 'Create Your First Flutter App',
    'status': status,
    'feedback': feedback,
    'awarded_score': score,
    'submitted_at': '2026-10-05T11:01:00Z',
    'attempt_number': number,
    'can_resubmit': canResubmit,
    'payload': <String, dynamic>{'link': link},
  };

  void serveAttempts(List<Map<String, dynamic>> attempts) =>
      api.on(submitUrl, status: 200, body: attempts, method: 'GET');

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_task_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
    api.install();
    strings = await AppLocalizations.delegate.load(const Locale('en'));
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    api.reset();
    await HiveStorage.clearAllBoxes();
  });

  TaskViewModel makeVm() => TaskViewModel(
    orgId: orgId,
    courseId: courseId,
    moduleId: moduleId,
    nodeId: nodeId,
  );

  group('loading', () {
    test('asks for the node and the attempts together', () async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[]);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();

      expect(api.hit(nodeUrl), isTrue);
      expect(api.hit(submitUrl), isTrue);
      expect(vm.task?.title, 'Create Your First Flutter App');
    });

    test('an empty list opens the form', () async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[]);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();

      expect(vm.hasHistory, isFalse);
      expect(vm.isComposing, isTrue, reason: 'nothing to show but the form');
      expect(vm.latest, isNull);
    });

    test('attempts open the history instead', () async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[attempt()]);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();

      expect(vm.hasHistory, isTrue);
      expect(vm.isComposing, isFalse);
      expect(vm.latest?.isPending, isTrue);
    });

    test('either call failing is one error with one retry', () async {
      // Half a screen is worse than asking again: the form needs the flags and
      // the history still has to name its task.
      serveNode();
      api.on(
        submitUrl,
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
        method: 'GET',
      );

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();

      expect(vm.state, ViewState.error);
      expect(vm.errorMessage, 'Server error');
      expect(vm.task, isNull, reason: 'nothing half-drawn');
    });

    test('a locked node is a lock, not an error', () async {
      api.on(nodeUrl, status: 403, body: <String, dynamic>{'detail': 'Locked'});
      serveAttempts(<Map<String, dynamic>>[]);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();

      expect(vm.isLocked, isTrue);
      expect(vm.state, ViewState.success);
    });

    test('the newest attempt leads, whatever order the list arrives in', () {
      // "Always the first item" is a promise no schema makes.
      serveNode();
      serveAttempts(<Map<String, dynamic>>[
        attempt(id: 1, number: 1, status: 'rejected'),
        attempt(id: 2, number: 2),
      ]);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);

      return vm.load().then((_) {
        expect(vm.submissions.first.attemptNumber, 2);
        expect(vm.submissions.last.attemptNumber, 1);
        expect(vm.latest?.id, 2);
      });
    });
  });

  group('can_resubmit', () {
    // Declared as a **string** in the schema — a DRF method field with no type
    // hint — so `== true` would have hidden the button whenever the backend
    // sent `"true"`.
    for (final Object? raw in <Object?>[true, 'true', 'True', 1, '1']) {
      test('is true for ${raw.runtimeType} $raw', () async {
        serveNode();
        serveAttempts(<Map<String, dynamic>>[attempt(canResubmit: raw)]);

        final TaskViewModel vm = makeVm();
        addTearDown(vm.dispose);
        await vm.load();

        expect(vm.canResubmit, isTrue);
      });
    }

    for (final Object? raw in <Object?>[false, 'false', 0, null]) {
      test('is false for $raw', () async {
        serveNode();
        serveAttempts(<Map<String, dynamic>>[attempt(canResubmit: raw)]);

        final TaskViewModel vm = makeVm();
        addTearDown(vm.dispose);
        await vm.load();

        expect(vm.canResubmit, isFalse);
      });
    }
  });

  group('resubmitting', () {
    test('opens the form over the history, which stays', () async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[attempt(canResubmit: true)]);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();
      expect(vm.isComposing, isFalse);

      vm.startResubmission();
      expect(vm.isComposing, isTrue);
      expect(vm.hasHistory, isTrue, reason: 'it moves down, it does not go');

      vm.cancelResubmission();
      expect(vm.isComposing, isFalse);
    });

    test('a new attempt joins the history and closes the form', () async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[
        attempt(id: 1, number: 1, status: 'rejected', canResubmit: true),
      ]);
      api.on(
        submitUrl,
        status: 201,
        body: attempt(id: 2, number: 2),
        method: 'POST',
      );
      api.on(ApiEndPoints.completeNode('$nodeId'), status: 200, body: null);

      final TaskViewModel vm = makeVm();
      addTearDown(vm.dispose);
      await vm.load();

      vm.startResubmission();
      vm.setLink('https://github.com/me/again');
      expect(await vm.submit(), isTrue);

      expect(vm.submissions.length, 2);
      expect(vm.latest?.attemptNumber, 2);
      expect(vm.isComposing, isFalse, reason: 'back to the history');
      expect(vm.link, isEmpty, reason: 'and the form is cleared behind it');
    });
  });

  group('the screen', () {
    Future<void> pumpTask(WidgetTester tester) async {
      tester.view.physicalSize = const Size(420, 2200);
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
              home: const TaskScreen(
                courseId: courseId,
                moduleId: moduleId,
                nodeId: nodeId,
              ),
            ),
          ),
        );

        await Future<void>.delayed(const Duration(milliseconds: 80));
        await tester.pump(const Duration(milliseconds: 120));
        await tester.pump(const Duration(milliseconds: 600));
      });
    }

    testWidgets('names itself, and names the task', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[]);
      await pumpTask(tester);

      expect(find.text(strings.taskScreenTitle), findsOneWidget);
      expect(find.text('Create Your First Flutter App'), findsWidgets);
      expect(
        find.text('Build a counter and push it to GitHub.'),
        findsOneWidget,
      );
    });

    testWidgets('a long brief collapses behind Read more', (
      WidgetTester tester,
    ) async {
      // All of a multi-paragraph brief above the form pushes the first field
      // off the screen.
      api.on(
        nodeUrl,
        status: 200,
        body: <String, dynamic>{
          'id': nodeId,
          'module': moduleId,
          'task': <String, dynamic>{
            'id': 19,
            'title': 'Create Your First Flutter App',
            'description': List<String>.filled(
              40,
              'Build a counter and push it to GitHub.',
            ).join(' '),
            'allow_link': true,
          },
        },
      );
      serveAttempts(<Map<String, dynamic>>[]);
      await pumpTask(tester);

      expect(find.textContaining(strings.readMore), findsOneWidget);
    });

    testWidgets('with nothing submitted it is a form that says Upload', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[]);
      await pumpTask(tester);

      expect(find.text(strings.taskSubmit), findsOneWidget);
      expect(find.text(strings.taskUploadCta), findsOneWidget);
      expect(find.text(strings.taskHistoryTitle), findsNothing);
    });

    testWidgets('an attempt card names its status, number, date and work', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[
        <String, dynamic>{
          ...attempt(number: 2, status: 'rejected', feedback: 'Add tests.'),
          'awarded_score': 7,
          'payload': <String, dynamic>{
            'link': 'https://github.com/me/work',
            'paragraph': 'I built the counter.',
            'code': 'void main() {}',
          },
        },
      ]);
      await pumpTask(tester);

      // The status as the backend names it, not an instruction.
      expect(find.text(strings.taskStatusRejected), findsOneWidget);
      expect(find.text('#2'), findsOneWidget);
      expect(find.textContaining('Oct'), findsWidgets, reason: 'the date');

      // Verdict above the evidence.
      expect(find.text('7'), findsOneWidget);
      expect(find.text('Add tests.'), findsOneWidget);

      // Every piece says what it is.
      expect(find.text(strings.taskWorkLink), findsOneWidget);
      expect(find.text(strings.taskWorkAnswer), findsOneWidget);
      expect(find.text(strings.taskWorkCode), findsOneWidget);
      expect(find.text('I built the counter.'), findsOneWidget);
    });

    testWidgets('a file is offered as View file, not as its URL', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[
        <String, dynamic>{
          ...attempt(),
          'payload': <String, dynamic>{},
          'submission_file_url': 'https://cdn.test/work.pdf?X-Amz-Signature=x',
        },
      ]);
      await pumpTask(tester);

      expect(find.text(strings.taskWorkFile), findsOneWidget);
      expect(find.text(strings.taskViewFile), findsOneWidget);
      expect(
        find.textContaining('X-Amz-Signature'),
        findsNothing,
        reason: 'a presigned URL is not something to read',
      );
    });

    testWidgets('with attempts it is a history, pending called out on top', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[attempt(canResubmit: true)]);
      await pumpTask(tester);

      expect(find.text(strings.taskHistoryTitle), findsOneWidget);
      expect(find.text(strings.taskUnderReviewTitle), findsOneWidget);
      expect(find.text('#1'), findsOneWidget);
      expect(
        find.text('https://github.com/me/work'),
        findsOneWidget,
        reason: 'the learner can see what they sent',
      );
      expect(find.text(strings.taskSubmit), findsNothing);
    });

    testWidgets('Re-submit opens the form and keeps the history below', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[
        attempt(status: 'rejected', feedback: 'Add tests.', canResubmit: true),
      ]);
      await pumpTask(tester);

      expect(find.text(strings.taskResubmit), findsOneWidget);
      await tester.tap(find.text(strings.taskResubmit));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));

      expect(find.text(strings.taskResubmitCta), findsOneWidget);
      expect(
        find.text(strings.taskHistoryTitle),
        findsOneWidget,
        reason: 'it moved down, it did not go away',
      );
      expect(find.text('Add tests.'), findsOneWidget);
    });

    testWidgets('pulling down asks the trainer again', (
      WidgetTester tester,
    ) async {
      // Review happens out of the app's sight, so a pull is how the learner
      // asks whether it has happened yet. Both halves reload — the task can
      // change under them too.
      serveNode();
      serveAttempts(<Map<String, dynamic>>[attempt()]);
      await pumpTask(tester);

      expect(
        api.requests.where((RequestOptions r) => r.path == submitUrl).length,
        1,
      );

      await tester.runAsync(() async {
        // `show()` rather than a fling: the gesture's own animation does not
        // settle inside `runAsync`, and what is pinned here is that the
        // indicator is wired to `load` — not Flutter's drag handling.
        unawaited(
          tester
              .state<RefreshIndicatorState>(find.byType(RefreshIndicator))
              .show(),
        );
        // The indicator animates in before it calls `onRefresh`, so this
        // alternates frames with real time until the request has gone out.
        for (int i = 0; i < 12; i++) {
          await tester.pump(const Duration(milliseconds: 120));
          await Future<void>.delayed(const Duration(milliseconds: 30));
        }
      });

      expect(
        api.requests.where((RequestOptions r) => r.path == submitUrl).length,
        2,
      );
      expect(
        api.requests.where((RequestOptions r) => r.path == nodeUrl).length,
        2,
        reason: 'both halves, the way the first load fetched them',
      );
    });

    testWidgets('no Re-submit when the backend does not allow one', (
      WidgetTester tester,
    ) async {
      serveNode();
      serveAttempts(<Map<String, dynamic>>[attempt(canResubmit: false)]);
      await pumpTask(tester);

      expect(find.text(strings.taskResubmit), findsNothing);
    });
  });

  // What the one file picker is told to accept, and what the field calls it.
  //
  // The three flags are independent and the backend sends any combination, so
  // this is a truth table rather than three cases. `allow_file` means *any*
  // file and swallows the narrower two; anything else is a real narrowing and
  // the picker is filtered, so a PDF-only task cannot take a .docx.
  group('the file field follows the allow_* flags', () {
    TaskDetail taskWith({
      bool file = false,
      bool pdf = false,
      bool screenshot = false,
    }) => TaskDetail.fromJson(<String, dynamic>{
      'id': 1,
      // Something unrelated stays set, so `hasNoStatedInputs` is not what is
      // being measured except where a case says so.
      'allow_link': true,
      'allow_file': file,
      'allow_pdf': pdf,
      'allow_screenshot': screenshot,
    });

    test('a file-only task takes anything, and says File', () {
      final TaskDetail t = taskWith(file: true);
      expect(t.filePickerSpec.type, FileType.any);
      expect(t.filePickerSpec.extensions, isNull);
      expect(t.fileLabel(strings), 'File');
    });

    test('a PDF-only task is filtered to pdf, and says PDF', () {
      final TaskDetail t = taskWith(pdf: true);
      expect(t.filePickerSpec.type, FileType.custom);
      expect(t.filePickerSpec.extensions, <String>['pdf']);
      expect(t.fileLabel(strings), 'PDF');
    });

    test('a screenshot-only task asks for images, and says Screenshot', () {
      final TaskDetail t = taskWith(screenshot: true);
      expect(t.filePickerSpec.type, FileType.image);
      expect(
        t.filePickerSpec.extensions,
        isNull,
        reason: 'FileType.image needs no extension list',
      );
      expect(t.fileLabel(strings), 'Screenshot');
    });

    test('File with PDF widens back to any, and reads File/PDF', () {
      final TaskDetail t = taskWith(file: true, pdf: true);
      expect(t.filePickerSpec.type, FileType.any);
      expect(t.fileLabel(strings), 'File/PDF');
    });

    test('PDF with Screenshot filters to both, and reads PDF/Screenshot', () {
      final TaskDetail t = taskWith(pdf: true, screenshot: true);
      final ({FileType type, List<String>? extensions}) spec = t.filePickerSpec;

      expect(
        spec.type,
        FileType.custom,
        reason: 'neither FileType.image nor a pdf-only filter covers both',
      );
      expect(spec.extensions, contains('pdf'));
      expect(spec.extensions, contains('png'));
      expect(t.fileLabel(strings), 'PDF/Screenshot');
    });

    test('all three read widest first', () {
      expect(
        taskWith(file: true, pdf: true, screenshot: true).fileLabel(strings),
        'File/PDF/Screenshot',
      );
    });

    test('a task that states nothing still offers a plain File', () {
      final TaskDetail t = TaskDetail.fromJson(<String, dynamic>{'id': 1});

      expect(t.hasNoStatedInputs, isTrue);
      expect(t.offersFile, isTrue);
      expect(t.filePickerSpec.type, FileType.any);
      expect(
        t.fileLabel(strings),
        'File',
        reason: 'the label never lists a kind the task did not ask for',
      );
    });
  });
}
