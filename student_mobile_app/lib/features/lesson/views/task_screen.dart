// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:file_picker/file_picker.dart';
import 'package:lms/utils/app_exports.dart';

/// A task: its brief, the form for submitting it, and every attempt so far.
///
/// The screen is **two sections in one scroll**, in this order:
///
///  1. the submission form, open when there is no history and on Re-submit;
///  2. the history, newest first, with an "Under review" banner above it while
///     the newest attempt is still with the trainer.
///
/// Both are drawn from one load — the node for the task, `GET …/task/submit/`
/// for the attempts — so there is no state where half the screen is waiting on
/// the other half. See [TaskViewModel].
class TaskScreen extends StatelessWidget {
  const TaskScreen({
    super.key,
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
  });

  final int courseId;
  final int moduleId;
  final int nodeId;

  @override
  Widget build(BuildContext context) {
    final int orgId = context.read<SessionProvider>().orgId ?? 0;

    return ChangeNotifierProvider<TaskViewModel>(
      create: (_) => TaskViewModel(
        orgId: orgId,
        courseId: courseId,
        moduleId: moduleId,
        nodeId: nodeId,
      )..load(),
      child: const _TaskView(),
    );
  }
}

class _TaskView extends StatefulWidget {
  const _TaskView();

  @override
  State<_TaskView> createState() => _TaskViewState();
}

class _TaskViewState extends State<_TaskView> {
  final TextEditingController _link = TextEditingController();
  final TextEditingController _paragraph = TextEditingController();
  final TextEditingController _code = TextEditingController();

