// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Coding practice for one lesson node: the problem, the editor, Run and
/// Submit.
///
/// Pushed from the roadmap on the root navigator, so the tab bar is absent.
/// It takes ids rather than a payload, because the roadmap's embedded copy of a
/// problem has no `description` and no `allowed_languages` — the full shape
/// only comes from `GET …/coding-questions/`, which this screen calls for
/// itself. That also makes the route deep-linkable.
///
/// A node can carry several problems (the captured payload has two). They are
/// tabs across the top, and each keeps its own code, language and last result.
class CodingScreen extends StatelessWidget {
  const CodingScreen({
    super.key,
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
    this.nodeTitle = '',
  });

  final int courseId;
  final int moduleId;
  final int nodeId;

  /// The lesson's title, for the app bar. Empty on a deep link, which falls
  /// back to the generic heading — the coding-questions endpoint names each
  /// problem but never the node, and the problem names are already the tabs.
  final String nodeTitle;

  @override
  Widget build(BuildContext context) {
    final int orgId = context.read<SessionProvider>().orgId ?? 0;

    return ChangeNotifierProvider<CodingViewModel>(
      create: (_) => CodingViewModel(
        orgId: orgId,
        courseId: courseId,
        moduleId: moduleId,
        nodeId: nodeId,
      )..load(),
      child: _CodingView(nodeTitle: nodeTitle),
    );
  }
}

class _CodingView extends StatefulWidget {
  const _CodingView({required this.nodeTitle});

  final String nodeTitle;

  @override
  State<_CodingView> createState() => _CodingViewState();
}

class _CodingViewState extends State<_CodingView> {
  final TextEditingController _code = TextEditingController();
  final TextEditingController _stdin = TextEditingController();
  late final CodingViewModel _vm;

  @override
  void initState() {
    super.initState();
    _vm = context.read<CodingViewModel>();
    // The view model owns the text, keyed by question id; the controllers are
    // just the two fields currently on screen. Syncing from a listener rather
    // than from `build` keeps `controller.text =` out of the build phase,
    // where it would fight the gutter's ValueListenableBuilder.
    _vm.addListener(_syncFromViewModel);
  }

  @override
  void dispose() {
    _vm.removeListener(_syncFromViewModel);
    _code.dispose();
    _stdin.dispose();
    super.dispose();
  }

  void _syncFromViewModel() {
    final CodingQuestion? question = _vm.current;
    if (question == null) return;
    _assign(_code, _vm.codeFor(question.id));
    _assign(_stdin, _vm.stdinFor(question.id));
  }

