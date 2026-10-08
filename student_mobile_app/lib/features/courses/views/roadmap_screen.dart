// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The course roadmap: its progress, then every module and the lessons in it.
///
/// Rows **expand in place** rather than pushing a lesson screen. What opens
/// inside depends on the node:
///  * learning material — the document button, or the video, played here;
///  * a quiz — its name and timer, with Start pushing the quiz screen;
///  * a task — a button that leaves, and the roadmap reloads when the
///    learner comes back, because completion happened out of this screen's
///    sight.
class RoadmapScreen extends StatelessWidget {
  const RoadmapScreen({super.key, required this.courseId, this.resumeNodeId});

  final int courseId;

  /// A node to open on arrival, from a deep link.
  final int? resumeNodeId;

  @override
  Widget build(BuildContext context) {
    final int orgId = context.read<SessionProvider>().orgId ?? 0;

    return ChangeNotifierProvider<RoadmapViewModel>(
      create: (_) => RoadmapViewModel(orgId: orgId, courseId: courseId),
      child: _RoadmapView(resumeNodeId: resumeNodeId),
    );
  }
}

class _RoadmapView extends StatefulWidget {
  const _RoadmapView({this.resumeNodeId});

  final int? resumeNodeId;

  @override
  State<_RoadmapView> createState() => _RoadmapViewState();
}

