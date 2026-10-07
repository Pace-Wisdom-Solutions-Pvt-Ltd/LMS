// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// One lesson.
///
/// The screen renders by `learning_material.content_type`, and **auto-completes**
/// rather than relying on the button: video at 90% watched, a reading link
/// after 30 seconds away, in-app text scrolled to the end. "Mark as complete"
/// stays as a secondary fallback.
///
/// A locked lesson answers 403; the screen renders the lock state instead of
/// retrying or showing an error page.
class LessonScreen extends StatelessWidget {
  const LessonScreen({
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
    final int orgId = context.read<SessionProvider>().orgId ?? -1;

    return ChangeNotifierProvider<LessonViewModel>(
      create: (_) => LessonViewModel(
        orgId: orgId,
        courseId: courseId,
        moduleId: moduleId,
        nodeId: nodeId,
      )..load(),
      child: const _LessonView(),
    );
  }
}

class _LessonView extends StatefulWidget {
  const _LessonView();

  @override
  State<_LessonView> createState() => _LessonViewState();
}

class _LessonViewState extends State<_LessonView> {
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final bool atEnd =
        _scroll.position.pixels >= _scroll.position.maxScrollExtent - 24;
    if (atEnd) context.read<LessonViewModel>().onScrolledToEnd();
  }

  Future<void> _openLink(LessonViewModel vm, String url) async {
    await openExternalUrl(url);
    if (!mounted) return;
    // Coming back counts as read once enough time has passed away.
    vm.onReturnedFromLink();
  }

  @override
  Widget build(BuildContext context) {
    final LessonViewModel vm = context.watch<LessonViewModel>();
    final LessonNode? lesson = vm.lesson;

    if (vm.isLocked) return const _LockedLesson();

    return Scaffold(
      appBar: AppTopBar(
        title: Text(
          lesson?.title ?? '',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(
        child: Stack(
          children: <Widget>[
            ListView(
              controller: _scroll,
              padding: const EdgeInsets.only(bottom: 120),
              children: <Widget>[
                ResponsiveBody(
                  child: Builder(
                    builder: (BuildContext context) {
                      if (vm.isBusy && lesson == null) {
                        return const SkeletonList(
                          itemCount: 2,
                          tileHeight: 160,
                        );
                      }
                      if (lesson == null) {
                        return ErrorCard(
                          message: vm.errorMessage,
                          onRetry: vm.load,
                        );
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: staggered(<Widget>[
                          _Material(
                            lesson: lesson,
                            vm: vm,
                            onOpenLink: (String url) => _openLink(vm, url),
                          ),
                          const SizedBox(height: AppSpace.lg),
                          Text(lesson.title, style: context.text.headlineSmall),
                          if (lesson.description.isNotEmpty) ...<Widget>[
                            const SizedBox(height: AppSpace.sm),
                            Text(
                              lesson.description,
                              style: context.text.bodyMedium,
                            ),
                          ],
                          if (lesson.material?.isText ?? false) ...<Widget>[
                            const SizedBox(height: AppSpace.lg),
                            Text(
                              lesson.material?.contentText ?? '',
                              style: context.text.bodyMedium,
                            ),
                          ],
                          const SizedBox(height: AppSpace.xl),
                          if (lesson.kind == LessonKind.task)
                            AppButton(
                              label: context.l10n.openTask,
                              icon: Icons.assignment_outlined,
                              onPressed: () => context.pushNamed(
                                AppRouteNames.task,
                                pathParameters: <String, String>{
                                  'courseId': '${vm.courseId}',
                                  'moduleId': '${vm.moduleId}',
                                  'nodeId': '${lesson.id}',
                                },
                              ),
                            )
                          else if (lesson.kind == LessonKind.quiz)
                            AppButton(
                              label: context.l10n.startQuiz,
                              icon: Icons.quiz_outlined,
                              onPressed: () => context.pushNamed(
                                AppRouteNames.quiz,
                                pathParameters: <String, String>{
                                  'courseId': '${vm.courseId}',
                                  'moduleId': '${vm.moduleId}',
                                  'nodeId': '${lesson.id}',
                                },
                              ),
                            ),
                        ]),
                      );
                    },
                  ),
                ),
              ],
            ),
            if (lesson != null && lesson.kind == LessonKind.lesson)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: _StickyComplete(vm: vm),
              ),
          ],
        ),
      ),
    );
  }
}

/// The player / reader, by content type.
class _Material extends StatelessWidget {
  const _Material({
    required this.lesson,
    required this.vm,
    required this.onOpenLink,
  });

