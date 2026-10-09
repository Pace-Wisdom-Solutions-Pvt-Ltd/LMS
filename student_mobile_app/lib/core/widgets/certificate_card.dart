// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// One earned certificate, with View, Download and Share.
///
/// Shared by Progress, which lists every certificate the learner holds, and
/// the roadmap of a finished course, which offers the one it earned. The card
/// owns the three actions rather than taking them as callbacks: they are the
/// same three fetches and the same three sentences wherever the card appears,
/// and a screen that had to pass them in could pass in a different set.
///
/// [downloads] is whichever view model is tracking the download — the card
/// listens to it directly, so it does not care which one it is or how it was
/// provided.
class CertificateCard extends StatefulWidget {
  /// For a list, where the card has to say *which* certificate it is: the
  /// course, the date it was issued and the printed reference.
  const CertificateCard({
    super.key,
    required this.certificate,
    required this.downloads,
  }) : forCourse = false;

  /// For the roadmap of the course that earned it, where naming the course
  /// again says nothing — the whole screen is that course. It reads "Your
  /// certificate" instead, over the same three actions.
  const CertificateCard.forCourse({
    super.key,
    required this.certificate,
    required this.downloads,
  }) : forCourse = true;

  final Certificate certificate;
  final CertificateDownloads downloads;

  /// Which of the two the card is.
  final bool forCourse;

  @override
  State<CertificateCard> createState() => _CertificateCardState();
}

class _CertificateCardState extends State<CertificateCard> {
  Certificate get _certificate => widget.certificate;
  CertificateDownloads get _downloads => widget.downloads;

  /// Fetches the PDF if it is not already on the device, then hands back its
  /// path, or null if it could not be had.
  ///
  /// [onFailure] is required rather than defaulted, because the right sentence
  /// depends on which action asked. View and Share come through here too, and
  /// they are not downloads — telling someone who tapped View that a *download*
  /// failed names an action they did not take.
  Future<String?> _ensureLocalCopy({
    required bool promptForLocation,
    required String onFailure,
  }) async {
    final String? existing = _downloads.savedPathFor(_certificate.id);
    if (existing != null && !promptForLocation) return existing;

    final SavedFile? saved = await _downloads.downloadCertificate(
      _certificate,
      promptForLocation: promptForLocation,
    );
    if (!mounted) return null;

    if (saved == null) {
      showAppSnackBar(context, onFailure, tone: ChipTone.danger);
      return null;
    }
    return saved.path;
  }

  /// "View" opens the PDF in the platform viewer. It still has to fetch the
  /// file first, but never interrupts with a save dialog — choosing a folder
  /// is what Download is for.
  Future<void> _view() async {
    final String? path = await _ensureLocalCopy(
      promptForLocation: false,
      onFailure: context.l10n.certificateOpenFailed,
    );
    if (path == null || !mounted) return;
    // Nothing may be left on screen when the platform takes the foreground —
    // see [hideAppSnackBars].
    hideAppSnackBars(context);
    await openLocalFile(path);
  }

  /// Saves the PDF where the file manager can see it, then says where it went.
  Future<void> _download() async {
    final SavedFile? saved = await _downloads.downloadCertificate(_certificate);
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
  Future<void> _share(Rect? origin) async {
    final String? path = await _ensureLocalCopy(
      promptForLocation: false,
      onFailure: context.l10n.certificateShareFailed,
    );
    if (path == null || !mounted) return;

    // The share sheet is another activity; nothing of ours may be left
    // on screen behind it.
    hideAppSnackBars(context);
    await shareLocalFile(
      path,
      subject: _certificate.courseName,
      text: context.l10n.certificateShareText(_certificate.courseName),
      origin: origin,
    );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _downloads,
    builder: (BuildContext context, _) {
      final bool busy = _downloads.isDownloading(_certificate.id);

      // The card keeps its shape and its three buttons throughout: swapping
      // the row for a spinner collapsed the card by the height of a button and
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
              child: _CardBody(
                certificate: _certificate,
                forCourse: widget.forCourse,
                onView: _view,
                onDownload: _download,
                onShare: _share,
              ),
            ),
          ),
          if (busy)
            // Fills the card exactly, and nothing more: the scrim is the
            // card's own surface at a low alpha, so the title stays legible
            // underneath rather than being hidden behind a slab.
            Positioned.fill(
              child: Semantics(
                label: context.l10n.download,
                liveRegion: true,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: context.colors.surface.withValues(alpha: 0.50),
                    borderRadius: BorderRadius.circular(AppRadius.card),
                  ),
                  child: Center(
                    child: _DownloadProgress(
                      value: _downloads.downloadProgress(_certificate.id),
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

/// The certificate itself: the medal tile, what it is, then the three actions.
class _CardBody extends StatelessWidget {
  const _CardBody({
    required this.certificate,
    required this.forCourse,
    required this.onView,
    required this.onDownload,
    required this.onShare,
  });

  final Certificate certificate;
  final bool forCourse;
  final VoidCallback onView;
  final VoidCallback onDownload;
  final void Function(Rect? origin) onShare;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return Container(
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
                      forCourse
                          ? context.l10n.courseCertificateTitle
                          : certificate.courseName,
                      style: context.text.titleMedium?.copyWith(
                        fontSize: fs(15),
                      ),
                    ),
                    if (forCourse)
                      Text(
                        context.l10n.courseCertificateBody,
                        style: context.text.bodySmall,
                      )
                    else ...<Widget>[
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
                            // Mono, because this is a reference someone may
                            // read out or type in.
                            style: appMono(
                              context,
                              size: 11,
                              color: brand.muted,
                            ),
                          ),
                        ),
                    ],
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
              _CertAction(
                icon: Icons.download_rounded,
                label: context.l10n.download,
                onTap: onDownload,
              ),
              const SizedBox(width: AppSpace.sm),
              // Builder so the share sheet can anchor to this exact button,
              // which iPad requires.
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
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

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
              color: context.colors.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadius.button),
            ),
            child: Icon(icon, size: 19, color: brand.brandText),
          ),
        ),
      ),
    );
  }
}
