// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// My Courses — the list, a search box and the four filter chips.
///
/// `GET …/my-courses/` is a **bare array** with no query support, so both the
/// search and the filters run client-side over the loaded list.
class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool refresh = false}) async {
    final int? orgId = context.read<SessionProvider>().orgId;
    if (orgId == null) return;
    await context.read<CoursesViewModel>().load(orgId, refresh: refresh);
  }

  @override
  Widget build(BuildContext context) {
    final CoursesViewModel vm = context.watch<CoursesViewModel>();
    final List<Course> visible = vm.visible;

    return Scaffold(
      // The tab stays "Courses"; the screen it opens is "My Courses".
      appBar: AppTopBar(title: Text(context.l10n.coursesTitle)),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // Outside the scroll view. The search box and the chips are one
            // control for narrowing the list below them — scrolling the list
            // out from under them, or them out from under it, makes the
            // filtering harder to undo than it was to apply.
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.sm),
              child: ResponsiveBody(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    AppTextField(
                      hint: context.l10n.coursesSearchHint,
                      controller: _search,
                      prefixIcon: Icons.search_rounded,
                      textInputAction: TextInputAction.search,
                      onChanged: vm.search,
                    ),
                    const SizedBox(height: AppSpace.md),
                    _FilterChips(vm: vm),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _load(refresh: true),
                child: ListView(
                  padding: EdgeInsets.only(bottom: AppSpace.xxl),
                  children: <Widget>[
                    ResponsiveBody(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          if (vm.isBusy && !vm.loadedOnce)
                            const SkeletonList(itemCount: 3, tileHeight: 210)
                          else if (visible.isEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: AppSpace.xl),
                              child: EmptyState(
                                icon: Icons.menu_book_outlined,
                                title: vm.all.isEmpty
                                    ? context.l10n.coursesEmptyTitle
                                    : context.l10n.coursesNoMatchTitle,
                                message: vm.all.isEmpty
                                    ? context.l10n.coursesEmptyBody
                                    : context.l10n.coursesNoMatchBody,
                              ),
                            )
                          else
                            ...staggered(<Widget>[
                              for (final Course c in visible)
                                Padding(
                                  padding: const EdgeInsets.only(
                                    bottom: AppSpace.md,
                                  ),
                                  child: CourseCard(
                                    course: c,
                                    onTap: () => context.pushNamed(
                                      AppRouteNames.roadmap,
                                      pathParameters: <String, String>{
                                        'courseId': '${c.id}',
                                      },
                                    ),
                                  ),
                                ),
                            ]),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.fchip` — the brand fill when active, with a count badge.
class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.vm});

  final CoursesViewModel vm;

  String _label(BuildContext context, CourseFilter f) => switch (f) {
    CourseFilter.all => context.l10n.filterAll,
    CourseFilter.inProgress => context.l10n.filterInProgress,
    CourseFilter.notStarted => context.l10n.filterNotStarted,
    CourseFilter.completed => context.l10n.filterCompleted,
  };

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: CourseFilter.values.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
        itemBuilder: (BuildContext context, int i) {
          final CourseFilter f = CourseFilter.values[i];
          final bool active = vm.filter == f;
          // The selected filter wears the brand fill, so it is white on the
          // organization's colour like every other chosen thing in the app.
          final Color fg = active ? brand.onBrand : brand.muted;

          return PressScale(
            onTap: () => vm.setFilter(f),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              curve: AppMotion.standard,
              padding: const EdgeInsets.only(left: 14, right: 8),
              decoration: BoxDecoration(
                color: active ? brand.brandFill : context.colors.surface,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: active ? brand.brandFill : context.colors.outline,
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(
                    _label(context, f),
                    style: context.text.labelLarge?.copyWith(
                      color: fg,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 7),
                  Container(
                    constraints: const BoxConstraints(minWidth: 22),
                    height: 22,
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      color: active
                          ? brand.onBrand.withValues(alpha: 0.22)
                          : context.colors.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(11),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${vm.countFor(f)}',
                      style: tabular(
                        context.text.labelMedium!.copyWith(
                          color: fg,
                          fontSize: fs(11),
                          height: 1,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// `.course-card` — a thumbnail over the title, description and progress.
///
/// The thumbnail is the course's own image when it has one; a missing or
/// unreachable `thumbnail` falls back to art generated from the course, so
/// there is never a broken image.
class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.course, required this.onTap});

  final Course course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final DateTime? due = course.deadline;

    return PressScale(
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: context.colors.surface,
          borderRadius: BorderRadius.circular(AppRadius.card),
          border: Border.all(color: context.colors.outline),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            AspectRatio(
              aspectRatio: 16 / 8,
              child: _Thumbnail(course: course),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpace.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(course.title, style: context.text.titleMedium),
                  if (course.description.trim().isNotEmpty) ...<Widget>[
                    const SizedBox(height: AppSpace.xxs),
                    Text(
                      course.description.trim(),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.bodySmall,
                    ),
                  ],
                  const SizedBox(height: AppSpace.md),
                  ProgressBar(value: course.completionPercentage / 100),
                  const SizedBox(height: AppSpace.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Text(
                        context.l10n.percentComplete(
                          course.completionPercentage.round(),
                        ),
                        style: tabular(context.text.bodySmall!),
                      ),
                      if (due != null)
                        Flexible(
                          child: AppChip(
                            label: context.l10n.courseDue(formatDueDate(due)),
                            icon: Icons.event_outlined,
                            // A passed deadline is worth noticing; one still
                            // ahead is just information.
                            tone: course.isOverdue
                                ? ChipTone.warning
                                : ChipTone.neutral,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The course's own image when it has one, otherwise art generated from the
/// course — never a broken image placeholder.
class _Thumbnail extends StatelessWidget {
  const _Thumbnail({required this.course});

  final Course course;

  @override
  Widget build(BuildContext context) {
    final String url = (course.thumbnail ?? '').trim();

    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        if (url.isEmpty)
          _GeneratedArt(course: course)
        else
          CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.cover,
            // The art stands in while the image loads and stays put if it
            // never arrives, so the card never shows a gap or an error glyph.
            placeholder: (_, _) => _GeneratedArt(course: course),
            errorWidget: (_, _, _) => _GeneratedArt(course: course),
          ),
        if (course.isCompleted)
          Positioned(
            top: 12,
            left: 12,
            child: AppChip(
              label: context.l10n.filterCompleted,
              icon: Icons.check_circle_rounded,
              tone: ChipTone.success,
            ),
          ),
      ],
    );
  }
}

/// A stable gradient derived from the course id, so the same course always
/// looks the same.
class _GeneratedArt extends StatelessWidget {
  const _GeneratedArt({required this.course});

  final Course course;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final List<Color> palette = <Color>[
      brand.ring1.first,
      brand.ring1.last,
      brand.ring2.first,
      brand.ring2.last,
      brand.brandFill,
    ];
    final Color seed = palette[course.id.abs() % palette.length];

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            Color.lerp(seed, const Color(0xFF06101F), 0.18)!,
            Color.lerp(seed, const Color(0xFF040B16), 0.58)!,
          ],
        ),
      ),
    );
  }
}