  @override
  void dispose() {
    _link.dispose();
    _paragraph.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _pickFile(TaskViewModel vm) async {
    try {
      // file_picker 13 returns the list directly, and an empty one on cancel.
      final List<PlatformFile> picked = await FilePicker.pickFiles();
      final PlatformFile? file = picked.firstOrNull;
      final String? path = file?.path;
      if (file == null || path == null) return;
      vm.setFile(path, file.name);
    } catch (e) {
      appLogPrint('File pick failed: $e', tag: 'TASK');
    }
  }

  Future<void> _submit(TaskViewModel vm) async {
    FocusScope.of(context).unfocus();
    final bool ok = await vm.submit();
    if (!mounted) return;

    if (!ok) return;
    _link.clear();
    _paragraph.clear();
    _code.clear();
    showAppSnackBar(
      context,
      context.l10n.taskSubmitted,
      tone: ChipTone.success,
    );
  }

  void _startResubmission(TaskViewModel vm) {
    _link.clear();
    _paragraph.clear();
    _code.clear();
    vm.startResubmission();
  }

  @override
  Widget build(BuildContext context) {
    final TaskViewModel vm = context.watch<TaskViewModel>();
    final AppLocalizations l10n = context.l10n;

    return Scaffold(
      appBar: AppTopBar(title: Text(l10n.taskScreenTitle)),
      body: SafeArea(child: _body(context, vm)),
    );
  }

  Widget _body(BuildContext context, TaskViewModel vm) {
    if (vm.isBusy && vm.task == null && !vm.hasHistory) {
      return const ResponsiveBody(child: _TaskSkeleton());
    }

    if (vm.isLocked) {
      return ResponsiveBody(
        child: EmptyState(
          icon: Icons.lock_rounded,
          title: context.l10n.lessonLockedTitle,
          message: context.l10n.lessonLockedGeneric,
        ),
      );
    }

    // One failure, one Retry: the node and the attempts are fetched together
    // because neither half of this screen is drawable without the other.
    if (vm.state == ViewState.error && vm.task == null) {
      return ResponsiveBody(
        child: ErrorCard(message: vm.errorMessage, onRetry: vm.load),
      );
    }

    final TaskDetail? task = vm.task;
    if (task == null) {
      return ResponsiveBody(
        child: EmptyState(
          icon: Icons.assignment_outlined,
          title: context.l10n.nothingToOpen,
        ),
      );
    }

    // A trainer reviews out of the app's sight, so pulling is how a learner
    // asks whether that has happened yet. It reloads both halves — the task
    // can change under them too.
    return RefreshIndicator(
      onRefresh: vm.load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.xxl),
        children: <Widget>[
          ResponsiveBody(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                _TaskBrief(task: task),
                const SizedBox(height: AppSpace.xl),

                // The form slides open over the history, which moves down.
                AnimatedSize(
                  duration: context.reduceMotion
                      ? Duration.zero
                      : AppMotion.sheet,
                  curve: AppMotion.standard,
                  alignment: Alignment.topCenter,
                  child: vm.isComposing
                      ? _SubmissionForm(
                          vm: vm,
                          task: task,
                          link: _link,
                          paragraph: _paragraph,
                          code: _code,
                          onPickFile: () => _pickFile(vm),
                          onSubmit: () => _submit(vm),
                        )
                      : const SizedBox.shrink(),
                ),

                if (vm.hasHistory) ...<Widget>[
                  if (vm.isComposing) const SizedBox(height: AppSpace.xxl),
                  _History(vm: vm, onResubmit: () => _startResubmission(vm)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// What the task asks for. Both states show it — a history still has to say
/// which task it is about.
class _TaskBrief extends StatelessWidget {
  const _TaskBrief({required this.task});

  final TaskDetail task;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      if (task.title.trim().isNotEmpty)
        Text(task.title.trim(), style: context.text.headlineSmall),
      if (task.description.trim().isNotEmpty) ...<Widget>[
        const SizedBox(height: AppSpace.sm),
        // A brief can run to several paragraphs, and all of it above the form
        // pushes the first field off the screen. Same treatment as the
        // roadmap's node description and coding's problem statement.
        ReadMoreText(
          task.description.trim(),
          trimLines: 4,
          trimMode: TrimMode.Line,
          style: context.text.bodyMedium,
          trimCollapsedText: ' ${context.l10n.readMore}',
          trimExpandedText: ' ${context.l10n.readLess}',
          moreStyle: context.text.labelLarge?.copyWith(
            color: context.brand.brandText,
          ),
          lessStyle: context.text.labelLarge?.copyWith(
            color: context.brand.brandText,
          ),
        ),
      ],
      // The trainer's brief. The learner may have nothing to work from
      // without it, so it sits above the form rather than at the end of it.
      if (task.hasAttachment) ...<Widget>[
        const SizedBox(height: AppSpace.lg),
        AppButton(
          label: context.l10n.taskOpenAttachment,
          icon: Icons.attach_file_rounded,
          tone: ChipTone.neutral,
          onPressed: () => openExternalUrl(task.attachmentUrl),
        ),
      ],
    ],
  );
}

/// The inputs the task permits, and the button that sends them.
class _SubmissionForm extends StatelessWidget {
  const _SubmissionForm({
    required this.vm,
    required this.task,
    required this.link,
    required this.paragraph,
    required this.code,
    required this.onPickFile,
    required this.onSubmit,
  });

  final TaskViewModel vm;
  final TaskDetail task;
  final TextEditingController link;
  final TextEditingController paragraph;
  final TextEditingController code;
  final VoidCallback onPickFile;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (task.offersLink) ...<Widget>[
          _FieldLabel(l10n.taskLinkLabel),
          AppTextField(
            hint: l10n.taskLinkHint,
            controller: link,
            prefixIcon: Icons.link_rounded,
            keyboardType: TextInputType.url,
            onChanged: vm.setLink,
          ),
          const SizedBox(height: AppSpace.xs),
          Text(
            l10n.taskLinkHelp,
            style: context.text.bodySmall?.copyWith(color: context.brand.muted),
          ),
          const SizedBox(height: AppSpace.lg),
        ],
        if (task.offersParagraph) ...<Widget>[
          _FieldLabel(l10n.taskParagraphLabel),
          _MultilineField(
            hint: l10n.taskParagraphHint,
            controller: paragraph,
            onChanged: vm.setParagraph,
          ),
          const SizedBox(height: AppSpace.lg),
        ],
        if (task.offersCode) ...<Widget>[
          _FieldLabel(l10n.taskCodeLabel),
          CodeEditor(
            controller: code,
            onChanged: vm.setCode,
            hint: l10n.taskCodeHint,
          ),
          const SizedBox(height: AppSpace.lg),
        ],
        if (task.offersFile) ...<Widget>[
          // The rule only earns its place between two ways of answering.
          if (task.offersLink || task.offersParagraph || task.offersCode)
            const _OrDivider(),
          _FieldLabel(l10n.taskFileLabel),
          _UploadBox(vm: vm, onTap: onPickFile),
          const SizedBox(height: AppSpace.lg),
        ],
        if (vm.state == ViewState.error) ...<Widget>[
          ErrorCard(message: vm.errorMessage),
          const SizedBox(height: AppSpace.lg),
        ],
        AppButton(
          // The same act, named for where the learner is in it.
          label: vm.hasHistory ? l10n.taskResubmitCta : l10n.taskSubmit,
          icon: Icons.cloud_upload_outlined,
          busy: vm.isBusy,
          onPressed: vm.canSubmit ? onSubmit : null,
        ),
        if (vm.hasHistory) ...<Widget>[
          const SizedBox(height: AppSpace.sm),
          AppButton(
            label: l10n.taskCancel,
            tone: ChipTone.neutral,
            onPressed: vm.isBusy ? null : vm.cancelResubmission,
          ),
        ],
      ],
    );
  }
}

/// Every attempt, newest first, under a heading that carries the Re-submit.
class _History extends StatelessWidget {
  const _History({required this.vm, required this.onResubmit});

  final TaskViewModel vm;
  final VoidCallback onResubmit;

  @override
  Widget build(BuildContext context) {
    final TaskSubmission? latest = vm.latest;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        // While the newest attempt is with the trainer, say so above the list
        // rather than leaving the learner to read a status chip for it.
        if (latest != null && latest.isPending && !vm.isComposing) ...<Widget>[
          const _UnderReviewCard(),
          const SizedBox(height: AppSpace.xl),
        ],
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                context.l10n.taskHistoryTitle,
                style: context.text.titleLarge,
              ),
            ),
            // Only when the backend allows another attempt, and only while
            // the form it opens is closed.
            if (vm.canResubmit && !vm.isComposing)
              PressScale(
                onTap: onResubmit,
                child: _ResubmitChip(label: context.l10n.taskResubmit),
              ),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        for (final TaskSubmission s in vm.submissions)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.md),
            child: _AttemptCard(submission: s),
          ),
      ],
    );
  }
}