class _RoadmapViewState extends State<_RoadmapView> with RouteAware {
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final ModalRoute<void>? route = ModalRoute.of(context);
    if (route != null) appRouteObserver.subscribe(this, route);
  }

  /// The roadmap has been uncovered: a task or quiz screen has just closed,
  /// and whatever happened up there happened out of this screen's sight.
  /// Reload — only the server knows what a submission completed and what that
  /// unlocked.
  ///
  /// This replaces `await push(); refresh();` at each call site, which looked
  /// right and silently did nothing whenever the pushed screen replaced itself
  /// (the quiz does, with its result). See [appRouteObserver].
  @override
  void didPopNext() {
    final RoadmapViewModel vm = context.read<RoadmapViewModel>();
    vm.refreshAfterReturn(vm.openNodeId);
  }

  @override
  void dispose() {
    appRouteObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final RoadmapViewModel vm = context.read<RoadmapViewModel>();
      await vm.load();
      if (!mounted) return;

      final int? resume = widget.resumeNodeId;
      final RoadmapNode? node = resume == null
          ? null
          : vm.roadmap?.nodeById(resume);
      if (node != null && !node.isLocked) await vm.toggle(node);
    });
  }

  @override
  Widget build(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();
    final Roadmap? course = vm.roadmap;

    return Scaffold(
      appBar: AppTopBar(
        actionsPadding: EdgeInsets.symmetric(horizontal: AppSpace.sm),
        actions: [
          if (course != null)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpace.md,
                vertical: AppSpace.sm,
              ),
              decoration: BoxDecoration(
                color: context.colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                context.l10n.nodesDone(
                  course.completedNodes,
                  course.totalNodes,
                ),
                style: tabular(
                  context.text.labelLarge!.copyWith(color: context.brand.muted),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => vm.load(refresh: true),
          child: ListView(
            padding: EdgeInsets.only(
              top: AppSpace.md,
              bottom: AppSpace.xxl + context.viewPadding.bottom,
            ),
            children: <Widget>[
              ResponsiveBody(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    if (vm.isBusy && course == null)
                      const _RoadmapSkeleton()
                    else if (course == null)
                      ErrorCard(
                        message: vm.errorMessage,
                        onRetry: () => vm.load(refresh: true),
                      )
                    else
                      ...staggered(<Widget>[
                        _CourseHeader(course: course),
                        const SizedBox(height: AppSpace.sectionGap),
                        for (int i = 0; i < course.modules.length; i++)
                          _ModuleSection(
                            module: course.modules[i],
                            number: i + 1,
                          ),
                      ]),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Title and description on the left, the completion ring on the right.
class _CourseHeader extends StatelessWidget {
  const _CourseHeader({required this.course});

  final Roadmap course;

  @override
  Widget build(BuildContext context) {
    final String description = course.description.trim();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          flex: 5,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(course.title, style: context.text.displaySmall),
              if (description.isNotEmpty) ...<Widget>[
                const SizedBox(height: AppSpace.md),
                ReadMoreText(
                  description,
                  trimLines: 3,
                  trimMode: TrimMode.Line,
                  style: context.text.bodyMedium,
                  trimCollapsedText: ' ${context.l10n.readMore}',
                  trimExpandedText: ' ${context.l10n.readLess}',
                  moreStyle: context.text.bodyMedium?.copyWith(
                    color: context.brand.brandText,
                    fontWeight: FontWeight.w700,
                  ),
                  lessStyle: context.text.bodyMedium?.copyWith(
                    color: context.brand.brandText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          flex: 2,
          child: LearningRings(
            stroke: 9,
            values: <double>[course.completionPercentage / 100],
            center: Text(
              '${course.completionPercentage.round()}%',
              style: tabular(
                context.text.titleMedium!.copyWith(fontSize: fs(17)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// `MODULE n · m LESSONS`, the module title, then its rows.
class _ModuleSection extends StatelessWidget {
  const _ModuleSection({required this.module, required this.number});

  final RoadmapModule module;
  final int number;

  @override
  Widget build(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();
    final bool collapsed = vm.isModuleCollapsed(module.id);
    final List<RoadmapSection> sections = module.sections;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _SectionHeader(
          overline: context.l10n
              .moduleHeader(number, module.nodes.length)
              .toUpperCase(),
          title: module.heading,
          titleStyle: context.text.headlineSmall,
          collapsed: collapsed,
          onTap: () => vm.toggleModule(module.id),
        ),
        _Folded(
          collapsed: collapsed,
          child: Padding(
            padding: const EdgeInsets.only(top: AppSpace.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                // A module the learner has not reached yet arrives with an
                // empty `nodes` list — the backend withholds them rather than
                // locking them one by one. Without this the section rendered
                // as a heading over nothing, which reads as a failed load.
                if (module.nodes.isEmpty)
                  Row(
                    children: <Widget>[
                      Icon(
                        module.isAccessible
                            ? Icons.hourglass_empty_rounded
                            : Icons.lock_rounded,
                        size: 17,
                        color: context.brand.muted,
                      ),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(
                        child: Text(
                          module.isAccessible
                              ? context.l10n.moduleEmpty
                              : context.l10n.moduleLocked,
                          style: context.text.bodySmall,
                        ),
                      ),
                    ],
                  ),
                for (final RoadmapSection section in sections)
                  if (section.chapter == null)
                    _NodeList(nodes: section.nodes)
                  else
                    _ChapterSection(
                      chapter: section.chapter!,
                      nodes: section.nodes,
                    ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpace.sectionGap),
      ],
    );
  }
}

/// A chapter inside a module: its name, its description, and the lessons it
/// owns — folded independently of the module around it.
class _ChapterSection extends StatelessWidget {
  const _ChapterSection({required this.chapter, required this.nodes});

  final RoadmapChapter chapter;
  final List<RoadmapNode> nodes;

  @override
  Widget build(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();
    final bool collapsed = vm.isChapterCollapsed(chapter.id);
    final String description = chapter.description.trim();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _SectionHeader(
            title: chapter.title.trim(),
            titleStyle: context.text.titleMedium,
            subtitle: description.isEmpty ? null : description,
            collapsed: collapsed,
            onTap: () => vm.toggleChapter(chapter.id),
          ),
          _Folded(
            collapsed: collapsed,
            child: Padding(
              padding: const EdgeInsets.only(top: AppSpace.md),
              child: _NodeList(nodes: nodes),
            ),
          ),
        ],
      ),
    );
  }
}

/// The lessons of one group, with the connector running between them.
class _NodeList extends StatelessWidget {
  const _NodeList({required this.nodes});

  final List<RoadmapNode> nodes;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      for (int i = 0; i < nodes.length; i++)
        _NodeRow(
          node: nodes[i],
          // The connector line runs between markers, so the first row of a
          // group has no tail above it and the last none below. It is scoped
          // to the group, not the module, or the spine would reach across a
          // chapter heading.
          isFirst: i == 0,
          isLast: i == nodes.length - 1,
        ),
    ],
  );
}

/// A foldable heading: an optional overline, a title, an optional description
/// and the chevron that says which way it goes.
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.titleStyle,
    required this.collapsed,
    required this.onTap,
    this.overline,
    this.subtitle,
  });

  final String title;
  final TextStyle? titleStyle;
  final bool collapsed;
  final VoidCallback onTap;
  final String? overline;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    expanded: !collapsed,
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                if (overline != null) ...<Widget>[
                  Text(
                    overline!,
                    style: context.text.labelSmall?.copyWith(
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: AppSpace.xxs),
                ],
                Text(title, style: titleStyle),
                if (subtitle != null) ...<Widget>[
                  const SizedBox(height: AppSpace.xxs),
                  Text(subtitle!, style: context.text.bodySmall),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.xxs),
            child: AnimatedRotation(
              duration: AppMotion.fadeIn,
              turns: collapsed ? -0.25 : 0,
              child: Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 22,
                color: context.brand.muted,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// Folds its child away without a ripple or a cross-fade — the chevron above
/// already says what happened.
class _Folded extends StatelessWidget {
  const _Folded({required this.collapsed, required this.child});

  final bool collapsed;
  final Widget child;

  @override
  Widget build(BuildContext context) => AnimatedSize(
    duration: AppMotion.fadeIn,
    curve: AppMotion.standard,
    alignment: Alignment.topCenter,
    child: collapsed ? const SizedBox(width: double.infinity) : child,
  );
}

/// One lesson: the marker and its connector, the title, and — when open — its
/// contents.
class _NodeRow extends StatelessWidget {
  const _NodeRow({
    required this.node,
    required this.isFirst,
    required this.isLast,
  });

  final RoadmapNode node;
  final bool isFirst;
  final bool isLast;

  String _subtitle(BuildContext context) {
    if (node.hasQuiz) {
      // Once it is taken, the score is the useful half of this line — how
      // many questions there were stops mattering.
      final double? score = node.quizScore;
      if (score != null) {
        return '${context.l10n.kindQuiz} · '
            '${context.l10n.quizScored(score.round())}';
      }

      final int count = node.quiz?.questions.length ?? 0;
      return count == 0
          ? context.l10n.kindQuiz
          : '${context.l10n.kindQuiz} · ${context.l10n.rulesQuestions(count)}';
    }
    if (node.hasTask) return context.l10n.kindTask;
    if (node.hasAssessment) return context.l10n.kindAssessment;
    return node.description.trim();
  }

  @override
  Widget build(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();
    final bool open = vm.isOpen(node.id);
    final bool locked = node.isLocked;
    final bool refreshing = vm.isRefreshing(node.id);
    final String subtitle = _subtitle(context);

    final Widget row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _Marker(
          node: node,
          isFirst: isFirst,
          isLast: isLast,
          open: open,
          busy: refreshing,
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: AppSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  node.title,
                  style: context.text.titleMedium?.copyWith(
                    fontSize: fs(16),
                    color: locked ? context.brand.muted : null,
                  ),
                ),
                if (subtitle.isNotEmpty)
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodySmall,
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(width: AppSpace.sm),
        Padding(
          padding: const EdgeInsets.only(top: AppSpace.lg),
          child: AnimatedRotation(
            duration: AppMotion.fadeIn,
            turns: open ? 0.25 : 0,
            child: Icon(
              Icons.chevron_right_rounded,
              size: 22,
              color: context.brand.muted,
            ),
          ),
        ),
      ],
    );

    final Widget body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        row,
        // The expanded body is indented past the marker so the connector line
        // still reads as one continuous spine.
        AnimatedSize(
          duration: AppMotion.fadeIn,
          curve: AppMotion.standard,
          alignment: Alignment.topCenter,
          child: open && !locked
              ? Padding(
                  padding: const EdgeInsets.only(
                    left: 60,
                    top: AppSpace.md,
                    bottom: AppSpace.md,
                  ),
                  child: _NodeBody(node: node),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );

    return ShakeOnChange(
      token: vm.lockedTapNodeId == node.id ? vm.lockShakeToken : 0,
      child: Semantics(
        button: true,
        expanded: open,
        // A plain gesture, not an InkWell: a ripple washing across a whole
        // expanding row — and across the body once it is open — reads as a
        // flicker, and the row already answers the tap by opening. The
        // expand, the chevron rotation and the locked-row shake all stay.
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            // Mid-reload the row still describes the state the learner left,
            // so collapsing and reopening it would show them a stale answer —
            // and `_NodeBody` has nothing to offer until it lands anyway.
            if (refreshing) return;

            if (locked) {
              vm.reportLocked(node, context.l10n.lessonLockedBy);
              showAppSnackBar(context, vm.lockedMessage);
              return;
            }
            vm.toggle(node);
          },
          child: Container(
            decoration: BoxDecoration(
              color: open ? context.colors.surface : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border.all(
                color: open ? context.colors.outline : Colors.transparent,
              ),
            ),
            padding: EdgeInsets.only(right: open ? AppSpace.md : 0),
            child: body,
          ),
        ),
      ),
    );
  }
}

/// The circular status mark, with the connector line above and below it.
class _Marker extends StatelessWidget {
  const _Marker({
    required this.node,
    required this.isFirst,
    required this.isLast,
    required this.open,
    this.busy = false,
  });

  final RoadmapNode node;
  final bool isFirst;
  final bool isLast;
  final bool open;

  /// The node's state is being re-read after a return.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final bool done = node.isCompleted;
    final bool locked = node.isLocked;

    // What kind of lesson this is, for a row that is neither done nor locked.
    // Ordered like `_NodeRow._subtitle`, so the glyph and the label can never
    // disagree about what the row opens.
    final IconData kind = switch (node) {
      final RoadmapNode n when n.hasQuiz => Icons.help_outline_rounded,
      final RoadmapNode n when n.hasTask => Icons.assignment_outlined,
      final RoadmapNode n when n.hasAssessment => Icons.fact_check_outlined,
      _ => Icons.description_outlined,
    };

    final (Color background, Color foreground, IconData icon) = switch ((
      done,
      locked,
    )) {
      (true, _) => (brand.success, Colors.white, Icons.check_rounded),
      (_, true) => (
        context.colors.surfaceContainerHighest,
        brand.muted,
        Icons.lock_rounded,
      ),
      _ => (brand.brandFill, brand.onBrand, kind),
    };

    // A fixed 72px column keeps every marker on the same axis whatever the
    // row above it is doing, so the connector never kinks.
    return SizedBox(
      // width: 72,
      child: Column(
        children: <Widget>[
          _Connector(visible: !isFirst, done: done),
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: background,
              shape: BoxShape.circle,
              border: open
                  ? Border.all(color: context.colors.surface, width: 4)
                  : null,
            ),
            // A spinner in place of the glyph: the marker is the node's
            // identity, so it is the honest place to say the node is in
            // flight. The tick that is about to replace it has not been
            // earned yet as far as this screen knows.
            child: busy
                ? Padding(
                    padding: const EdgeInsets.all(13),
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: foreground,
                    ),
                  )
                : Icon(icon, size: 24, color: foreground),
          ),
          _Connector(visible: !isLast, done: done),
        ],
      ),
    );
  }
}

class _Connector extends StatelessWidget {
  const _Connector({required this.visible, required this.done});

  final bool visible;
  final bool done;

  @override
  Widget build(BuildContext context) => Container(
    width: 2,
    height: 14,
    color: visible
        ? (done ? context.brand.success : context.colors.outline)
        : Colors.transparent,
  );
}

// ── What opens inside a row ─────────────────────────────────────────────────

class _NodeBody extends StatelessWidget {
  const _NodeBody({required this.node});

  final RoadmapNode node;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      // Focus areas and quick outline ride on the roadmap payload itself, so
      // they show for every kind of row, including the ones that never call
      // the node endpoint.
      if (node.hasNotes) ...<Widget>[
        _Notes(node: node),
        const SizedBox(height: AppSpace.md),
      ],
      _kindBody(context),
    ],
  );

  Widget _kindBody(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();

    // **Before every branch below.** Coming back from a quiz leaves this body
    // holding the pre-submission answer — a live Start quiz button — until the
    // reload lands. Tapping it would start a second attempt on a quiz the
    // learner has already finished. So while the node is being re-read there
    // is nothing here to tap at all.
    if (vm.isRefreshing(node.id)) return const _NodeUpdating();

    // A quiz arrives complete on the roadmap, and an exam needs nothing from
    // the node endpoint — only material and tasks do, so only they wait on it.
    if (node.hasQuiz) return _QuizStart(node: node);
    if (node.hasAssessment) return const _AssessmentStart();
    // `has_task` is enough to offer the button; the task screen fetches the
    // detail it needs, so the roadmap does not pay for a copy it only reads
    // one boolean out of.
    if (node.hasTask) return _TaskStart(node: node);

    if (vm.isLoadingDetail(node.id)) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpace.lg),
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        ),
      );
    }

    final String? error = vm.detailErrorOf(node.id);
    if (error != null) {
      return ErrorCard(message: error, onRetry: () => vm.retryDetail(node.id));
    }

    final LessonNode? detail = vm.detailOf(node.id);
    if (detail == null) return const SizedBox.shrink();

    return _MaterialBody(node: node, material: detail.material);
  }
}

