// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Home — four read-only cards over `GET …/students/me/dashboard/`.
///
/// Overall progress, per-course progress, a status donut and a stats grid. It
/// deliberately does **not** resume a lesson, surface `resume_learning_node_id`
/// or list `upcoming_mandatory_due_dates`: Home reports, the Courses tab acts.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
    });
  }

  Future<void> _load({bool refresh = false}) async {
    final int? orgId = context.read<SessionProvider>().orgId;
    if (orgId == null) return;
    await context.read<DashboardViewModel>().load(orgId, refresh: refresh);
  }

  @override
  Widget build(BuildContext context) {
    final DashboardViewModel vm = context.watch<DashboardViewModel>();
    final Dashboard d = vm.dashboard;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // Outside the scroll view: the organization is how the learner
            // orients on this screen, so it stays put rather than sliding
            // away under the first card.
            const Padding(
              padding: EdgeInsets.only(top: AppSpace.md),
              child: ResponsiveBody(child: HomeAppBar()),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _load(refresh: true),
                child: ListView(
                  padding: EdgeInsets.only(
                    top: AppSpace.lg,
                    bottom: AppSpace.xxl,
                  ),
                  children: <Widget>[
                    ResponsiveBody(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          if (vm.isBusy && !vm.loadedOnce)
                            const _HomeSkeleton()
                          else
                            ...staggered(<Widget>[
                              // The name comes from the one view model that
                              // fetches the learner's record, so a name
                              // changed elsewhere lands here too — and only
                              // this line rebuilds when it does.
                              //
                              // It greets whether or not there are courses:
                              // an empty Home that opens on a bare icon in
                              // the middle of the screen reads as a failure
                              // rather than as a beginning.
                              Consumer<ProfileViewModel>(
                                builder:
                                    (
                                      BuildContext context,
                                      ProfileViewModel profile,
                                      _,
                                    ) => Text(
                                      context.l10n.greeting(
                                        profile.user?.displayName ?? '',
                                      ),
                                      style: context.text.displaySmall,
                                    ),
                              ),
                              const SizedBox(height: AppSpace.lg),
                              // The sections stand whether or not there is
                              // anything in them: each one explains its own
                              // absence inside its own card, so a new learner
                              // reads the headings they will come back to
                              // rather than one notice standing in for all
                              // four.
                              _OverallProgressCard(dashboard: d),
                              const SizedBox(height: AppSpace.lg),
                              _CourseProgressCard(dashboard: d),
                              const SizedBox(height: AppSpace.lg),
                              _CourseStatusCard(dashboard: d),
                              const SizedBox(height: AppSpace.lg),
                              _AtAGlanceCard(dashboard: d),
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

/// `.appbar` — the org chip.
class HomeAppBar extends StatelessWidget {
  const HomeAppBar({super.key});

  @override
  Widget build(BuildContext context) {
    final BrandingProvider branding = context.watch<BrandingProvider>();

    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 44),
      child: Row(
        children: <Widget>[
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: context.colors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: context.colors.outline),
            ),
            clipBehavior: Clip.antiAlias,
            child: const Center(child: BrandMark(size: 30, radius: 8)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  context.l10n.homeOrgOverline,
                  style: context.text.labelSmall?.copyWith(
                    fontSize: fs(10),
                    letterSpacing: 0.9,
                  ),
                ),
                Text(
                  branding.orgName.isNotEmpty
                      ? branding.orgName
                      : context.l10n.appName,
                  style: context.text.titleMedium?.copyWith(
                    fontSize: fs(14),
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── The four cards ──────────────────────────────────────────────────────────

/// `cards.overall_completion_percentage` as a 270° gauge.
class _OverallProgressCard extends StatelessWidget {
  const _OverallProgressCard({required this.dashboard});

  final Dashboard dashboard;

  @override
  Widget build(BuildContext context) {
    final double percent = dashboard.cards.overallCompletion;

    return _StatCard(
      icon: Icons.insert_chart_outlined_rounded,
      title: context.l10n.homeOverallTitle,
      subtitle: context.l10n.homeOverallSubtitle,
      child: !dashboard.hasCourses
          ? _CardEmpty(
              icon: Icons.donut_large_outlined,
              title: context.l10n.homeOverallEmptyTitle,
              message: context.l10n.homeOverallEmptyBody,
            )
          : Center(
              child: Padding(
                padding: const EdgeInsets.only(top: AppSpace.lg),
                child: GaugeArc(
                  value: percent / 100,
                  center: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        '${percent.round()}%',
                        style: tabular(
                          context.text.displaySmall!.copyWith(fontSize: fs(42)),
                        ),
                      ),
                      const SizedBox(height: AppSpace.xxs),
                      Text(
                        context.l10n.homeStatComplete.toUpperCase(),
                        style: context.text.labelSmall?.copyWith(
                          letterSpacing: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

/// One bar per entry of `progress[]`.
///
/// Every bar uses the same brand gradient — the percentage is the signal, and
/// a colour per course would imply a meaning the payload does not carry.
class _CourseProgressCard extends StatelessWidget {
  const _CourseProgressCard({required this.dashboard});

  final Dashboard dashboard;

  @override
  Widget build(BuildContext context) => _StatCard(
    icon: Icons.insert_chart_outlined_rounded,
    title: context.l10n.homeCourseProgressTitle,
    subtitle: context.l10n.homeCourseProgressSubtitle,
    child: dashboard.progress.isEmpty
        ? _CardEmpty(
            icon: Icons.bar_chart_outlined,
            title: context.l10n.homeCourseProgressEmptyTitle,
            message: context.l10n.homeCourseProgressEmptyBody,
          )
        : Column(
            children: <Widget>[
              for (final CourseProgress c in dashboard.progress)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.md),
                  child: _CourseProgressRow(course: c),
                ),
            ],
          ),
  );
}

class _CourseProgressRow extends StatelessWidget {
  const _CourseProgressRow({required this.course});

  final CourseProgress course;

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        spacing: AppSpace.sm,
        children: [
          Expanded(
            child: Text(course.courseTitle, style: context.text.bodyMedium),
          ),
          Text(
            '${course.completionPercentage.round()}%',
            textAlign: TextAlign.right,
            style: tabular(context.text.titleMedium!),
          ),
        ],
      ),
      ProgressBar(value: course.completionPercentage / 100),
    ],
  );
}

/// The same `progress[]`, bucketed into completed / in progress / not started.
class _CourseStatusCard extends StatelessWidget {
  const _CourseStatusCard({required this.dashboard});

  final Dashboard dashboard;

  @override
  Widget build(BuildContext context) {
    // One list feeds both the donut and its legend, so a dot can never
    // disagree with the wedge it labels.
    final List<DonutSlice> slices = <DonutSlice>[
      DonutSlice(
        label: context.l10n.filterCompleted,
        count: dashboard.completedCourses,
        color: CourseStatusColors.completed(context),
      ),
      DonutSlice(
        label: context.l10n.filterInProgress,
        count: dashboard.inProgressCourses,
        color: CourseStatusColors.inProgress(context),
      ),
      DonutSlice(
        label: context.l10n.filterNotStarted,
        count: dashboard.notStartedCourses,
        color: CourseStatusColors.notStarted(context),
      ),
    ];

    return _StatCard(
      icon: Icons.workspace_premium_outlined,
      title: context.l10n.homeCourseStatusTitle,
      subtitle: context.l10n.homeCourseStatusSubtitle,
      child: dashboard.progress.isEmpty
          ? _CardEmpty(
              icon: Icons.pie_chart_outline_rounded,
              title: context.l10n.homeCourseStatusEmptyTitle,
              message: context.l10n.homeCourseStatusEmptyBody,
            )
          : Padding(
              padding: const EdgeInsets.only(top: AppSpace.lg),
              child: Row(
                children: <Widget>[
                  StatusDonut(
                    slices: slices,
                    center: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Text(
                          '${dashboard.progress.length}',
                          style: tabular(
                            context.text.displaySmall!.copyWith(
                              fontSize: fs(30),
                            ),
                          ),
                        ),
                        Text(
                          context.l10n.homeStatCourses,
                          style: context.text.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpace.lg),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        for (final DonutSlice s in slices)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: AppSpace.sm,
                            ),
                            child: Row(
                              children: <Widget>[
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: s.color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: AppSpace.sm),
                                Expanded(
                                  child: Text(
                                    s.label,
                                    style: context.text.bodyMedium,
                                  ),
                                ),
                                Text(
                                  '${s.count}',
                                  style: tabular(context.text.titleMedium!),
                                ),
                              ],
                            ),
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

/// The six headline numbers, two to a row.
class _AtAGlanceCard extends StatelessWidget {
  const _AtAGlanceCard({required this.dashboard});

  final Dashboard dashboard;

  @override
  Widget build(BuildContext context) {
    final DashboardCards c = dashboard.cards;
    final double? hours = c.learningHoursThisMonth;

    final List<_Glance> tiles = <_Glance>[
      _Glance(
        icon: Icons.menu_book_outlined,
        value: '${c.enrolledCourses}',
        label: context.l10n.homeStatEnrolled,
      ),
      _Glance(
        icon: Icons.workspace_premium_outlined,
        value: '${c.certificatesEarned}',
        label: context.l10n.progressCertificates,
      ),
      _Glance(
        icon: Icons.schedule_rounded,
        // Routinely null in the payload — an em dash, never a bogus zero.
        value: hours == null ? '—' : '${hours.round()}',
        label: context.l10n.homeStatLearningHours,
      ),
      _Glance(
        icon: Icons.event_outlined,
        value: '${c.upcomingDueDates}',
        label: context.l10n.homeStatUpcoming,
      ),
      _Glance(
        icon: Icons.auto_awesome_outlined,
        value: '${dashboard.points}',
        label: context.l10n.homeStatPoints,
      ),
    ];

    return _StatCard(
      icon: Icons.auto_awesome_outlined,
      title: context.l10n.homeGlanceTitle,
      subtitle: context.l10n.homeGlanceSubtitle,
      child: Column(
        children: <Widget>[
          for (int row = 0; row < tiles.length; row += 2)
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Expanded(child: _GlanceTile(glance: tiles[row])),
                  Padding(
                    padding: EdgeInsetsGeometry.symmetric(horizontal: 5),
                    child: VerticalDivider(
                      width: 1,
                      color: context.colors.outline,
                    ),
                  ),
                  Expanded(
                    child: row + 1 < tiles.length
                        ? _GlanceTile(glance: tiles[row + 1])
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Glance {
  const _Glance({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;
}

class _GlanceTile extends StatelessWidget {
  const _GlanceTile({required this.glance});

  final _Glance glance;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
    child: Row(
      children: <Widget>[
        _IconTile(icon: glance.icon, size: 40),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                glance.value,
                style: tabular(
                  context.text.titleLarge!.copyWith(
                    fontSize: fs(22),
                    height: 1.1,
                  ),
                ),
              ),
              Text(
                glance.label.toUpperCase(),
                style: context.text.labelSmall?.copyWith(letterSpacing: 0.8),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

// ── Shared card furniture ───────────────────────────────────────────────────

/// A card with the repeated icon-tile header: square mark, title, subtitle.
class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            _IconTile(icon: icon),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(title, style: context.text.titleLarge),
                  const SizedBox(height: 2),
                  Text(subtitle, style: context.text.bodySmall),
                ],
              ),
            ),
          ],
        ),
        child,
      ],
    ),
  );
}

/// What a card shows in place of its chart when it has no data.
///
/// The same shape the Progress tab uses inside `_SectionCard`: the section
/// keeps its header, and the body says what will fill it. A gauge pinned at
/// 0%, three empty bars or a donut drawn entirely from its own track are all
/// worse than this — they look like a number rather than like an absence.
class _CardEmpty extends StatelessWidget {
  const _CardEmpty({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.lg),
    child: EmptyState(icon: icon, title: title, message: message),
  );
}

/// The rounded-square icon mark used by every card header and glance tile.
class _IconTile extends StatelessWidget {
  const _IconTile({required this.icon, this.size = 48});

  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: brand.brandSoft,
        borderRadius: BorderRadius.circular(AppRadius.tile),
      ),
      child: Icon(icon, size: size * 0.45, color: brand.brandText),
    );
  }
}

/// First-load placeholder, shaped like the four cards beneath it.
class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SkeletonBox(height: 38, width: 200),
        const SizedBox(height: AppSpace.lg),
        for (final double h in <double>[300, 220, 260, 280]) ...<Widget>[
          SkeletonBox(height: h, radius: AppRadius.card),
          const SizedBox(height: AppSpace.lg),
        ],
      ],
    ),
  );
}