class _ResubmitChip extends StatelessWidget {
  const _ResubmitChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.md,
        vertical: AppSpace.sm,
      ),
      decoration: BoxDecoration(
        color: brand.brandFill,
        borderRadius: BorderRadius.circular(AppRadius.chip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(Icons.refresh_rounded, size: 16, color: brand.onBrand),
          const SizedBox(width: AppSpace.xs),
          Text(
            label,
            style: context.text.labelLarge?.copyWith(
              color: brand.onBrand,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _UnderReviewCard extends StatelessWidget {
  const _UnderReviewCard();

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return Container(
      padding: const EdgeInsets.all(AppSpace.lg),
      decoration: BoxDecoration(
        color: brand.warningContainer,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.hourglass_bottom_rounded, color: brand.warning),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  context.l10n.taskUnderReviewTitle,
                  style: context.text.titleMedium?.copyWith(
                    color: brand.warning,
                  ),
                ),
                const SizedBox(height: AppSpace.xxs),
                Text(
                  context.l10n.taskUnderReviewBody,
                  style: context.text.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One attempt: where it landed, when, what was sent, and what came back.
class _AttemptCard extends StatelessWidget {
  const _AttemptCard({required this.submission});

  final TaskSubmission submission;

  @override
  Widget build(BuildContext context) {
    final TaskSubmission s = submission;
    final BrandColors brand = context.brand;
    final double? score = s.awardedScore;

    // The status is named as the backend names it. "Needs changes" was a step
    // in a tracker giving an instruction; a history entry reports what
    // happened to that attempt.
    final (String label, Color colour, IconData icon) = switch (s.status) {
      TaskStatus.approved => (
        context.l10n.taskStatusApproved,
        brand.success,
        Icons.verified_rounded,
      ),
      TaskStatus.rejected => (
        context.l10n.taskStatusRejected,
        brand.danger,
        Icons.error_outline_rounded,
      ),
      _ => (
        context.l10n.taskStatusPending,
        brand.warning,
        Icons.hourglass_bottom_rounded,
      ),
    };

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // Status and its attempt number together on the left — they are one
          // fact, "the second attempt was rejected" — with the date on the
          // right, where the number used to sit.
          Row(
            children: <Widget>[
              Icon(icon, size: 18, color: colour),
              const SizedBox(width: AppSpace.sm),
              Text(
                label,
                style: context.text.titleMedium?.copyWith(color: colour),
              ),
              const SizedBox(width: AppSpace.xs),
              Text(
                context.l10n.taskAttempt(s.attemptNumber),
                style: tabular(
                  context.text.labelMedium!.copyWith(color: brand.muted),
                ),
              ),
              if (s.submittedAt != null)
                Expanded(
                  child: Text(
                    formatDateTime(s.submittedAt!),
                    textAlign: TextAlign.end,
                    style: tabular(context.text.bodySmall!),
                  ),
                ),
            ],
          ),

          // The verdict before the evidence: the score and the trainer's words
          // are what the learner opened this card for.
          if (score != null) ...<Widget>[
            const SizedBox(height: AppSpace.md),
            Row(
              children: <Widget>[
                Text(
                  '${score.round()}',
                  style: tabular(
                    context.text.titleLarge!.copyWith(color: colour),
                  ),
                ),
                const SizedBox(width: AppSpace.xs),
                Text(context.l10n.taskScore, style: context.text.bodySmall),
              ],
            ),
          ],

          if (s.feedback.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.md),
            Container(
              padding: const EdgeInsets.all(AppSpace.md),
              decoration: BoxDecoration(
                color: context.colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppRadius.tile),
                border: Border(left: BorderSide(color: colour, width: 3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    context.l10n.taskFeedback,
                    style: context.text.labelSmall,
                  ),
                  const SizedBox(height: AppSpace.xxs),
                  Text(s.feedback.trim(), style: context.text.bodyMedium),
                ],
              ),
            ),
          ],

          // What the learner actually sent, last: a resubmission without it is
          // a guess at what the previous one said.
          if (s.hasWork) ...<Widget>[
            const SizedBox(height: AppSpace.lg),
            _SubmittedWork(submission: s),
          ],
        ],
      ),
    );
  }
}

/// The payload of one attempt, read back and **labelled**.
///
/// Each piece says what it is before it shows it: a bare URL, a paragraph and
/// a block of code stacked unlabelled left the learner working out which was
/// which from the shape of it.
class _SubmittedWork extends StatelessWidget {
  const _SubmittedWork({required this.submission});

  final TaskSubmission submission;

  @override
  Widget build(BuildContext context) {
    final TaskSubmission s = submission;
    final AppLocalizations l10n = context.l10n;
    final String? link = s.link?.trim();
    final String? paragraph = s.paragraph?.trim();
    final String? code = s.code;
    final String file = s.fileUrlOrEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(l10n.taskSubmittedWork, style: context.text.labelSmall),

        // In the order the form offers them, so an attempt reads the way it
        // was written.
        if (link != null && link.isNotEmpty) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          _WorkLabel(l10n.taskWorkLink),
          _WorkRow(
            icon: Icons.link_rounded,
            label: link,
            onTap: () => openExternalUrl(link),
          ),
        ],

        if (paragraph != null && paragraph.isNotEmpty) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          _WorkLabel(l10n.taskWorkAnswer),
          Text(paragraph, style: context.text.bodyMedium),
        ],

        if (code != null && code.trim().isNotEmpty) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          _WorkLabel(l10n.taskWorkCode),
          CodeBlock(text: code),
        ],

        if (file.isNotEmpty) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          _WorkLabel(l10n.taskWorkFile),
          _WorkRow(
            icon: Icons.description_outlined,
            label: l10n.taskViewFile,
            onTap: () => openExternalUrl(file),
          ),
        ],
      ],
    );
  }
}

