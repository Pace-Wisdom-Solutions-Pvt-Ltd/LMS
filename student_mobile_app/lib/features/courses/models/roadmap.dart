// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// `GET …/courses/{id}/roadmap/` — the course, its modules, and the lessons
/// ("nodes") inside them.
///
/// The endpoint has **no response schema** in the OpenAPI export; this is built
/// from the captured example.
class Roadmap {
  final int id;
  final String title;
  final String description;
  final bool isCompleted;
  final List<RoadmapModule> modules;

  const Roadmap({
    required this.id,
    required this.title,
    this.description = '',
    this.isCompleted = false,
    this.modules = const <RoadmapModule>[],
  });

  List<RoadmapNode> get allNodes =>
      modules.expand((RoadmapModule m) => m.nodes).toList();

  int get totalNodes => allNodes.length;
  int get completedNodes =>
      allNodes.where((RoadmapNode n) => n.isCompleted).length;

  double get completionPercentage =>
      totalNodes == 0 ? 0 : (completedNodes / totalNodes) * 100;

  /// The first lesson that is open but unfinished — what "Continue" opens and
  /// what the roadmap marks as current.
  RoadmapNode? get currentNode {
    for (final RoadmapNode n in allNodes) {
      if (n.isAccessible && !n.isCompleted) return n;
    }
    return null;
  }

  RoadmapNode? nodeById(int id) {
    for (final RoadmapNode n in allNodes) {
      if (n.id == id) return n;
    }
    return null;
  }

  /// The lesson that has to be finished before [node] opens, for the message
  /// shown when a locked row is tapped.
  RoadmapNode? blockerFor(RoadmapNode node) {
    if (node.prerequisiteNodeId != null) {
      return nodeById(node.prerequisiteNodeId!);
    }
    RoadmapNode? previous;
    for (final RoadmapNode n in allNodes) {
      if (n.id == node.id) return previous;
      if (!n.isCompleted) previous ??= n;
    }
    return previous;
  }