/// What an expanded row shows while its node is being re-read.
///
/// Deliberately says so in words as well as a spinner: the learner has just
/// come back from finishing something and is looking for the result of it, so
/// "nothing here yet" needs to read as *working*, not as *broken*.
class _NodeUpdating extends StatelessWidget {
  const _NodeUpdating();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.lg),
    child: Row(
      children: <Widget>[
        const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2.2),
        ),
        const SizedBox(width: AppSpace.md),
        Text(
          context.l10n.nodeUpdating,
          style: context.text.bodySmall?.copyWith(color: context.brand.muted),
        ),
      ],
    ),
  );
}

/// `focus_areas` and `quick_outline`, the trainer's own framing of the lesson.
///
/// Whichever of the two the node has, in one container. Neither one set means
/// the container is not built at all — see [RoadmapNode.hasNotes].
class _Notes extends StatelessWidget {
  const _Notes({required this.node});

  final RoadmapNode node;

  @override
  Widget build(BuildContext context) {
    final String focus = node.focusAreas.trim();
    final String outline = node.quickOutline.trim();

    return Container(
      padding: const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.tile),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: AppSpace.sm,
        children: <Widget>[
          if (focus.isNotEmpty)
            _Note(label: context.l10n.focusAreas, body: focus),
          if (outline.isNotEmpty)
            _Note(label: context.l10n.quickOutline, body: outline),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.label, required this.body});

