// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Taking a quiz.
///
/// One question at a time, with a strip of numbers across the top as the map
/// and the only way to jump. **A number opens only once the question before it
/// has an answer**, so the strip fills left to right and nothing is skipped;
/// going back is always allowed, because getting past a question meant
/// answering it. The rule lives in [QuizViewModel.canJumpTo] and is enforced
/// inside `goTo`, not just here.
///
/// Options render as radios or checkboxes off `allow_multiple_correct`, so the
/// shape of the control says how many answers are wanted before the learner
/// discovers it by tapping.
///
/// Submitting is deliberate: the button only becomes Submit on the last
/// question, only enables once every question is answered, and asks to
/// confirm. **The timer overrides all of that** — when it runs out the attempt
/// goes in as it stands and the result opens.
class QuizScreen extends StatelessWidget {
  const QuizScreen({
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

    return ChangeNotifierProvider<QuizViewModel>(
      create: (_) => QuizViewModel(
        orgId: orgId,
        courseId: courseId,
        moduleId: moduleId,
        nodeId: nodeId,
      )..load(),
      child: _QuizView(courseId: courseId, moduleId: moduleId, nodeId: nodeId),
    );
  }
}

class _QuizView extends StatefulWidget {
  const _QuizView({
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
  });

  final int courseId;
  final int moduleId;
  final int nodeId;

  @override
  State<_QuizView> createState() => _QuizViewState();
}

class _QuizViewState extends State<_QuizView> {
  late final QuizViewModel _vm;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _vm = context.read<QuizViewModel>();
    // Navigation hangs off the result landing rather than off the button, so
    // the timer expiring takes the learner to the same place a tap would.
    _vm.addListener(_onResult);
  }

  @override
  void dispose() {
    _vm.removeListener(_onResult);
    super.dispose();
  }

  void _onResult() {
    if (_leaving) return;

    // Two ways off this screen: a result to show, or a clock that ran out on
    // an untouched quiz, where there is no result and never will be.
    final bool unanswered = _vm.expiredUnanswered;
    if (_vm.result == null && !unanswered) return;
    _leaving = true;

    // Out of the notification, so the router is not rebuilding mid-notify.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      if (_vm.expired) {
        showAppSnackBar(
          context,
          unanswered
              ? context.l10n.quizTimeUpUnanswered
              : context.l10n.quizTimeUp,
          tone: ChipTone.warning,
        );
      }

      if (unanswered) {
        // Back where they came from. A result screen would have nothing to
        // show, and replacing this route with one would strand them.
        if (Navigator.canPop(context)) {
          context.pop();
        } else {
          context.goNamed(
            AppRouteNames.roadmap,
            pathParameters: <String, String>{'courseId': '${widget.courseId}'},
          );
        }
        return;
      }