/// `Code:` — what the thing below it is.
class _WorkLabel extends StatelessWidget {
  const _WorkLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.xxs),
    child: Text(
      label,
      style: context.text.labelMedium?.copyWith(color: context.brand.muted),
    ),
  );
}

class _WorkRow extends StatelessWidget {
  const _WorkRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => PressScale(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
      child: Row(
        children: <Widget>[
          Icon(icon, size: 16, color: context.brand.brandText),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.text.bodyMedium?.copyWith(
                color: context.brand.brandText,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// `.drop` — the dashed upload box from the design.
class _UploadBox extends StatelessWidget {
  const _UploadBox({required this.vm, required this.onTap});

  final TaskViewModel vm;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final bool picked = vm.hasFile;

    return PressScale(
      onTap: onTap,
      child: DottedBorderBox(
        child: Column(
          children: <Widget>[
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: context.colors.surface,
                shape: BoxShape.circle,
              ),
              child: Icon(
                picked
                    ? Icons.description_rounded
                    : Icons.cloud_upload_outlined,
                color: brand.brandText,
              ),
            ),
            const SizedBox(height: AppSpace.md),
            Text(
              picked ? (vm.fileName ?? '') : context.l10n.taskUploadCta,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.text.titleMedium?.copyWith(color: brand.brandText),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.drop` — a dashed container.
class DottedBorderBox extends StatelessWidget {
  const DottedBorderBox({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(
      horizontal: AppSpace.lg,
      vertical: AppSpace.xxl,
    ),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(AppRadius.card),
      border: Border.all(
        color: context.colors.outline,
        width: 1.5,
        // Flutter has no dashed border; the design's dash reads as a
        // lighter, wider rule at this size.
        strokeAlign: BorderSide.strokeAlignInside,
      ),
      color: context.colors.surfaceContainerHighest,
    ),
    child: child,
  );
}

/// A rule with OR in it, between the typed answers and the uploaded one.
class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.lg),
    child: Row(
      children: <Widget>[
        Expanded(child: Divider(color: context.colors.outline)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
          child: Text(
            context.l10n.taskOr,
            style: context.text.labelSmall?.copyWith(
              letterSpacing: 1.2,
              color: context.brand.muted,
            ),
          ),
        ),
        Expanded(child: Divider(color: context.colors.outline)),
      ],
    ),
  );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.xs),
    child: Text(
      label,
      style: context.text.bodySmall?.copyWith(
        fontSize: fs(13),
        fontWeight: FontWeight.w600,
        color: context.brand.muted,
      ),
    ),
  );
}

/// A bordered multi-line box, for the written answer.
class _MultilineField extends StatelessWidget {
  const _MultilineField({
    required this.hint,
    required this.controller,
    required this.onChanged,
  });

  final String hint;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(AppRadius.input),
      border: Border.all(color: context.colors.outline, width: 1.5),
    ),
    child: TextField(
      controller: controller,
      onChanged: onChanged,
      maxLines: 5,
      minLines: 3,
      style: context.text.bodyMedium,
      decoration: InputDecoration(
        hintText: hint,
        border: InputBorder.none,
        contentPadding: const EdgeInsets.all(AppSpace.md),
      ),
    ),
  );
}

class _TaskSkeleton extends StatelessWidget {
  const _TaskSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const SizedBox(height: AppSpace.md),
          const SkeletonBox(height: 20),
          const SizedBox(height: AppSpace.sm),
          const SkeletonBox(height: 70),
          const SizedBox(height: AppSpace.xl),
          for (int i = 0; i < 3; i++) ...<Widget>[
            const SkeletonBox(height: AppSpace.lg),
            const SizedBox(height: AppSpace.xs),
            const SkeletonBox(height: 54),
            const SizedBox(height: AppSpace.lg),
          ],
          const SkeletonBox(height: 50, radius: AppRadius.button),
          const SizedBox(height: AppSpace.xxl),
          const SkeletonBox(height: 20),
          for (int i = 0; i < 5; i++) ...[
            const SizedBox(height: AppSpace.md),
            const SkeletonBox(height: 60),
          ],
          const SizedBox(height: AppSpace.md),
        ],
      ),
    ),
  );
}