  final String label;
  final String body;

  @override
  Widget build(BuildContext context) => Column(
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
  );
}

/// Learning material: a video played here, or a document opened out there —
/// with Mark as completed under either.
class _MaterialBody extends StatelessWidget {
  const _MaterialBody({required this.node, required this.material});

  final RoadmapNode node;
  final LearningMaterial? material;

  @override
  Widget build(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();
    final LearningMaterial? m = material;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (m == null)
          Text(context.l10n.nothingToOpen, style: context.text.bodySmall)
        else if (m.isVideo)
          InlineVideo(
            material: m,
            // 90% watched completes the node; the button below is a
            // fallback, not the primary path.
            onProgress: (double value) {
              if (value >= 0.9) vm.complete(node.id);
            },
          )
        else if (m.isText && m.contentText.trim().isNotEmpty)
          Text(m.contentText.trim(), style: context.text.bodyMedium)
        else if (m.url.isNotEmpty)
          AppButton(
            label: m.isDocument
                ? context.l10n.viewDocument
                : context.l10n.openLink,
            icon: m.isDocument
                ? Icons.article_outlined
                : Icons.open_in_new_rounded,
            tone: ChipTone.neutral,
            onPressed: () => openExternalUrl(m.url),
          )
        else
          Text(context.l10n.nothingToOpen, style: context.text.bodySmall),

        const SizedBox(height: AppSpace.md),
        _CompleteButton(node: node),
      ],
    );
  }
}