  /// Only ever writes when the two have actually diverged, which happens when
  /// the **view model** changed the text — starter code arriving, or a switch
  /// to another problem. Typing keeps them equal, so the caret never jumps.
  void _assign(TextEditingController controller, String value) {
    if (controller.text == value) return;
    controller.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  Future<void> _submit(CodingQuestion question) async {
    final bool accepted = await context.read<CodingViewModel>().submit(
      question,
    );
    if (!mounted || !accepted) return;
    showAppSnackBar(
      context,
      context.l10n.codingAcceptedToast,
      tone: ChipTone.success,
    );
  }

  @override
  Widget build(BuildContext context) {
    final CodingViewModel vm = context.watch<CodingViewModel>();
    final CodingQuestion? question = vm.current;

    return Scaffold(
      appBar: AppTopBar(
        // The lesson names the screen; the problems name the tabs.
        title: Text(
          widget.nodeTitle.trim().isNotEmpty
              ? widget.nodeTitle.trim()
              : context.l10n.codingTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(child: _body(context, vm, question)),
      bottomNavigationBar: question == null
          ? null
          : _Actions(question: question, onSubmit: () => _submit(question)),
    );
  }

  Widget _body(
    BuildContext context,
    CodingViewModel vm,
    CodingQuestion? question,
  ) {
    if (vm.isBusy && !vm.loadedOnce) {
      return const SingleChildScrollView(
        child: ResponsiveBody(child: _CodingSkeleton()),
      );
    }

    // A locked node answers 403 from every one of these endpoints. That is a
    // lock, not a failure.
    if (vm.locked) {
      return ResponsiveBody(
        child: EmptyState(
          icon: Icons.lock_rounded,
          title: context.l10n.lessonLockedTitle,
          message: context.l10n.lessonLockedGeneric,
        ),
      );
    }

    if (vm.state == ViewState.error) {
      return ResponsiveBody(
        child: ErrorCard(
          message: vm.errorMessage,
          onRetry: () => vm.load(refresh: true),
        ),
      );
    }

    if (question == null) {
      return ResponsiveBody(
        child: EmptyState(
          icon: Icons.code_rounded,
          title: context.l10n.codingTitle,
          message: context.l10n.codingNoProblems,
        ),
      );
    }

    final CodingRunResult? run = vm.runFor(question.id);
    final CodingSubmission? submission = vm.submissionFor(question.id);
    final String? error = vm.actionErrorFor(question.id);

    return ListView(
      padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.xxl),
      children: <Widget>[
        ResponsiveBody(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              if (vm.questions.length > 1) ...<Widget>[
                _ProblemTabs(vm: vm),
                const SizedBox(height: AppSpace.lg),
              ],
              _ProblemCard(question: question, solved: vm.isSolved(question)),
              if (question.sampleTestCases.isNotEmpty) ...<Widget>[
                const SizedBox(height: AppSpace.md),
                _SamplesCard(cases: question.sampleTestCases),
              ],
              const SizedBox(height: AppSpace.md),
              _LanguageRow(question: question),
              const SizedBox(height: AppSpace.md),
              _EditorSection(question: question, controller: _code),
              const SizedBox(height: AppSpace.md),
              _CustomInputSection(question: question, controller: _stdin),
              if (error != null) ...<Widget>[
                const SizedBox(height: AppSpace.md),
                ErrorCard(message: error),
              ],
              if (run != null) ...<Widget>[
                const SizedBox(height: AppSpace.md),
                _RunResultCard(result: run),
              ],
              if (submission != null) ...<Widget>[
                const SizedBox(height: AppSpace.md),
                _SubmissionCard(
                  submission: submission,
                  grading: vm.isSubmitting(question.id),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// One tab per problem, with a tick on the ones already accepted.
class _ProblemTabs extends StatelessWidget {
  const _ProblemTabs({required this.vm});

  final CodingViewModel vm;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Text(
        context.l10n.codingProblemOf(vm.index + 1, vm.questions.length),
        style: context.text.labelSmall?.copyWith(color: context.brand.muted),
      ),
      const SizedBox(height: AppSpace.sm),
      SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: vm.questions.length,
          separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
          itemBuilder: (BuildContext context, int i) {
            final CodingQuestion q = vm.questions[i];
            final bool active = i == vm.index;
            final bool solved = vm.isSolved(q);
            final Color fg = active
                ? context.theme.scaffoldBackgroundColor
                : context.brand.muted;

            return PressScale(
              // Keyed by question id: the tab's only visible text is its
              // number, which the editor's line gutter also prints.
              key: ValueKey<int>(q.id),
              onTap: () => vm.select(i),
              child: Semantics(
                selected: active,
                button: true,
                child: AnimatedContainer(
                  duration: AppMotion.fadeIn,
                  curve: AppMotion.standard,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: active
                        ? context.colors.onSurface
                        : context.colors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.chip),
                    border: Border.all(
                      color: active
                          ? context.colors.onSurface
                          : context.colors.outline,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      if (solved) ...<Widget>[
                        Icon(
                          Icons.check_circle_rounded,
                          size: 15,
                          color: active ? fg : context.brand.success,
                        ),
                        const SizedBox(width: 6),
                      ],
                      Text(
                        '${i + 1}',
                        style: tabular(
                          context.text.labelLarge!.copyWith(
                            color: fg,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    ],
  );
}

/// The statement, the formats and the limits.
class _ProblemCard extends StatelessWidget {
  const _ProblemCard({required this.question, required this.solved});

  final CodingQuestion question;
  final bool solved;

  @override
  Widget build(BuildContext context) {
    final int? seconds = question.timeLimit;
    final int? memory = question.memoryLimit;
    final int? minutes = question.duration;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(question.title, style: context.text.titleLarge),
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: <Widget>[
              if (solved)
                AppChip(
                  label: context.l10n.codingSolved,
                  icon: Icons.check_circle_rounded,
                  tone: ChipTone.success,
                ),
              if (seconds != null && seconds > 0)
                AppChip(
                  label: context.l10n.codingTimeLimit(seconds),
                  icon: Icons.timer_outlined,
                ),
              if (memory != null && memory > 0)
                AppChip(
                  label: context.l10n.codingMemoryLimit(memory),
                  icon: Icons.memory_rounded,
                ),
              if (minutes != null && minutes > 0)
                AppChip(
                  label: context.l10n.quizMinutes(minutes),
                  icon: Icons.schedule_rounded,
                  tone: ChipTone.warning,
                ),
            ],
          ),
          if (question.hasSeparatePrompt) ...<Widget>[
            const SizedBox(height: AppSpace.md),
            Text(question.questionText.trim(), style: context.text.titleSmall),
          ],
          if (question.statement.isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.sm),
            ReadMoreText(
              question.statement,
              trimLines: 5,
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
          if (question.inputFormat.trim().isNotEmpty)
            _Format(
              label: context.l10n.codingInputFormat,
              body: question.inputFormat.trim(),
            ),
          if (question.outputFormat.trim().isNotEmpty)
            _Format(
              label: context.l10n.codingOutputFormat,
              body: question.outputFormat.trim(),
            ),
        ],
      ),
    );
  }
}

class _Format extends StatelessWidget {
  const _Format({required this.label, required this.body});

  final String label;
  final String body;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.md),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label.toUpperCase(),
          style: context.text.labelSmall?.copyWith(
            color: context.brand.muted,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: AppSpace.xxs),
        Text(body, style: context.text.bodySmall),
      ],
    ),
  );
}

/// The sample cases — the only ones the learner is allowed to see.
class _SamplesCard extends StatelessWidget {
  const _SamplesCard({required this.cases});

  final List<CodingTestCase> cases;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(context.l10n.codingSamples, style: context.text.titleMedium),
        for (int i = 0; i < cases.length; i++) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          Text(
            context.l10n.codingCase(i + 1),
            style: context.text.labelSmall?.copyWith(
              color: context.brand.muted,
            ),
          ),
          const SizedBox(height: AppSpace.xxs),
          _Labelled(
            label: context.l10n.codingSampleInput,
            child: CodeBlock(text: cases[i].input),
          ),
          const SizedBox(height: AppSpace.xs),
          _Labelled(
            label: context.l10n.codingSampleOutput,
            child: CodeBlock(text: cases[i].expectedOutput),
          ),
        ],
      ],
    ),
  );
}

class _Labelled extends StatelessWidget {
  const _Labelled({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Text(
        label,
        style: context.text.labelSmall?.copyWith(color: context.brand.muted),
      ),
      const SizedBox(height: AppSpace.xxs),
      child,
    ],
  );
}

/// Chips rather than a dropdown: there are at most six languages, and a chip
/// row shows every option at once instead of hiding five behind a tap.
class _LanguageRow extends StatelessWidget {
  const _LanguageRow({required this.question});

  final CodingQuestion question;

  @override
  Widget build(BuildContext context) {
    final CodingViewModel vm = context.watch<CodingViewModel>();
    final String selected = vm.languageFor(question);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          context.l10n.codingLanguage,
          style: context.text.labelMedium?.copyWith(color: context.brand.muted),
        ),
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: <Widget>[
            for (final CodingLanguage language in question.languages)
              PressScale(
                onTap: () => vm.setLanguage(question, language.key),
                child: Semantics(
                  selected: language.key == selected,
                  button: true,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: language.key == selected
                          ? context.brand.brandSoft
                          : context.colors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                      border: Border.all(
                        color: language.key == selected
                            ? context.brand.brandText
                            : context.colors.outline,
                      ),
                    ),
                    child: Text(
                      language.label,
                      style: context.text.labelLarge?.copyWith(
                        color: language.key == selected
                            ? context.brand.brandText
                            : context.colors.onSurface,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _EditorSection extends StatelessWidget {
  const _EditorSection({required this.question, required this.controller});

  final CodingQuestion question;
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final CodingViewModel vm = context.watch<CodingViewModel>();
    final bool loading = vm.isLoadingStarter(question.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                context.l10n.codingEditorLabel,
                style: context.text.labelMedium?.copyWith(
                  color: context.brand.muted,
                ),
              ),
            ),
            if (loading) ...<Widget>[
              const SizedBox(
                width: 13,
                height: 13,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: AppSpace.sm),
              Text(
                context.l10n.codingStarterLoading,
                style: context.text.labelSmall?.copyWith(
                  color: context.brand.muted,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        CodeEditor(
          controller: controller,
          hint: context.l10n.codingEditorHint,
          semanticLabel: context.l10n.codingEditorLabel,
          onChanged: (String value) => vm.setCode(question.id, value),
        ),
      ],
    );
  }
}

/// Custom stdin, folded away until asked for — most runs go against the
/// samples, and an always-open second editor doubles the scroll.
class _CustomInputSection extends StatefulWidget {
  const _CustomInputSection({required this.question, required this.controller});

  final CodingQuestion question;
  final TextEditingController controller;

  @override
  State<_CustomInputSection> createState() => _CustomInputSectionState();
}

class _CustomInputSectionState extends State<_CustomInputSection> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final CodingViewModel vm = context.watch<CodingViewModel>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(
          button: true,
          expanded: _open,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _open = !_open),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    context.l10n.codingCustomInput,
                    style: context.text.labelMedium?.copyWith(
                      color: context.brand.muted,
                    ),
                  ),
                ),
                AnimatedRotation(
                  turns: _open ? 0.5 : 0,
                  duration: AppMotion.fadeIn,
                  child: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: context.brand.muted,
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedSize(
          duration: AppMotion.fadeIn,
          curve: AppMotion.standard,
          alignment: Alignment.topCenter,
          child: _open
              ? Padding(
                  padding: const EdgeInsets.only(top: AppSpace.sm),
                  child: CodeEditor(
                    controller: widget.controller,
                    hint: context.l10n.codingCustomInputHint,
                    semanticLabel: context.l10n.codingCustomInput,
                    showLineNumbers: false,
                    minLines: 2,
                    maxLines: 6,
                    onChanged: (String value) =>
                        vm.setStdin(widget.question.id, value),
                  ),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }
}

/// Run and Submit, pinned to the bottom so they survive a long statement.
class _Actions extends StatelessWidget {
  const _Actions({required this.question, required this.onSubmit});

  final CodingQuestion question;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final CodingViewModel vm = context.watch<CodingViewModel>();
    final bool hasCode = vm.codeFor(question.id).trim().isNotEmpty;
    final bool running = vm.isRunning(question.id);
    final bool submitting = vm.isSubmitting(question.id);
    final bool idle = !running && !submitting;

    return Container(
      decoration: BoxDecoration(
        color: context.theme.scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: context.colors.outline)),
      ),
      padding: EdgeInsets.only(
        left: context.gutter,
        right: context.gutter,
        top: AppSpace.md,
        bottom: AppSpace.md + context.viewPadding.bottom,
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: AppButton(
              label: running
                  ? context.l10n.codingRunning
                  : context.l10n.codingRun,
              icon: Icons.play_arrow_rounded,
              tone: ChipTone.neutral,
              busy: running,
              onPressed: hasCode && idle ? () => vm.run(question) : null,
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: AppButton(
              label: submitting
                  ? context.l10n.codingGrading
                  : context.l10n.codingSubmit,
              icon: Icons.check_rounded,
              busy: submitting,
              onPressed: hasCode && idle ? onSubmit : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// A dry run's answer: the sample cases, or the output of one custom run.
class _RunResultCard extends StatelessWidget {
  const _RunResultCard({required this.result});

  final CodingRunResult result;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                context.l10n.codingRun,
                style: context.text.titleMedium,
              ),
            ),
            if (result.hasCases)
              AppChip(
                label: context.l10n.codingCasesPassed(
                  result.passedCount,
                  result.cases.length,
                ),
                tone: result.allPassed ? ChipTone.success : ChipTone.warning,
              ),
          ],
        ),
        const SizedBox(height: AppSpace.xxs),
        Text(
          context.l10n.codingRunNotGraded,
          style: context.text.bodySmall?.copyWith(color: context.brand.muted),
        ),
        if (result.error.trim().isNotEmpty) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          _Labelled(
            label: context.l10n.codingError,
            child: CodeBlock(text: result.error.trim(), tone: ChipTone.danger),
          ),
        ],
        if (result.hasCases)
          for (int i = 0; i < result.cases.length; i++) ...<Widget>[
            const SizedBox(height: AppSpace.md),
            _CaseTile(index: i, result: result.cases[i]),
          ]
        else if (result.output.trim().isNotEmpty) ...<Widget>[
          const SizedBox(height: AppSpace.md),
          _Labelled(
            label: context.l10n.codingOutput,
            child: CodeBlock(text: result.output),
          ),
        ],
      ],
    ),
  );
}

/// The graded answer, or "still grading" while the judge works.
class _SubmissionCard extends StatelessWidget {
  const _SubmissionCard({required this.submission, required this.grading});

