// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Progress — three cards: overall completion, the course-wise breakdown, and
/// the learner's certificates split by what earned them.
///
/// A mobile take on the web layout: the web puts overall and breakdown side by
/// side, here they stack, and the certificate grid becomes one card per row.
class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool refresh = false}) async {
    final int? orgId = context.read<SessionProvider>().orgId;
    if (orgId == null) return;
    await context.read<ProgressViewModel>().load(orgId, refresh: refresh);
  }

  @override
  Widget build(BuildContext context) {
    final ProgressViewModel vm = context.watch<ProgressViewModel>();

    return Scaffold(
      appBar: AppTopBar(title: Text(context.l10n.progressTitle)),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => _load(refresh: true),
          child: ListView(
            padding: EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xxl),
            children: <Widget>[
              ResponsiveBody(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      context.l10n.progressSubtitle,
                      style: context.text.bodySmall,
                    ),
                    const SizedBox(height: AppSpace.lg),
                    if (vm.isBusy && !vm.loadedOnce)
                      const _ProgressSkeleton()
                    else
                      ...staggered(<Widget>[
                        _OverallCard(summary: vm.summary),
                        const SizedBox(height: AppSpace.lg),
                        _BreakdownCard(summary: vm.summary),
                        const SizedBox(height: AppSpace.lg),
                        const _CertificatesCard(),
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

// ── Overall ─────────────────────────────────────────────────────────────────

/// `overall_completion_percentage`, rounded, inside a single ring.
class _OverallCard extends StatelessWidget {
  const _OverallCard({required this.summary});

  final ProgressSummary summary;

  @override
  Widget build(BuildContext context) => _SectionCard(
    icon: Icons.trending_up_rounded,
    title: context.l10n.progressOverallTitle,
    child: Padding(
      padding: const EdgeInsets.only(top: AppSpace.lg),
      child: Row(
        children: <Widget>[
          LearningRings(
            size: 118,
            stroke: 11,
            values: <double>[summary.overallCompletionPercentage / 100],
            center: Text(
              '${summary.overallCompletionPercentage.round()}%',
              style: tabular(
                context.text.titleLarge!.copyWith(fontSize: fs(24)),
              ),
            ),
          ),
          const SizedBox(width: AppSpace.lg),
          Expanded(
            child: Text(
              context.l10n.homeOverallSubtitle,
              style: context.text.bodyMedium,
            ),
          ),
        ],
      ),
    ),
  );
}

// ── Breakdown ───────────────────────────────────────────────────────────────

/// Every course, grouped under the batch it was assigned through — the batch
/// heading is what the web layout leaves out.
class _BreakdownCard extends StatelessWidget {
  const _BreakdownCard({required this.summary});

  final ProgressSummary summary;

  @override
  Widget build(BuildContext context) => _SectionCard(
    icon: Icons.insert_chart_outlined_rounded,
    title: context.l10n.progressBreakdownTitle,
    child: summary.allCourses.isEmpty
        ? Padding(
            padding: const EdgeInsets.only(top: AppSpace.lg),
            child: EmptyState(
              icon: Icons.bar_chart_outlined,
              title: context.l10n.progressEmptyTitle,
              message: context.l10n.progressEmptyBody,
            ),
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              for (final BatchProgress b in summary.batches) ...<Widget>[
                if (b.courses.isNotEmpty) ...[
                  if (b.name.trim().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(
                        top: AppSpace.lg,
                        bottom: AppSpace.xxs,
                      ),
                      child: Row(
                        children: <Widget>[
                          Icon(
                            Icons.groups_outlined,
                            size: 14,
                            color: context.brand.brandFill,
                          ),
                          const SizedBox(width: AppSpace.xs),
                          Expanded(
                            child: Text(
                              b.name.trim(),
                              style: context.text.labelMedium,
                            ),
                          ),
                        ],
                      ),
                    ),
                  SizedBox(height: 5),
                  for (final CourseProgressDetail c in b.courses)
                    _BreakdownRow(course: c),
                ],
              ],
            ],
          ),
  );
}

class _BreakdownRow extends StatelessWidget {
  const _BreakdownRow({required this.course});

  final CourseProgressDetail course;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Row(
        children: <Widget>[
          Expanded(child: Text(course.title, style: context.text.bodyLarge)),
          const SizedBox(width: AppSpace.sm),
          Text(
            '${course.completionPercentage.round()}%',
            style: tabular(context.text.titleMedium!),
          ),
        ],
      ),
      const SizedBox(height: AppSpace.sm),
      ProgressBar(value: course.completionPercentage / 100),
      const SizedBox(height: AppSpace.xs),
      Text(
        context.l10n.lessonsDone(course.completedNodes, course.totalNodes),
        style: tabular(context.text.bodySmall!),
      ),
    ],
  );
}

// ── Certificates ────────────────────────────────────────────────────────────

/// The certificates the learner has earned.
class _CertificatesCard extends StatelessWidget {
  const _CertificatesCard();

  @override
  Widget build(BuildContext context) {
    final ProgressViewModel vm = context.watch<ProgressViewModel>();
    final List<Certificate> shown = vm.certificates;

    return _SectionCard(
      icon: Icons.workspace_premium_outlined,
      title: context.l10n.certificatesTitle,
      subtitle: context.l10n.certificatesSubtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (shown.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
              child: EmptyState(
                icon: Icons.school_outlined,
                title: context.l10n.certificatesEmptyTitle,
                message: context.l10n.certificatesEmptyBody,
              ),
            )
          else
            for (final Certificate c in shown)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.md),
                child: CertificateCard(certificate: c, downloads: vm),
              ),
        ],
      ),
    );
  }
}