class _CompleteButton extends StatelessWidget {
  const _CompleteButton({required this.node});

  final RoadmapNode node;

  @override
  Widget build(BuildContext context) {
    final RoadmapViewModel vm = context.watch<RoadmapViewModel>();

    if (node.isCompleted) {
      return Row(
        children: <Widget>[
          Icon(
            Icons.check_circle_rounded,
            size: 18,
            color: context.brand.success,
          ),
          const SizedBox(width: AppSpace.sm),
          Text(
            context.l10n.nodeDone,
            style: context.text.labelLarge?.copyWith(
              color: context.brand.success,
            ),
          ),
        ],
      );
    }

    return AppButton(
      label: context.l10n.markCompleteAction,
      icon: Icons.check_rounded,
      busy: vm.isCompleting(node.id),
      onPressed: () => vm.complete(node.id),
    );
  }
}

/// A quiz: its name and timer, straight off the roadmap — no second call
/// needed before the learner decides to start.
class _QuizStart extends StatelessWidget {
  const _QuizStart({required this.node});

  final RoadmapNode node;

  @override
  Widget build(BuildContext context) {
    final Quiz? quiz = node.quiz;
    final int? minutes = quiz?.timerMinutes;
    final double? score = node.quizScore;

    // How many questions, how long and whether it must be passed are the
    // terms of an attempt the learner has yet to make. Once they have passed,
    // those terms are settled and only the score is news — so a passed quiz
    // shows the score and the button, nothing else. A failed one keeps them,
    // because a retake means facing the same terms again.
    final bool passed = node.passedQuiz;

    // A failed attempt is worth another go when the node is still incomplete,
    // or when the quiz gates the next lesson and so has to be passed. Failing
    // an already-complete node that nothing depends on leaves nothing to gain
    // from retaking, so that case offers the result instead.
    final bool canRetake =
        !passed && (!node.isCompleted || (quiz?.mustPassToContinue ?? false));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (quiz != null) ...<Widget>[
          Text(quiz.name, style: context.text.titleMedium),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: <Widget>[
              if (score != null)
                AppChip(
                  label: context.l10n.quizScored(score.round()),
                  icon: passed
                      ? Icons.check_circle_rounded
                      : Icons.cancel_rounded,
                  tone: passed ? ChipTone.success : ChipTone.danger,
                ),
              if (!passed) ...<Widget>[
                AppChip(
                  label: context.l10n.rulesQuestions(quiz.questions.length),
                  icon: Icons.help_outline_rounded,
                ),
                if (minutes != null && minutes > 0)
                  AppChip(
                    label: context.l10n.quizMinutes(minutes),
                    icon: Icons.schedule_rounded,
                  ),
                if (quiz.mustPassToContinue)
                  AppChip(
                    label: context.l10n.quizMustPass,
                    icon: Icons.flag_outlined,
                    tone: ChipTone.warning,
                  ),
              ],
            ],
          ),
          const SizedBox(height: AppSpace.md),
        ],
        AppButton(
          label: canRetake ? context.l10n.startQuiz : context.l10n.viewResult,
          icon: Icons.play_arrow_rounded,
          onPressed: () => _open(context, canRetake: canRetake),
        ),
      ],
    );
  }

  /// Opens the quiz, or the result of the attempt that settled it.
  ///
  /// Both routes take ids and fetch; the roadmap's copy of the quiz is not
  /// handed over, so what opens is what the server currently holds rather than
  /// a snapshot from whenever this list was loaded.
  ///
  /// Coming back reloads the roadmap — passing a quiz can complete the node
  /// and unlock the next one, and only the server knows that — but **not from
  /// here**. The quiz replaces itself with its result, and go_router drops the
  /// completer of a replaced route, so awaiting this push never resolved.
  /// `_RoadmapViewState.didPopNext` does the reload instead.
  void _open(BuildContext context, {required bool canRetake}) {
    final RoadmapViewModel vm = context.read<RoadmapViewModel>();
    context.pushNamed(
      canRetake ? AppRouteNames.quiz : AppRouteNames.quizResult,
      pathParameters: <String, String>{
        'courseId': '${vm.courseId}',
        'moduleId': '${node.moduleId}',
        'nodeId': '${node.id}',
      },
    );
  }
}

