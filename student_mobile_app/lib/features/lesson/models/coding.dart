// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Coding practice inside a lesson.
///
/// **The highest-uncertainty area in the app** (PRD R9). The demo data carried
/// no coding content, so `api/examples/` has nothing for it, and the OpenAPI
/// export declares `run/` and `submit/` as bare objects with `results` and
/// `sample_test_cases` typed `string` — they are untyped
/// `SerializerMethodField`s. Only the question shapes have been seen against a
/// real response, embedded in the roadmap and the node endpoint.
///
/// So every reader below accepts the handful of field names a DRF judge
/// plausibly uses instead of insisting on one, and a missing field degrades to
/// "not shown" rather than to a wrong answer. **Check this file first if coding
/// looks wrong against the live API.**

// ── Tolerant readers ────────────────────────────────────────────────────────

/// The first key that is actually present and non-null.
Object? _any(Map<String, dynamic> json, List<String> keys) {
  for (final String key in keys) {
    final Object? value = json[key];
    if (value != null) return value;
  }
  return null;
}

String _str(Map<String, dynamic> json, List<String> keys) {
  final Object? value = _any(json, keys);
  return value == null ? '' : '$value';
}

int? _int(Map<String, dynamic> json, List<String> keys) {
  final Object? value = _any(json, keys);
  if (value is int) return value;
  if (value is num) return value.round();
  return value == null ? null : int.tryParse('$value');
}

double? _double(Map<String, dynamic> json, List<String> keys) {
  final Object? value = _any(json, keys);
  if (value is num) return value.toDouble();
  return value == null ? null : double.tryParse('$value');
}

/// Judges are inconsistent about booleans — `true`, `"true"`, `1` and `"1"`
/// all turn up. Anything unrecognised is null, not false, so a caller can tell
/// "said no" from "did not say".
bool? _bool(Map<String, dynamic> json, List<String> keys) {
  final Object? value = _any(json, keys);
  if (value is bool) return value;
  if (value is num) return value != 0;
  return switch ('$value'.trim().toLowerCase()) {
    'true' || '1' || 'yes' || 'passed' || 'pass' => true,
    'false' || '0' || 'no' || 'failed' || 'fail' => false,
    _ => null,
  };
}