// ── Shared ──────────────────────────────────────────────────────────────────

/// A card with the icon-tile header used by all three sections.
class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.child,
    this.subtitle,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, size: 20, color: brand.brandText),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: Text(title, style: context.text.titleLarge)),
            ],
          ),
          if (subtitle != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(subtitle!, style: context.text.bodySmall),
            ),
          child,
        ],
      ),
    );
  }
}

/// First-load placeholder, shaped like the three cards it replaces: a ring
/// beside a caption, a stack of labelled bars, then the tab strip.
class _ProgressSkeleton extends StatelessWidget {
  const _ProgressSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const _SkeletonCard(
          child: Row(
            children: <Widget>[
              SkeletonBox(height: 118, width: 118, radius: 59),
              SizedBox(width: AppSpace.lg),
              Expanded(child: SkeletonBox(height: 34)),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        const _SkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              SkeletonBox(height: 12, width: 130),
              SizedBox(height: AppSpace.md),
              _SkeletonBreakdownRow(),
              _SkeletonBreakdownRow(),
              _SkeletonBreakdownRow(),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        _SkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Row(
                children: <Widget>[
                  Expanded(child: SkeletonBox(height: 18)),
                  SizedBox(width: AppSpace.xl),
                  Expanded(child: SkeletonBox(height: 18)),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              Divider(height: 1, color: context.colors.outline),
              const SizedBox(height: AppSpace.md),
              const SkeletonBox(height: 140, radius: AppRadius.card),
            ],
          ),
        ),
      ],
    ),
  );
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const Row(
          children: <Widget>[
            SkeletonBox(height: 20, width: 20, radius: 6),
            SizedBox(width: AppSpace.sm),
            SkeletonBox(height: 20, width: 160),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        child,
      ],
    ),
  );
}

class _SkeletonBreakdownRow extends StatelessWidget {
  const _SkeletonBreakdownRow();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.only(bottom: AppSpace.md),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(child: SkeletonBox(height: 16)),
            SizedBox(width: AppSpace.sm),
            SkeletonBox(height: 16, width: 40),
          ],
        ),
        SizedBox(height: AppSpace.sm),
        SkeletonBox(height: 8, radius: 4),
      ],
    ),
  );
}