  final LessonNode lesson;
  final LessonViewModel vm;
  final ValueChanged<String> onOpenLink;

  @override
  Widget build(BuildContext context) {
    final LearningMaterial? m = lesson.material;
    if (m == null) return const SizedBox.shrink();

    if (m.isVideo) {
      return _VideoSurface(material: m, vm: vm);
    }
    if (m.isDocument || m.isLink) {
      return AppCard(
        onTap: () => onOpenLink(m.url),
        child: Row(
          children: <Widget>[
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: context.colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppRadius.tile),
              ),
              child: Icon(
                m.isDocument
                    ? Icons.picture_as_pdf_outlined
                    : Icons.link_rounded,
                color: context.brand.brandText,
              ),
            ),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Text(
                m.isDocument
                    ? context.l10n.openDocument
                    : context.l10n.openLink,
                style: context.text.titleMedium,
              ),
            ),
            const Icon(Icons.open_in_new_rounded, size: 18),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }
}

/// The video surface: [InlineVideo], the same one the roadmap row uses.
///
/// This screen used to branch for itself — the YouTube player for a YouTube
/// link, and a card that sent everything else out to another app, so a plain
/// `.mp4` played inline on the roadmap and not at all here. Branching in two
/// places is how the two came to disagree; there is one entry point now, and
/// it plays whatever it is given.
class _VideoSurface extends StatelessWidget {
  const _VideoSurface({required this.material, required this.vm});

  final LearningMaterial material;
  final LessonViewModel vm;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        InlineVideo(material: material, onProgress: vm.onVideoProgress),
        const SizedBox(height: AppSpace.sm),
        Row(
          children: <Widget>[
            Icon(Icons.bolt_rounded, size: 14, color: context.brand.muted),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                context.l10n.autoCompleteNote,
                style: context.text.bodySmall,
              ),
            ),
            if (vm.progress > 0)
              Text(
                '${(vm.progress * 100).round()}%',
                style: tabular(context.text.bodySmall!),
              ),
          ],
        ),
      ],
    );
  }
}

/// `.sticky-cta` — the fallback button, pinned above the fold.
class _StickyComplete extends StatelessWidget {
  const _StickyComplete({required this.vm});

  final LessonViewModel vm;

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(
      context.gutter,
      AppSpace.md,
      context.gutter,
      AppSpace.lg + context.viewPadding.bottom,
    ),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.bottomCenter,
        end: Alignment.topCenter,
        colors: <Color>[
          context.theme.scaffoldBackgroundColor,
          context.theme.scaffoldBackgroundColor.withValues(alpha: 0),
        ],
        stops: const <double>[0.7, 1],
      ),
    ),
    child: vm.isCompleted
        ? Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(
                Icons.check_circle_rounded,
                color: context.brand.success,
                size: 20,
              ),
              const SizedBox(width: AppSpace.sm),
              Text(
                context.l10n.lessonCompleted,
                style: context.text.titleMedium?.copyWith(
                  color: context.brand.success,
                ),
              ),
            ],
          )
        : AppButton(
            label: context.l10n.markComplete,
            onPressed: () => vm.complete(),
          ),
  );
}

/// The 403 state: a lock, not an error page.
class _LockedLesson extends StatelessWidget {
  const _LockedLesson();

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: const AppTopBar(),
    body: EmptyState(
      icon: Icons.lock_outline_rounded,
      title: context.l10n.lessonLockedTitle,
      message: context.l10n.lessonLockedGeneric,
      action: AppButton(
        label: context.l10n.backToRoadmap,
        tone: ChipTone.neutral,
        onPressed: () => context.pop(),
      ),
    ),
  );
}