  final CodingSubmission submission;
  final bool grading;

  @override
  Widget build(BuildContext context) {
    final bool pending = grading || !submission.isJudged;
    final bool accepted = submission.isAccepted;
    final int? score = submission.score;

    final (IconData icon, Color colour, String label) = switch ((
      pending,
      accepted,
    )) {
      (true, _) => (
        Icons.hourglass_top_rounded,
        context.brand.warning,
        context.l10n.codingGrading,
      ),
      (_, true) => (
        Icons.check_circle_rounded,
        context.brand.success,
        context.l10n.codingAccepted,
      ),
      _ => (
        Icons.cancel_rounded,
        context.brand.danger,
        context.l10n.codingNotAccepted,
      ),
    };

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, size: 22, color: colour),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  label,
                  style: context.text.titleMedium?.copyWith(color: colour),
                ),
              ),
              if (pending)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          if (pending) ...<Widget>[
            const SizedBox(height: AppSpace.xs),
            Text(
              context.l10n.codingStillGrading,
              style: context.text.bodySmall?.copyWith(
                color: context.brand.muted,
              ),
            ),
          ],
          if (!pending &&
              (score != null || submission.totalCount > 0)) ...<Widget>[
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              children: <Widget>[
                if (submission.totalCount > 0)
                  AppChip(
                    label: context.l10n.codingCasesPassed(
                      submission.passedCount,
                      submission.totalCount,
                    ),
                    tone: accepted ? ChipTone.success : ChipTone.warning,
                  ),
                if (score != null)
                  AppChip(
                    label: context.l10n.codingScore(score),
                    icon: Icons.emoji_events_outlined,
                  ),
              ],
            ),
          ],
          for (int i = 0; i < submission.results.length; i++) ...<Widget>[
            const SizedBox(height: AppSpace.md),
            _CaseTile(index: i, result: submission.results[i]),
          ],
        ],
      ),
    );
  }
}