/// A task: opened on its own screen, which fetches everything it needs itself.
///
/// The button's wording is the only thing the roadmap contributes — a
/// completed node has a submission to look at, an incomplete one has a form to
/// fill. Nothing is passed: the task screen loads the node and the attempts
/// together and decides for itself which it is showing.
///
/// The roadmap reloads when this closes — submitting happened out of its sight
/// — from `_RoadmapViewState.didPopNext`, not from the push.
class _TaskStart extends StatelessWidget {
  const _TaskStart({required this.node});

  final RoadmapNode node;

  @override
  Widget build(BuildContext context) => AppButton(
    label: node.isCompleted
        ? context.l10n.viewTaskPage
        : context.l10n.openTaskPage,
    icon: Icons.assignment_outlined,
    onPressed: () => _open(context),
  );

  void _open(BuildContext context) {
    final RoadmapViewModel vm = context.read<RoadmapViewModel>();
    context.pushNamed(
      AppRouteNames.task,
      pathParameters: <String, String>{
        'courseId': '${vm.courseId}',
        'moduleId': '${node.moduleId}',
        'nodeId': '${node.id}',
      },
    );
  }
}

/// An assessment set on a lesson.
///
/// There is nothing to open. `has_assessment` is a roadmap-only flag: it is
/// absent from the OpenAPI `Node` schema, the node endpoint returns no
/// assessment object and no id, and no captured payload has ever set it true.
/// The flag is still parsed, so the day the backend fills it in this row shows
/// rather than silently rendering nothing — and until then it says plainly
/// that the work happens elsewhere.
///
/// Building it needs one field: `assessment_id` on the node detail response.
class _AssessmentStart extends StatelessWidget {
  const _AssessmentStart();

