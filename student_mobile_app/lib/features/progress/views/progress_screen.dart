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

  /// Fetches the PDF if it is not already on the device, then hands back its
  /// path. Null means the learner has already been told what went wrong.
  Future<String?> _ensureLocalCopy(
    Certificate c, {
    required bool promptForLocation,
  }) async {
    final ProgressViewModel vm = context.read<ProgressViewModel>();
    final String? existing = vm.savedPathFor(c.id);
    if (existing != null && !promptForLocation) return existing;

    final int? orgId = context.read<SessionProvider>().orgId;
    if (orgId == null) return null;

    final SavedFile? saved = await vm.downloadCertificate(
      orgId,
      c,
      promptForLocation: promptForLocation,
    );
    if (!mounted) return null;

    if (saved == null) {
      showAppSnackBar(
        context,
        context.l10n.certificateDownloadFailed,
        tone: ChipTone.danger,
      );
      return null;
    }
    return saved.path;
  }

  /// "View" opens the PDF in the platform viewer. It still has to fetch the
  /// file first, but never interrupts with a save dialog — choosing a folder
  /// is what Download is for.
  Future<void> _view(Certificate c) async {
    final String? path = await _ensureLocalCopy(c, promptForLocation: false);
    if (path == null || !mounted) return;
    // Nothing may be left on screen when the platform takes the foreground —
    // see [hideAppSnackBars].
    hideAppSnackBars(context);
    await openLocalFile(path);
  }

  /// Saves the PDF where the file manager can see it, then offers to open it.
  Future<void> _download(Certificate c) async {
    final int? orgId = context.read<SessionProvider>().orgId;
    if (orgId == null) return;

    final ProgressViewModel vm = context.read<ProgressViewModel>();
    final SavedFile? saved = await vm.downloadCertificate(orgId, c);
    if (!mounted) return;

    if (saved == null) {
      showAppSnackBar(
        context,
        context.l10n.certificateDownloadFailed,
        tone: ChipTone.danger,
      );
      return;
    }

    showAppSnackBar(
      context,
      // Say plainly whether it is browsable: on Android the learner may have
      // dismissed the save dialog, leaving it app-private.
      saved.isInFileManager
          ? context.l10n.certificateSaved
          : context.l10n.certificateSavedInApp,
      tone: ChipTone.success,
    );
  }

  /// Opens the system share sheet, downloading first if needed so "Share"
  /// works on a certificate the learner has never downloaded.
  Future<void> _share(Certificate c, Rect? origin) async {
    final String? path = await _ensureLocalCopy(c, promptForLocation: false);
    if (path == null || !mounted) return;

    // The share sheet is another activity; nothing of ours may be left
    // on screen behind it.
    hideAppSnackBars(context);
    await shareLocalFile(
      path,
      subject: c.courseName,
      text: context.l10n.certificateShareText(c.courseName),
      origin: origin,
    );
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
                        _CertificatesCard(
                          onView: _view,
                          onDownload: _download,
                          onShare: _share,
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
          Expanded(
            child: Text(
              course.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.bodyLarge,
            ),
          ),
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
  const _CertificatesCard({
    required this.onView,
    required this.onDownload,
    required this.onShare,
  });

  final void Function(Certificate) onView;
  final void Function(Certificate) onDownload;
  final void Function(Certificate, Rect?) onShare;

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
                child: _CertificateCard(
                  certificate: c,
                  onView: () => onView(c),
                  onDownload: () => onDownload(c),
                  onShare: (Rect? origin) => onShare(c, origin),
                ),
              ),
        ],
      ),
    );
  }
}

class _CertificateCard extends StatelessWidget {
  const _CertificateCard({
    required this.certificate,
    required this.onView,
    required this.onDownload,
    required this.onShare,
  });

  final Certificate certificate;
  final VoidCallback onView;
  final VoidCallback onDownload;
  final void Function(Rect? origin) onShare;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final bool busy = context.select(
      (ProgressViewModel vm) => vm.isDownloading(certificate.id),
    );
    final double? progress = context.select(
      (ProgressViewModel vm) => vm.downloadProgress(certificate.id),
    );