List<Map<String, dynamic>> _maps(Object? raw) =>
    (raw as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map((Map<dynamic, dynamic> e) => Map<String, dynamic>.from(e))
        .toList();

/// One language the learner may answer in.
///
/// `allowed_languages` is a method field typed `string` in the export; the real
/// response sends `[{"key": "python", "label": "Python"}]`. Bare strings and a
/// comma-joined string are accepted too, because a method field can return any
/// of them and the language picker must never come up empty.
class CodingLanguage {
  const CodingLanguage({required this.key, required this.label});

  final String key;
  final String label;

  /// `LanguageD5cEnum` from the OpenAPI export, used only when the API sends
  /// no list at all — an empty picker would make the screen unusable.
  static const List<CodingLanguage> fallback = <CodingLanguage>[
    CodingLanguage(key: 'python', label: 'Python'),
    CodingLanguage(key: 'javascript', label: 'JavaScript'),
    CodingLanguage(key: 'java', label: 'Java'),
    CodingLanguage(key: 'cpp', label: 'C++'),
    CodingLanguage(key: 'c', label: 'C'),
    CodingLanguage(key: 'csharp', label: 'C#'),
  ];

  /// A readable name for a bare key, so `cpp` never prints as "Cpp".
  static String labelFor(String key) {
    final String k = key.trim().toLowerCase();
    for (final CodingLanguage l in fallback) {
      if (l.key == k) return l.label;
    }
    return switch (k) {
      'sql' => 'SQL',
      '' => '',
      _ => '${k[0].toUpperCase()}${k.substring(1)}',
    };
  }

  static List<CodingLanguage> listFrom(Object? raw) {
    final List<CodingLanguage> out = <CodingLanguage>[];
    final Set<String> seen = <String>{};

    void add(String key, [String? label]) {
      final String k = key.trim().toLowerCase();
      if (k.isEmpty || !seen.add(k)) return;
      final String name = (label ?? '').trim();
      out.add(CodingLanguage(key: k, label: name.isEmpty ? labelFor(k) : name));
    }

    if (raw is String) {
      for (final String part in raw.split(',')) {
        add(part);
      }
    } else if (raw is List<dynamic>) {
      for (final Object? entry in raw) {
        if (entry is Map<dynamic, dynamic>) {
          final Map<String, dynamic> m = Map<String, dynamic>.from(entry);
          add(
            _str(m, <String>['key', 'value', 'language']),
            _str(m, <String>['label', 'name']),
          );
        } else if (entry != null) {
          add('$entry');
        }
      }
    }

    return out;
  }
}

/// A sample case: what goes in, what must come out.
///
/// **Only samples are ever kept.** `ai_generated_meta.test_cases` carries the
/// hidden cases *and their expected outputs* alongside the samples, the same
/// way the quiz node endpoint leaks `is_correct`; they are dropped here at the
/// model boundary so no widget can show them later.
class CodingTestCase {
  const CodingTestCase({
    required this.id,
    this.input = '',
    this.expectedOutput = '',
  });

  final int id;
  final String input;
  final String expectedOutput;

  factory CodingTestCase.fromJson(Map<String, dynamic> json, [int index = 0]) =>
      CodingTestCase(
        id: _int(json, <String>['id']) ?? index,
        input: _str(json, <String>['input_data', 'input', 'stdin']),
        expectedOutput: _str(json, <String>[
          'expected_output',
          'output',
          'expected',
        ]),
      );

  /// `sample_test_cases` when the API sends it, otherwise the `is_sample`
  /// entries of `ai_generated_meta.test_cases` — never the hidden ones.
  static List<CodingTestCase> readFrom(Map<String, dynamic> question) {
    final List<Map<String, dynamic>> declared = _maps(
      question['sample_test_cases'],
    );
    if (declared.isNotEmpty) {
      return <CodingTestCase>[
        for (int i = 0; i < declared.length; i++)
          CodingTestCase.fromJson(declared[i], i),
      ];
    }

    final Object? meta = question['ai_generated_meta'];
    if (meta is! Map<dynamic, dynamic>) return const <CodingTestCase>[];

    final List<Map<String, dynamic>> all = _maps(
      Map<String, dynamic>.from(meta)['test_cases'],
    );
    final List<CodingTestCase> samples = <CodingTestCase>[];
    for (int i = 0; i < all.length; i++) {
      if (_bool(all[i], <String>['is_sample']) != true) continue;
      samples.add(CodingTestCase.fromJson(all[i], i));
    }
    return samples;
  }
}

/// One coding problem.
///
/// Arrives in three places with three levels of detail: the roadmap embeds
/// enough to list it, `GET …/nodes/{n}/` adds `description` and
/// `allowed_languages`, and `GET …/coding-questions/` returns the same full
/// shape as a list. One class reads all three.
class CodingQuestion {
  const CodingQuestion({
    required this.id,
    this.nodeId,
    this.problemName = '',
    this.questionText = '',
    this.description = '',
    this.programmingLanguage = '',
    this.functionSignature = '',
    this.inputFormat = '',
    this.outputFormat = '',
    this.timeLimit,
    this.memoryLimit,
    this.duration,
    this.sequenceOrder = 0,
    this.sampleTestCases = const <CodingTestCase>[],
    this.allowedLanguages = const <CodingLanguage>[],
    this.latestSubmission,
  });

  final int id;
  final int? nodeId;
  final String problemName;

  /// The short prompt ("write a dart code for flutter").
  final String questionText;

  /// The long statement. Absent from the roadmap's copy, so the screen falls
  /// back to [questionText].
  final String description;

  /// The language the trainer authored the problem in — the picker's default,
  /// not a restriction.
  final String programmingLanguage;

  final String functionSignature;
  final String inputFormat;
  final String outputFormat;

  /// Seconds.
  final int? timeLimit;

  /// Megabytes.
  final int? memoryLimit;

  /// Minutes the learner is given, or null for untimed. Always null in the
  /// captured payloads.
  final int? duration;

  final int sequenceOrder;
  final List<CodingTestCase> sampleTestCases;
  final List<CodingLanguage> allowedLanguages;
  final CodingSubmission? latestSubmission;

  String get title =>
      problemName.trim().isNotEmpty ? problemName.trim() : questionText.trim();

  /// The body of the problem. `description` is the authored statement;
  /// `question_text` is all the roadmap's copy carries.
  String get statement =>
      description.trim().isNotEmpty ? description.trim() : questionText.trim();

  /// True when [questionText] adds something to [statement] rather than
  /// repeating it — the node endpoint sends both, and they are often equal.
  bool get hasSeparatePrompt {
    final String prompt = questionText.trim();
    return prompt.isNotEmpty && prompt != statement;
  }

  /// Never empty: an empty picker would make the screen unusable, so it falls
  /// back to the authored language and then to the OpenAPI enum.
  List<CodingLanguage> get languages {
    if (allowedLanguages.isNotEmpty) return allowedLanguages;
    final List<CodingLanguage> own = CodingLanguage.listFrom(<String>[
      programmingLanguage,
    ]);
    return own.isNotEmpty ? own : CodingLanguage.fallback;
  }

  /// The language the editor opens in: the authored one when it is allowed,
  /// otherwise the first that is.
  String get defaultLanguage {
    final List<CodingLanguage> allowed = languages;
    final String authored = programmingLanguage.trim().toLowerCase();
    for (final CodingLanguage l in allowed) {
      if (l.key == authored) return l.key;
    }
    return allowed.first.key;
  }

  bool get isSolved => latestSubmission?.isAccepted ?? false;

  factory CodingQuestion.fromJson(Map<String, dynamic> json) {
    final Object? submission = _any(json, <String>[
      'latest_submission',
      'last_submission',
    ]);

    return CodingQuestion(
      id: _int(json, <String>['id']) ?? -1,
      nodeId: _int(json, <String>['node']),
      problemName: _str(json, <String>['problem_name', 'title']),
      questionText: _str(json, <String>['question_text']),
      description: _str(json, <String>['description']),
      programmingLanguage: _str(json, <String>['programming_language']),
      functionSignature: _str(json, <String>['function_signature']),
      inputFormat: _str(json, <String>['input_format']),
      outputFormat: _str(json, <String>['output_format']),
      timeLimit: _int(json, <String>['time_limit']),
      memoryLimit: _int(json, <String>['memory_limit']),
      duration: _int(json, <String>['duration']),
      sequenceOrder: _int(json, <String>['sequence_order']) ?? 0,
      sampleTestCases: CodingTestCase.readFrom(json),
      allowedLanguages: CodingLanguage.listFrom(json['allowed_languages']),
      latestSubmission: submission is Map<dynamic, dynamic>
          ? CodingSubmission.fromJson(Map<String, dynamic>.from(submission))
          : null,
    );
  }

  static List<CodingQuestion> listFrom(Object? raw) {
    final List<CodingQuestion> out = _maps(raw)
        .map(CodingQuestion.fromJson)
        .toList();
    out.sort(
      (CodingQuestion a, CodingQuestion b) =>
          a.sequenceOrder.compareTo(b.sequenceOrder),
    );
    return out;
  }
}

/// One test case as the judge reported it.
class CodingCaseResult {
  const CodingCaseResult({
    this.input = '',
    this.expectedOutput = '',
    this.actualOutput = '',
    this.passed = false,
    this.error = '',
    this.status = '',
    this.seconds,
    this.memoryKb,
  });

  final String input;
  final String expectedOutput;
  final String actualOutput;
  final bool passed;

  /// stderr, a runtime message, or a compile error for this case.
  final String error;

  /// The judge's own word for what happened, when it sends one.
  final String status;

  final double? seconds;
  final int? memoryKb;

  factory CodingCaseResult.fromJson(Map<String, dynamic> json) {
    final String expected = _str(json, <String>[
      'expected_output',
      'expected',
      'output_expected',
    ]);
    final String actual = _str(json, <String>[
      'actual_output',
      'output',
      'stdout',
      'actual',
      'received',
    ]);
    final String status = _str(json, <String>['status', 'verdict', 'result']);

    // Believe an explicit flag, then an explicit status, and only then fall
    // back to comparing the strings ourselves.
    final bool? flag = _bool(json, <String>[
      'passed',
      'is_correct',
      'success',
      'correct',
      'is_passed',
    ]);
    final bool ok =
        flag ??
        (status.isNotEmpty
            ? _accepted(status)
            : expected.trim() == actual.trim() && expected.trim().isNotEmpty);

    return CodingCaseResult(
      input: _str(json, <String>['input', 'input_data', 'stdin']),
      expectedOutput: expected,
      actualOutput: actual,
      passed: ok,
      error: _str(json, <String>[
        'error',
        'stderr',
        'message',
        'compile_output',
        'compile_error',
      ]),
      status: status,
      seconds: _double(json, <String>['time', 'time_taken', 'runtime']),
      memoryKb: _int(json, <String>['memory', 'memory_used']),
    );
  }

  static List<CodingCaseResult> listFrom(Object? raw) =>
      _maps(raw).map(CodingCaseResult.fromJson).toList();
}

/// A graded submission.
///
/// Judging is **asynchronous** (PRD FR-ASM-8): `submit/` answers with the
/// submission at `queued` or `running`, and the caller polls
/// `submissions/{id}/` until [isJudged].
class CodingSubmission {
  const CodingSubmission({
    required this.id,
    this.questionId,
    this.language = '',
    this.sourceCode = '',
    this.status = CodingStatus.unknown,
    this.verdict = '',
    this.score,
    this.submittedAt,
    this.results = const <CodingCaseResult>[],
  });

  final int id;
  final int? questionId;
  final String language;
  final String sourceCode;
  final CodingStatus status;
  final String verdict;
  final int? score;
  final DateTime? submittedAt;
  final List<CodingCaseResult> results;

  /// True once the judge has stopped working, so polling can stop. A verdict
  /// or any results also count: a backend that judges synchronously may never
  /// send a `status` at all.
  bool get isJudged =>
      status == CodingStatus.done ||
      status == CodingStatus.error ||
      verdict.trim().isNotEmpty ||
      results.isNotEmpty;

  bool get isAccepted {
    if (verdict.trim().isNotEmpty) return _accepted(verdict);
    if (status == CodingStatus.error) return false;
    return results.isNotEmpty &&
        results.every((CodingCaseResult r) => r.passed);
  }

  int get passedCount => results.where((CodingCaseResult r) => r.passed).length;
  int get totalCount => results.length;

  factory CodingSubmission.fromJson(Map<String, dynamic> json) =>
      CodingSubmission(
        id: _int(json, <String>['id', 'submission_id', 'submission']) ?? -1,
        questionId: _int(json, <String>['question']),
        language: _str(json, <String>['language']),
        sourceCode: _str(json, <String>['source_code']),
        status: CodingStatus.from(_str(json, <String>['status'])),
        verdict: _str(json, <String>['verdict']),
        score: _int(json, <String>['score']),
        submittedAt: DateTime.tryParse(
          _str(json, <String>['submitted_at', 'created_at']),
        ),
        results: CodingCaseResult.listFrom(
          _any(json, <String>['results', 'test_results', 'test_case_results']),
        ),
      );
}

/// The answer to `POST …/run/` — a dry run, never graded.
///
/// With no `stdin` the judge runs the sample cases and answers with a list;
/// with custom `stdin` it runs once and answers with output alone. Both shapes
/// land here, and a compile error may replace either.
class CodingRunResult {
  const CodingRunResult({
    this.cases = const <CodingCaseResult>[],
    this.output = '',
    this.error = '',
    this.status = '',
  });

  final List<CodingCaseResult> cases;

  /// stdout, for a custom-input run.
  final String output;

  /// stderr or the compiler's complaint.
  final String error;

  final String status;

  bool get hasCases => cases.isNotEmpty;
  bool get isEmpty =>
      cases.isEmpty && output.trim().isEmpty && error.trim().isEmpty;
  bool get allPassed =>
      cases.isNotEmpty && cases.every((CodingCaseResult c) => c.passed);
  int get passedCount => cases.where((CodingCaseResult c) => c.passed).length;

  factory CodingRunResult.fromJson(Map<String, dynamic> json) {
    final List<CodingCaseResult> cases = CodingCaseResult.listFrom(
      _any(json, <String>[
        'results',
        'test_results',
        'test_cases',
        'sample_results',
      ]),
    );

    return CodingRunResult(
      cases: cases,
      output: _str(json, <String>['stdout', 'output', 'actual_output']),
      error: _str(json, <String>[
        'stderr',
        'error',
        'compile_output',
        'compile_error',
        'message',
        'detail',
      ]),
      status: _str(json, <String>['status', 'verdict']),
    );
  }

  /// The endpoint is typed as an object, but a judge that answers with a bare
  /// array of cases is just as plausible, and `ApiResponse` hands that back as
  /// `dataList`.
  factory CodingRunResult.fromList(List<Object?> raw) =>
      CodingRunResult(cases: CodingCaseResult.listFrom(raw));
}

/// `accepted`, `Accepted`, `AC`, `passed`, `success` — judges differ, and the
/// verdict is a free-text `CharField` in the schema rather than an enum.
bool _accepted(String verdict) {
  final String v = verdict.trim().toLowerCase().replaceAll(' ', '_');
  if (v.isEmpty) return false;
  if (v == 'ac' || v == 'ok') return true;
  if (v.startsWith('not_') || v.startsWith('un')) return false;
  return v.contains('accept') ||
      v.contains('pass') ||
      v == 'success' ||
      v == 'correct' ||
      v == 'solved';
}