  @override
  Widget build(BuildContext context) => Text(
    context.l10n.nodeAssessmentUnavailable,
    style: context.text.bodySmall,
  );
}

/// First-load placeholder, shaped like the header and the first two modules.
class _RoadmapSkeleton extends StatelessWidget {
  const _RoadmapSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  SkeletonBox(height: 34),
                  SizedBox(height: AppSpace.sm),
                  SkeletonBox(height: 34, width: 180),
                ],
              ),
            ),
            const SizedBox(width: AppSpace.md),
            SkeletonBox(height: 92, width: 92, radius: 46),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        const SkeletonBox(height: 14),
        const SizedBox(height: AppSpace.xs),
        const SkeletonBox(height: 14, width: 220),
        const SizedBox(height: AppSpace.sectionGap),
        for (int module = 0; module < 2; module++) ...<Widget>[
          const SkeletonBox(height: 11, width: 140),
          const SizedBox(height: AppSpace.sm),
          const SkeletonBox(height: 24, width: 200),
          const SizedBox(height: AppSpace.lg),
          for (int node = 0; node < 2; node++) ...<Widget>[
            const _SkeletonNodeRow(),
            const SizedBox(height: AppSpace.md),
          ],
          const SizedBox(height: AppSpace.lg),
        ],
      ],
    ),
  );
}

class _SkeletonNodeRow extends StatelessWidget {
  const _SkeletonNodeRow();

  @override
  Widget build(BuildContext context) => const Row(
    children: <Widget>[
      SizedBox(
        width: 72,
        child: Center(child: SkeletonBox(height: 56, width: 56, radius: 28)),
      ),
      SizedBox(width: AppSpace.md),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            SkeletonBox(height: 17),
            SizedBox(height: AppSpace.xs),
            SkeletonBox(height: 13, width: 90),
          ],
        ),
      ),
    ],
  );
}
