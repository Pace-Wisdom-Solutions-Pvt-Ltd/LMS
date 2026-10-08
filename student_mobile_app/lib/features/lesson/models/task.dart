// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:file_picker/file_picker.dart';
import 'package:lms/utils/app_exports.dart';

/// The task attached to a lesson: what the learner submits for a trainer.
///
/// Only the inputs the task permits are rendered — the `allow_*` flags decide
/// whether the form offers a link, a paragraph, code, a file, or a combination.
class TaskDetail {
  final int id;
  final String title;
  final String description;

  /// A brief, rubric or starting file the trainer attached. Without it the
  /// learner may have nothing to work from, so it is not optional decoration.
  final String? attachment;

  final bool allowLink;
  final bool allowParagraph;
  final bool allowCode;
  final bool allowFile;

  /// `allow_pdf` and `allow_screenshot` are file uploads with the type
  /// narrowed. The app has one file picker, so they widen [offersFile] rather
  /// than adding inputs of their own — and narrow what it will accept, through
  /// [filePickerSpec].
  final bool allowPdf;
  final bool allowScreenshot;

  final double? maxScore;

  const TaskDetail({
    required this.id,
    this.title = '',
    this.description = '',
    this.attachment,
    this.allowLink = false,
    this.allowParagraph = false,
    this.allowCode = false,
    this.allowFile = false,
    this.allowPdf = false,
    this.allowScreenshot = false,
    this.maxScore,
  });

  bool get hasAttachment => attachmentUrl.isNotEmpty;

  /// The trainer's brief, trimmed, or empty when there is none — so a caller
  /// tests the string it is about to use rather than a flag beside it.
  String get attachmentUrl => (attachment ?? '').trim();

  /// A task with no flags set would render an empty form; treat that as
  /// "anything goes" rather than showing nothing.
  bool get hasNoStatedInputs =>
      !allowLink &&
      !allowParagraph &&
      !allowCode &&
      !allowFile &&
      !allowPdf &&
      !allowScreenshot;

  bool get offersLink => allowLink || hasNoStatedInputs;
  bool get offersParagraph => allowParagraph || hasNoStatedInputs;
  bool get offersCode => allowCode || hasNoStatedInputs;
  bool get offersFile =>
      allowFile || allowPdf || allowScreenshot || hasNoStatedInputs;

  /// True when the task names no narrower kind, so anything is fair game.
  ///
  /// `allow_file` *is* "any file", and a task with no flags at all is treated
  /// as permissive by [hasNoStatedInputs]; either way the picker is not
  /// filtered.
  bool get _acceptsAnyFile => allowFile || hasNoStatedInputs;

  /// Images the picker should offer when it cannot simply ask for
  /// [FileType.image] — a screenshot alongside a PDF, which needs one custom
  /// filter covering both.
  static const List<String> _imageExtensions = <String>[
    'jpg',
    'jpeg',
    'png',
    'heic',
    'webp',
  ];

  /// What the one file picker should accept for this task.
  ///
  /// The flags are independent and arrive in any combination, so the rule is:
  /// **any file wins**, and otherwise the narrowing is real and the picker is
  /// told about it. A learner whose task takes only a PDF should find that out
  /// in the file browser, not after uploading a `.docx` and waiting for a
  /// trainer to reject it.
  ///
  /// `extensions` is non-null only for [FileType.custom], which is the only
  /// type `file_picker` reads it for.
  ({FileType type, List<String>? extensions}) get filePickerSpec {
    if (_acceptsAnyFile) {
      return (type: FileType.any, extensions: null);
    }
    if (allowPdf && allowScreenshot) {
      return (
        type: FileType.custom,
        extensions: <String>['pdf', ..._imageExtensions],
      );
    }
    if (allowPdf) {
      return (type: FileType.custom, extensions: <String>['pdf']);
    }
    if (allowScreenshot) {
      // Screenshot only: the picker has a type for it, so no extension list.
      return (type: FileType.image, extensions: null);
    }
    return (type: FileType.any, extensions: null);
  }

  /// The field's label: the kinds this task takes, as the learner reads them —
  /// `File`, `PDF`, `Screenshot`, or `File/PDF` and so on when it takes
  /// several.
  ///
  /// Ordered widest first, so a combination reads `File/PDF` rather than
  /// `PDF/File`, and never lists a kind the task did not ask for.
  String fileLabel(AppLocalizations l10n) {
    final List<String> kinds = <String>[
      if (allowFile) l10n.taskFileKindFile,
      if (allowPdf) l10n.taskFileKindPdf,
      if (allowScreenshot) l10n.taskFileKindScreenshot,
    ];
    // Nothing stated, so the form is offering a file on the permissive path.
    if (kinds.isEmpty) return l10n.taskFileKindFile;
    return kinds.join('/');
  }