/// One case as the judge reported it. A pass is a single line — only a
/// failure is worth unpacking into what was expected against what came back.
class _CaseTile extends StatelessWidget {
  const _CaseTile({required this.index, required this.result});

  final int index;
  final CodingCaseResult result;

  @override
  Widget build(BuildContext context) {
    final bool ok = result.passed;
    final Color colour = ok ? context.brand.success : context.brand.danger;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(
              ok ? Icons.check_circle_rounded : Icons.cancel_rounded,
              size: 17,
              color: colour,
            ),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(
                context.l10n.codingCase(index + 1),
                style: context.text.labelLarge,
              ),
            ),
            Text(
              ok
                  ? context.l10n.codingCasePassed
                  : context.l10n.codingCaseFailed,
              style: context.text.labelMedium?.copyWith(color: colour),
            ),
          ],
        ),
        if (!ok) ...<Widget>[
          if (result.input.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.xs),
            _Labelled(
              label: context.l10n.codingSampleInput,
              child: CodeBlock(text: result.input, maxHeight: 90),
            ),
          ],
          if (result.expectedOutput.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.xs),
            _Labelled(
              label: context.l10n.codingSampleOutput,
              child: CodeBlock(text: result.expectedOutput, maxHeight: 90),
            ),
          ],
          const SizedBox(height: AppSpace.xs),
          _Labelled(
            label: context.l10n.codingYourOutput,
            child: CodeBlock(
              text: result.actualOutput,
              tone: ChipTone.danger,
              maxHeight: 90,
            ),
          ),
          if (result.error.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.xs),
            _Labelled(
              label: context.l10n.codingError,
              child: CodeBlock(
                text: result.error.trim(),
                tone: ChipTone.danger,
                maxHeight: 90,
              ),
            ),
          ],
        ],
      ],
    );
  }
}

/// First-load placeholder, shaped like the problem card, the samples and the
/// editor.
class _CodingSkeleton extends StatelessWidget {
  const _CodingSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SizedBox(height: AppSpace.md),
        const SkeletonBox(height: 28, width: 220),
        const SizedBox(height: AppSpace.sm),
        Row(
          children: const <Widget>[
            SkeletonBox(height: 24, width: 90, radius: 999),
            SizedBox(width: AppSpace.sm),
            SkeletonBox(height: 24, width: 70, radius: 999),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        const SkeletonBox(height: 14),
        const SizedBox(height: AppSpace.xs),
        const SkeletonBox(height: 14),
        const SizedBox(height: AppSpace.xs),
        const SkeletonBox(height: 14, width: 200),
        const SizedBox(height: AppSpace.lg),
        const SkeletonBox(height: 84),
        const SizedBox(height: AppSpace.lg),
        const SkeletonBox(height: 200),
      ],
    ),
  );
}