    // The card keeps its shape and its three buttons throughout: swapping the
    // row for a spinner collapsed the card by the height of a button and
    // bounced every card below it, and left the learner looking at a bare
    // ring where their certificate had been. The work happens *over* the
    // card instead — dimmed, so it plainly cannot be touched, and sealed by
    // the [AbsorbPointer] so it genuinely cannot.
    return Stack(
      children: <Widget>[
        AbsorbPointer(
          absorbing: busy,
          child: AnimatedOpacity(
            duration: AppMotion.fadeIn,
            opacity: busy ? 0.9 : 1,
            child: Container(
              padding: const EdgeInsets.all(AppSpace.md),
              decoration: BoxDecoration(
                color: context.colors.surface,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: context.colors.outline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: brand.successContainer,
                          borderRadius: BorderRadius.circular(AppRadius.tile),
                        ),
                        child: Icon(
                          Icons.workspace_premium_rounded,
                          color: brand.success,
                        ),
                      ),
                      const SizedBox(width: AppSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Text(
                              certificate.courseName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: context.text.titleMedium?.copyWith(
                                fontSize: fs(15),
                              ),
                            ),
                            if (certificate.issuedAt != null)
                              Text(
                                formatLongDate(certificate.issuedAt!),
                                style: context.text.bodySmall,
                              ),
                            if (certificate.certificateId.trim().isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  certificate.certificateId.trim(),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  // Mono, because this is a reference someone
                                  // may read out or type in.
                                  style: appMono(
                                    context,
                                    size: 11,
                                    color: brand.muted,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: <Widget>[
                      _CertAction(
                        icon: Icons.visibility_outlined,
                        label: context.l10n.view,
                        onTap: onView,
                      ),
                      const SizedBox(width: AppSpace.sm),
                      // Filled, because downloading is the one action worth
                      // pointing at — once the words are gone the three icons
                      // carry no hierarchy of their own.
                      _CertAction(
                        icon: Icons.download_rounded,
                        label: context.l10n.download,
                        onTap: onDownload,
                        primary: false,
                      ),
                      const SizedBox(width: AppSpace.sm),
                      // Builder so the share sheet can anchor to this exact
                      // button, which iPad requires.
                      Builder(
                        builder: (BuildContext buttonContext) => _CertAction(
                          icon: Icons.ios_share_rounded,
                          label: context.l10n.share,
                          onTap: () => onShare(shareOriginOf(buttonContext)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        if (busy)
          // Fills the card exactly, and nothing more: the scrim is the card's
          // own surface at a low alpha, so the title stays legible underneath
          // rather than being hidden behind a slab.
          Positioned.fill(
            child: Semantics(
              label: context.l10n.download,
              liveRegion: true,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: context.colors.surface.withValues(alpha: 0.50),
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
                child: Center(child: _DownloadProgress(value: progress)),
              ),
            ),
          ),
      ],
    );
  }
}

/// The ring over a downloading certificate, with the percentage inside it.
///
/// [value] is null until the first chunk arrives, and stays null for the whole
/// download when the response carried no `Content-Length` — the ring then
/// spins rather than claiming a figure it does not have.
class _DownloadProgress extends StatelessWidget {
  const _DownloadProgress({required this.value});

  final double? value;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final double? v = value;

    return Stack(
      alignment: Alignment.center,
      children: <Widget>[
        SizedBox(
          // Tweened rather than set: Dio reports in chunks, and a ring that
          // jumps from 20% to 90% in one frame reads as a glitch.
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0, end: v ?? 0),
            duration: AppMotion.fadeIn,
            curve: AppMotion.standard,
            builder: (BuildContext context, double drawn, _) =>
                CircularProgressIndicator(
                  value: v == null ? null : drawn,
                  strokeWidth: 3,
                  backgroundColor: brand.track,
                  color: brand.brandText,
                ),
          ),
        ),
        if (v != null)
          Text(
            '${(v * 100).round()}%',
            style: tabular(
              context.text.labelMedium!.copyWith(
                fontSize: fs(11),
                height: 1,
                color: brand.brandText,
              ),
            ),
          ),
      ],
    );
  }
}

/// One icon-only action on a certificate card.
///
/// The label is carried by [Tooltip] and [Semantics] rather than printed: a
/// screen reader announces it and a long-press shows it, while three words
/// across a phone-width card crowded out the certificate itself. The 44px box
/// is the minimum comfortable tap target.
class _CertAction extends StatelessWidget {
  const _CertAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    // Semantics wraps the tooltip rather than sitting under it, so the label
    // belongs to the button's own node instead of whatever encloses it — and
    // the tooltip is excluded so the name is not announced twice.
    return Semantics(
      button: true,
      container: true,
      label: label,
      child: Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: PressScale(
          onTap: onTap,
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: primary
                  ? brand.brandFill
                  : context.colors.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadius.button),
            ),
            child: Icon(
              icon,
              size: 19,
              color: primary ? brand.onBrand : brand.brandText,
            ),
          ),
        ),
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