  factory TaskDetail.fromJson(Map<String, dynamic> json) => TaskDetail(
    id: int.tryParse('${json['id']}') ?? -1,
    title: (json['title'] ?? '').toString(),
    description: (json['description'] ?? '').toString(),
    attachment: json['attachment'] as String?,
    allowLink: json['allow_link'] == true,
    allowParagraph: json['allow_paragraph'] == true,
    // The API's field is **`allow_code_block`** — there is no `allow_code` in
    // the schema. Reading only the latter meant the code box appeared solely
    // through `hasNoStatedInputs`, so a task that explicitly permitted code
    // and anything else offered no way to enter it. `allow_code` stays as a
    // tolerated alias.
    allowCode: json['allow_code_block'] == true || json['allow_code'] == true,
    allowFile: json['allow_file'] == true || json['allow_file_upload'] == true,
    allowPdf: json['allow_pdf'] == true,
    allowScreenshot: json['allow_screenshot'] == true,
    maxScore: double.tryParse('${json['max_score']}'),
  );
}

/// A submission and where it stands in the trainer's review.
class TaskSubmission {
  final int id;
  final String taskTitle;
  final TaskStatus status;
  final String feedback;
  final double? awardedScore;
  final DateTime? submittedAt;
  final DateTime? gradedAt;
  final int attemptNumber;
  final bool canResubmit;

  /// True when this attempt followed an earlier one.
  final bool isResubmission;
  final Map<String, dynamic> payload;
  final String? fileUrl;

  const TaskSubmission({
    required this.id,
    this.taskTitle = '',
    this.status = TaskStatus.unknown,
    this.feedback = '',
    this.awardedScore,
    this.submittedAt,
    this.gradedAt,
    this.attemptNumber = 1,
    this.canResubmit = false,
    this.isResubmission = false,
    this.payload = const <String, dynamic>{},
    this.fileUrl,
  });

  bool get isPending => status == TaskStatus.pending;
  bool get isApproved => status == TaskStatus.approved;
  bool get isRejected => status == TaskStatus.rejected;
  bool get isReviewed => isApproved || isRejected;

  String? get link => payload['link'] as String?;
  String? get paragraph => payload['paragraph'] as String?;
  String? get code => payload['code'] as String?;

  String get fileUrlOrEmpty => (fileUrl ?? '').trim();

  /// True when this attempt carries something to read back — asked once, so a
  /// card does not test four fields to decide whether to draw a heading.
  bool get hasWork =>
      (link ?? '').trim().isNotEmpty ||
      (paragraph ?? '').trim().isNotEmpty ||
      (code ?? '').trim().isNotEmpty ||
      fileUrlOrEmpty.isNotEmpty;

  /// Reads a flag that may arrive as a bool, a string or a number.
  static bool _flag(Object? value) => switch (value) {
    bool v => v,
    num v => v != 0,
    String v => <String>['true', '1', 'yes'].contains(v.trim().toLowerCase()),
    _ => false,
  };

  static TaskStatus _status(String raw) => switch (raw.toLowerCase()) {
    'pending' || 'submitted' || 'in_review' => TaskStatus.pending,
    'approved' || 'accepted' || 'graded' => TaskStatus.approved,
    'rejected' || 'declined' => TaskStatus.rejected,
    _ => TaskStatus.unknown,
  };

  factory TaskSubmission.fromJson(Map<String, dynamic> json) => TaskSubmission(
    id: int.tryParse('${json['submission_id'] ?? json['id']}') ?? -1,
    taskTitle: (json['task_title'] ?? json['node_title'] ?? '').toString(),
    status: _status((json['status'] ?? '').toString()),
    feedback: (json['feedback'] ?? '').toString(),
    awardedScore: double.tryParse('${json['awarded_score']}'),
    submittedAt: DateTime.tryParse('${json['submitted_at']}'),
    gradedAt: DateTime.tryParse('${json['graded_at']}'),
    attemptNumber: int.tryParse('${json['attempt_number']}') ?? 1,
    // `can_resubmit`, `attempt_number` and `is_resubmission` are declared as
    // **strings** in the schema — DRF method fields with no type hint — so
    // whether the JSON carries `true` or `"true"` is not knowable from it.
    // `== true` would have hidden the Resubmit button on half of those.
    canResubmit: _flag(json['can_resubmit']),
    isResubmission: _flag(json['is_resubmission']),
    payload: json['payload'] is Map
        ? Map<String, dynamic>.from(json['payload'] as Map)
        : const <String, dynamic>{},
    fileUrl:
        (json['submission_file_url'] ?? json['submission_file']) as String?,
  );
}
