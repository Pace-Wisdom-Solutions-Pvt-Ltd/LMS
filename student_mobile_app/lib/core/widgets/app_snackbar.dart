// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The one way this app shows a snackbar.
///
/// **It clears what is already on screen first.** Flutter queues snackbars and
/// plays them one after another, so two in quick succession — a save, then the
/// failure of the share that followed it — meant the learner read the first
/// message for four seconds while the one that mattered waited its turn.
/// Nothing in this app ever wants that: the newest message is the true one.
///
/// It also matters for a message that is still on screen when the app leaves
/// the foreground. A snackbar dismisses on an animation, and animations do not
/// tick while another activity is in front — so one shown just before the
/// system file viewer or the Android save dialog opens is still sitting there
/// when the learner comes back, however long they were away. Call
/// [hideAppSnackBars] before handing control to the platform.
ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showAppSnackBar(
  BuildContext context,
  String message, {
  ChipTone tone = ChipTone.neutral,
  Duration duration = const Duration(seconds: 4),
  String? actionLabel,
  VoidCallback? onAction,
  SnackBarBehavior? behavior,
}) {
  final BrandColors brand = context.brand;
  final ScaffoldMessengerState messenger = ScaffoldMessenger.of(context);

  // Theme defaults for neutral — ink with a light label — and the semantic
  // containers otherwise, which already pair a tint with readable text.
  final (Color? background, Color? foreground) = switch (tone) {
    ChipTone.neutral => (null, null),
    ChipTone.brand => (brand.brandFill, brand.onBrand),
    ChipTone.success => (brand.successContainer, brand.success),
    ChipTone.warning => (brand.warningContainer, brand.warning),
    ChipTone.danger => (brand.dangerContainer, brand.danger),
  };

  messenger.clearSnackBars();
  return messenger.showSnackBar(
    SnackBar(
      content: Text(
        message,
        style: foreground == null
            ? null
            : context.text.labelLarge?.copyWith(color: foreground),
      ),
      backgroundColor: background,
      duration: duration,
      behavior: behavior,
      action: actionLabel == null || onAction == null
          ? null
          : SnackBarAction(
              label: actionLabel,
              textColor: foreground,
              onPressed: onAction,
            ),
    ),
  );
}

/// Takes down whatever is showing, immediately and without the exit animation.
///
/// Use it before anything that hands the foreground to the platform — opening
/// a file, a share sheet, a save dialog — because a snackbar left behind
/// cannot animate away while the app is not drawing, and survives until the
/// learner returns.
void hideAppSnackBars(BuildContext context) =>
    ScaffoldMessenger.of(context).clearSnackBars();