  factory Roadmap.fromJson(Map<String, dynamic> json) => Roadmap(
    id: int.tryParse('${json['id']}') ?? -1,
    title: (json['title'] ?? '').toString(),
    description: (json['description'] ?? '').toString(),
    isCompleted: json['is_completed'] == true,
    modules: (json['modules'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<dynamic, dynamic>>()
        .map(
          (Map<dynamic, dynamic> e) =>
              RoadmapModule.fromJson(Map<String, dynamic>.from(e)),
        )
        .toList(),
  );
}

class RoadmapModule {
  final int id;
  final String title;
  final String description;
  final int sequenceOrder;
  final bool isAccessible;
  final List<RoadmapChapter> chapters;
  final List<RoadmapNode> nodes;

  const RoadmapModule({
    required this.id,
    required this.title,
    this.description = '',
    this.sequenceOrder = 0,
    this.isAccessible = false,
    this.chapters = const <RoadmapChapter>[],
    this.nodes = const <RoadmapNode>[],
  });

  int get completedCount =>
      nodes.where((RoadmapNode n) => n.isCompleted).length;

  /// What the module header prints under `MODULE n · m LESSONS`.
  String get heading => title.trim().isNotEmpty
      ? title.trim()
      : (chapters.isEmpty ? '' : chapters.first.title.trim());

  /// The module's nodes, grouped under the chapters that own them.
  ///
  /// Chapters come in `sequence_order`; each keeps its nodes in the order the
  /// payload listed them. A module with no chapters returns a single group
  /// with a null chapter, so the screen has one shape to render either way.
  ///
  /// **Nothing is ever dropped.** A node whose `chapter` is null, or names a
  /// chapter the module did not send, lands in a trailing null-chapter group —
  /// losing a lesson because its grouping was wrong would be far worse than
  /// showing it outside one.
  List<RoadmapSection> get sections {
    if (chapters.isEmpty) {
      return <RoadmapSection>[RoadmapSection(nodes: nodes)];
    }

    final List<RoadmapChapter> ordered = <RoadmapChapter>[...chapters]
      ..sort(
        (RoadmapChapter a, RoadmapChapter b) =>
            a.sequenceOrder.compareTo(b.sequenceOrder),
      );
    final Set<int> known = ordered.map((RoadmapChapter c) => c.id).toSet();

    final List<RoadmapSection> out = <RoadmapSection>[];
    for (final RoadmapChapter chapter in ordered) {
      final List<RoadmapNode> owned = nodes
          .where((RoadmapNode n) => n.chapterId == chapter.id)
          .toList();
      if (owned.isNotEmpty) {
        out.add(RoadmapSection(chapter: chapter, nodes: owned));
      }
    }

    final List<RoadmapNode> loose = nodes
        .where(
          (RoadmapNode n) =>
              n.chapterId == null || !known.contains(n.chapterId),
        )
        .toList();
    if (loose.isNotEmpty) out.add(RoadmapSection(nodes: loose));

    return out;
  }

  factory RoadmapModule.fromJson(Map<String, dynamic> json) {
    final int moduleId = int.tryParse('${json['id']}') ?? -1;
    return RoadmapModule(
      id: moduleId,
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      sequenceOrder: int.tryParse('${json['sequence_order']}') ?? 0,
      isAccessible: json['is_accessible'] == true,
      chapters: (json['chapters'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<dynamic, dynamic>>()
          .map(
            (Map<dynamic, dynamic> e) =>
                RoadmapChapter.fromJson(Map<String, dynamic>.from(e)),
          )
          .toList(),
      nodes: (json['nodes'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<dynamic, dynamic>>()
          .map(
            (Map<dynamic, dynamic> e) =>
                RoadmapNode.fromJson(Map<String, dynamic>.from(e), moduleId),
          )
          .toList(),
    );
  }
}

/// One row of the roadmap. The glossary calls this a **Lesson**, never a node —
/// "node" is the API's word and stays out of the UI.
class RoadmapNode {
  final int id;
  final int moduleId;

  /// The chapter this node sits under, when the module has any. Null on a
  /// module that does not use them.
  final int? chapterId;

  final String title;
  final String description;
  final int sequenceOrder;
  final int? prerequisiteNodeId;

  /// What the trainer wants the learner to take away, and the shape of the
  /// lesson. Both sit on the roadmap payload, so the expanded row can show
  /// them without waiting on the node endpoint — which matters for quiz,
  /// quiz and coding rows, since they never call it.
  final String focusAreas;
  final String quickOutline;

  final bool hasLearningMaterial;
  final bool hasTask;
  final bool hasQuiz;
  final bool hasAssessment;
  final bool hasCodingQuestions;
  final bool isCompleted;
  final bool isAccessible;

  /// Null until the learner has touched the node. Carries the quiz score,
  /// which is the only place a passed quiz's result appears on the roadmap.
  final NodeProgress? progress;

  /// The quizzes attached here, straight off the roadmap — enough to name the
  /// quiz and state its timer without opening the node endpoint first.
  final List<Quiz> quizzes;

  /// The coding problems on this node, straight off the roadmap — enough to
  /// list them and say how many there are. Their `description` and
  /// `allowed_languages` arrive only from the coding-questions endpoint, which
  /// the coding screen calls for itself.
  final List<CodingQuestion> codingQuestions;

  const RoadmapNode({
    required this.id,
    required this.moduleId,
    this.chapterId,
    required this.title,
    this.description = '',
    this.sequenceOrder = 0,
    this.prerequisiteNodeId,
    this.focusAreas = '',
    this.quickOutline = '',
    this.hasLearningMaterial = false,
    this.hasTask = false,
    this.hasQuiz = false,
    this.hasAssessment = false,
    this.hasCodingQuestions = false,
    this.isCompleted = false,
    this.isAccessible = false,
    this.progress,
    this.quizzes = const <Quiz>[],
    this.codingQuestions = const <CodingQuestion>[],
  });

  Quiz? get quiz => quizzes.isEmpty ? null : quizzes.first;

  /// The score of a quiz the learner has finished, 0..100. Null on a quiz
  /// they have not taken, and on every node that is not a quiz.
  double? get quizScore => progress?.quizScore;

  /// True when the score cleared the quiz's own pass mark. A quiz with no
  /// stated pass mark counts any score as a pass.
  bool get passedQuiz {
    final double? score = quizScore;
    if (score == null) return false;
    return score >= (quiz?.passPercentage ?? 0);
  }

  /// True when there is authored guidance to show. Neither field set means no
  /// container at all, rather than an empty one.
  bool get hasNotes =>
      focusAreas.trim().isNotEmpty || quickOutline.trim().isNotEmpty;

  /// Locked rows render a lock and refuse to open; opening one anyway returns a
  /// 403, which the lesson screen renders as the lock state rather than an error.
  bool get isLocked => !isAccessible;

  LessonKind get kind {
    if (hasQuiz) return LessonKind.quiz;
    if (hasTask) return LessonKind.task;
    if (hasCodingQuestions) return LessonKind.coding;
    return LessonKind.lesson;
  }

  /// True when opening this means leaving the roadmap. Learning material and
  /// quizzes stay in the expanded row; a task or coding
  /// questions each need a screen of their own, and the roadmap refreshes when
  /// the learner comes back.
  bool get opensElsewhere => hasTask || hasAssessment || hasCodingQuestions;

  /// True when the expanded row has to call the node endpoint before it can
  /// show anything.
  ///
  /// **Only learning material does.** A quiz arrives complete on the roadmap,
  /// coding questions come with it too, and an exam node has nothing to
  /// fetch. A task row needs only `has_task` to offer its button — the task
  /// screen fetches the detail itself, so asking for it here was a whole
  /// request spent deciding whether to draw a button.
  bool get needsDetail => hasLearningMaterial;

  factory RoadmapNode.fromJson(Map<String, dynamic> json, [int? moduleId]) =>
      RoadmapNode(
        id: int.tryParse('${json['id']}') ?? -1,
        moduleId: int.tryParse('${json['module']}') ?? moduleId ?? -1,
        chapterId: int.tryParse('${json['chapter']}'),
        title: (json['title'] ?? '').toString(),
        description: (json['description'] ?? '').toString(),
        sequenceOrder: int.tryParse('${json['sequence_order']}') ?? 0,
        prerequisiteNodeId: int.tryParse('${json['prerequisite_node']}'),
        focusAreas: (json['focus_areas'] ?? '').toString(),
        quickOutline: (json['quick_outline'] ?? '').toString(),
        hasLearningMaterial: json['has_learning_material'] == true,
        hasTask: json['has_task'] == true,
        hasQuiz: json['has_quiz'] == true,
        hasAssessment: json['has_assessment'] == true,
        hasCodingQuestions: json['has_coding_questions'] == true,
        isCompleted: json['is_completed'] == true,
        isAccessible: json['is_accessible'] == true,
        progress: json['progress'] is Map
            ? NodeProgress.fromJson(
                Map<String, dynamic>.from(json['progress'] as Map),
              )
            : null,
        quizzes: (json['quizzes'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<dynamic, dynamic>>()
            .map(
              (Map<dynamic, dynamic> e) =>
                  Quiz.fromJson(Map<String, dynamic>.from(e)),
            )
            .toList(),
        codingQuestions: CodingQuestion.listFrom(json['coding_questions']),
      );
}

/// A chapter groups nodes inside a module. The backend models it; the learner
/// never sees it as its own level, so it exists here only as a title fallback.
class RoadmapChapter {
  final int id;
  final String title;
  final String description;
  final int sequenceOrder;

  const RoadmapChapter({
    required this.id,
    this.title = '',
    this.description = '',
    this.sequenceOrder = 0,
  });

  factory RoadmapChapter.fromJson(Map<String, dynamic> json) => RoadmapChapter(
    id: int.tryParse('${json['id']}') ?? -1,
    title: (json['title'] ?? '').toString(),
    description: (json['description'] ?? '').toString(),
    sequenceOrder: int.tryParse('${json['sequence_order']}') ?? 0,
  );
}

/// `progress` on a roadmap node — absent until the learner opens it.
///
/// `is_completed` already says whether the node is done, so the only field
/// here the UI reads is [quizScore]. The other two are parsed because they are
/// in the payload and cost nothing, not because anything shows them.
class NodeProgress {
  final String status;
  final DateTime? lastAccessed;

  /// A percentage, 0..100, and only ever set on a quiz node.
  final double? quizScore;

  const NodeProgress({this.status = '', this.lastAccessed, this.quizScore});

  factory NodeProgress.fromJson(Map<String, dynamic> json) => NodeProgress(
    status: (json['status'] ?? '').toString(),
    lastAccessed: DateTime.tryParse('${json['last_accessed']}'),
    quizScore: double.tryParse('${json['quiz_score']}'),
  );
}

/// One run of lessons under a heading — a chapter's, or none at all.
///
/// A module without chapters produces exactly one of these with a null
/// [chapter], which is what lets the roadmap render both kinds of module
/// through the same code.
class RoadmapSection {
  const RoadmapSection({this.chapter, required this.nodes});

  final RoadmapChapter? chapter;
  final List<RoadmapNode> nodes;
}