      context.pushReplacementNamed(
        AppRouteNames.quizResult,
        pathParameters: <String, String>{
          'courseId': '${widget.courseId}',
          'moduleId': '${widget.moduleId}',
          'nodeId': '${widget.nodeId}',
        },
      );
    });
  }

  Future<void> _submit(QuizViewModel vm) async {
    final bool? go = await showAppSheet<bool>(
      context,
      title: context.l10n.quizSubmitConfirmTitle,
      child: Text(
        context.l10n.quizSubmitConfirmBody,
        style: context.text.bodyMedium,
      ),
      actions: <Widget>[
        AppButton(
          label: context.l10n.quizConfirmSubmit,
          onPressed: () => Navigator.of(context).pop(true),
        ),
        AppButton(
          label: context.l10n.cancel,
          tone: ChipTone.neutral,
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ],
    );
    if (go != true || !mounted) return;
    await vm.submit();
  }

  @override
  Widget build(BuildContext context) {
    final QuizViewModel vm = context.watch<QuizViewModel>();

    // `isBusy` covers submitting too, so the quiz has to be absent for this to
    // count as a first load — otherwise submitting flashes the skeleton.
    if (vm.isBusy && vm.quiz == null) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: const SafeArea(child: ResponsiveBody(child: _QuizSkeleton())),
      );
    }

    if (vm.isLocked) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: SafeArea(
          child: ResponsiveBody(
            child: EmptyState(
              icon: Icons.lock_rounded,
              title: context.l10n.lessonLockedTitle,
              message: context.l10n.lessonLockedGeneric,
            ),
          ),
        ),
      );
    }

    if (vm.state == ViewState.error && vm.quiz == null) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: SafeArea(
          child: ResponsiveBody(
            child: ErrorCard(message: vm.errorMessage, onRetry: vm.load),
          ),
        ),
      );
    }

    final QuizQuestion? q = vm.current;

    // One guard, not two: a quiz with no questions and an index that has
    // outrun the ones it has are the same thing to this screen — there is
    // nothing to put on it.
    if (q == null) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: EmptyState(
          icon: Icons.quiz_outlined,
          title: context.l10n.quizEmptyTitle,
        ),
      );
    }

    return Scaffold(
      appBar: AppTopBar(
        title: Text(
          vm.quiz?.name ?? '',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: <Widget>[
          if (vm.remaining != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
              child: Center(
                child: Text(
                  formatCountdown(vm.remaining!),
                  style: appMono(
                    context,
                    weight: FontWeight.w600,
                    color: vm.isLowOnTime ? context.brand.danger : null,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            _QuestionStrip(vm: vm),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.only(
                  top: AppSpace.lg,
                  bottom: AppSpace.xxl,
                ),
                children: <Widget>[
                  ResponsiveBody(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Text(
                          context.l10n.questionOf(vm.index + 1, vm.total),
                          style: tabular(
                            context.text.labelSmall!.copyWith(
                              color: context.brand.muted,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpace.sm),
                        Text(q.text, style: context.text.headlineMedium),
                        const SizedBox(height: 22),
                        for (final AnswerOption o in q.options)
                          Padding(
                            padding: const EdgeInsets.only(bottom: AppSpace.md),
                            child: _OptionTile(
                              option: o,
                              picked: vm.isPicked(q.id, o.id),
                              multiple: q.allowMultipleCorrect,
                              onTap: () => vm.pick(q, o.id),
                            ),
                          ),
                        // A rejected submit leaves the answers on screen and
                        // still editable, so the reason belongs here.
                        if (vm.state == ViewState.error) ...<Widget>[
                          const SizedBox(height: AppSpace.sm),
                          ErrorCard(message: vm.errorMessage),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _Actions(vm: vm, onSubmit: () => _submit(vm)),
    );
  }
}

/// The numbers across the top: the map, and the only way to jump.
/// The row of numbers, which **scrolls itself to keep the current one in
/// view**.
///
/// Only about nine fit across a phone, so on a thirteen-question quiz the
/// learner answered their way to question ten while the strip still showed one
/// to nine — the one piece of UI whose whole job is saying where they are had
/// quietly stopped doing it. Tapping a number scrolls nothing, because a
/// number you can tap is already on screen; this is for the moves Next and the
/// clock make.
class _QuestionStrip extends StatefulWidget {
  const _QuestionStrip({required this.vm});

  final QuizViewModel vm;

  @override
  State<_QuestionStrip> createState() => _QuestionStripState();
}

class _QuestionStripState extends State<_QuestionStrip> {
  /// One per dot, so the current one is found by its own position rather than
  /// by multiplying a width this strip does not fix — a dot is as wide as its
  /// digits, and `11` is wider than `1`.
  List<GlobalKey> _keys = const <GlobalKey>[];

  /// The index already revealed, so a rebuild that changed something else —
  /// an answer, a tick of the clock — does not restart the animation.
  int _revealed = -1;

  @override
  void initState() {
    super.initState();
    _sync();
  }

  @override
  void didUpdateWidget(covariant _QuestionStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    if (_keys.length != widget.vm.total) {
      _keys = List<GlobalKey>.generate(
        widget.vm.total,
        (_) => GlobalKey(),
        growable: false,
      );
      _revealed = -1;
    }

    final int index = widget.vm.index;
    if (index == _revealed) return;
    _revealed = index;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || index < 0 || index >= _keys.length) return;
      final BuildContext? dot = _keys[index].currentContext;
      if (dot == null) return;

      Scrollable.ensureVisible(
        dot,
        // Centred, so the numbers either side come with it — the learner sees
        // what is behind and what is ahead, not only where they are.
        alignment: 0.5,
        duration: context.reduceMotion
            ? Duration.zero
            : const Duration(milliseconds: 320),
        curve: AppMotion.standard,
      );
    });
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.symmetric(horizontal: context.gutter),
    child: SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        spacing: AppSpace.sm,
        children: <Widget>[
          for (int i = 0; i < widget.vm.total; i++)
            KeyedSubtree(
              key: i < _keys.length ? _keys[i] : null,
              child: _QuestionDot(vm: widget.vm, index: i),
            ),
        ],
      ),
    ),
  );
}

class _QuestionDot extends StatelessWidget {
  const _QuestionDot({required this.vm, required this.index});

  final QuizViewModel vm;
  final int index;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final bool current = index == vm.index;
    final bool answered = vm.isAnswered(index);
    final bool open = vm.canJumpTo(index);

    // Current wins over answered: the learner needs to find where they are
    // faster than they need to count what is done.
    final (Color background, Color foreground, Color border) = switch ((
      current,
      answered,
    )) {
      (true, _) => (brand.brandFill, brand.onBrand, brand.brandFill),
      (_, true) => (brand.brandSoft, brand.brandText, brand.brandText),
      _ => (
        context.colors.surface,
        open ? context.colors.onSurface : brand.muted,
        context.colors.outline,
      ),
    };

    final Widget dot = Container(
      padding: EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: background,
        shape: BoxShape.circle,
        border: Border.all(color: border, width: 1.5),
      ),
      alignment: Alignment.center,
      child: Text(
        '${index + 1}',
        style: tabular(
          context.text.labelLarge!.copyWith(
            color: foreground,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );

    return Semantics(
      button: open,
      selected: current,
      enabled: open,
      label: context.l10n.questionOf(index + 1, vm.total),
      // A locked number is not dimmed into illegibility — it is still a map of
      // what is coming, it just does not answer a tap.
      child: open
          ? PressScale(onTap: () => vm.goTo(index), child: dot)
          : Opacity(opacity: 0.55, child: dot),
    );
  }
}

/// Previous, and Next or Submit.
class _Actions extends StatelessWidget {
  const _Actions({required this.vm, required this.onSubmit});

  final QuizViewModel vm;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final bool last = vm.isLast;

    // Reaching the last question means answering every earlier one, so
    // `allAnswered` here is really "and this one too" — but it is the honest
    // condition to write, and it survives the rule changing.
    final bool canAdvance = last ? vm.allAnswered : vm.isCurrentAnswered;

    return Container(
      decoration: BoxDecoration(
        color: context.theme.scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: context.colors.outline)),
      ),
      padding: EdgeInsets.fromLTRB(
        context.gutter,
        AppSpace.md,
        context.gutter,
        AppSpace.md + context.viewPadding.bottom,
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: AppButton(
              label: context.l10n.quizPrevious,
              icon: Icons.arrow_back_rounded,
              tone: ChipTone.neutral,
              onPressed: vm.isFirst ? null : vm.previous,
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: AppButton(
              label: last ? context.l10n.quizSubmit : context.l10n.quizNext,
              icon: last ? Icons.check_rounded : Icons.arrow_forward_rounded,
              busy: vm.isBusy,
              onPressed: canAdvance ? (last ? onSubmit : vm.next) : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// One option, with the control that says how many answers are wanted: a radio
/// when only one may be picked, a checkbox when several may.
class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.option,
    required this.picked,
    required this.multiple,
    required this.onTap,
  });

  final AnswerOption option;
  final bool picked;
  final bool multiple;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return Semantics(
      inMutuallyExclusiveGroup: !multiple,
      checked: picked,
      child: PressScale(
        onTap: onTap,
        scale: 0.985,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: AppMotion.spring,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: picked ? brand.brandSoft : context.colors.surface,
            borderRadius: BorderRadius.circular(AppRadius.option),
            border: Border.all(
              color: picked ? brand.brandFill : context.colors.outline,
              width: 1.5,
            ),
          ),
          child: Row(
            children: <Widget>[
              ChoiceIndicator(picked: picked, multiple: multiple),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(
                  option.text,
                  style: context.text.bodyLarge?.copyWith(
                    fontSize: fs(16),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// First-load placeholder, shaped like the number strip and the first question.
class _QuizSkeleton extends StatelessWidget {
  const _QuizSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SizedBox(height: AppSpace.md),
        Row(
          children: <Widget>[
            for (int i = 0; i < 5; i++) ...<Widget>[
              const SkeletonBox(height: 40, width: 40, radius: 20),
              const SizedBox(width: AppSpace.sm),
            ],
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        const SkeletonBox(height: 12, width: 110),
        const SizedBox(height: AppSpace.md),
        const SkeletonBox(height: 26),
        const SizedBox(height: AppSpace.xs),
        const SkeletonBox(height: 26, width: 220),
        const SizedBox(height: 22),
        for (int i = 0; i < 4; i++) ...<Widget>[
          const SkeletonBox(height: 64, radius: AppRadius.option),
          const SizedBox(height: AppSpace.md),
        ],
      ],
    ),
  );
}
