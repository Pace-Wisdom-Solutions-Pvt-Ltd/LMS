// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The design's `.sheet`: a rounded surface rising from the bottom with a grab
/// handle, or — on a tablet, where the bottom edge is a long reach — a centred
/// dialog.
Future<T?> showAppSheet<T>(
  BuildContext context, {
  required String title,
  required Widget child,
  List<Widget> actions = const <Widget>[],
  bool dismissible = true,
}) {
  final Widget content = _SheetBody(
    title: title,
    actions: actions,
    child: child,
  );

  if (context.prefersDialogOverSheet) {
    return showDialog<T>(
      context: context,
      barrierDismissible: dismissible,
      builder: (_) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: content,
        ),
      ),
    );
  }

  return showModalBottomSheet<T>(
    context: context,
    isDismissible: dismissible,
    enableDrag: dismissible,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => content,
  );
}

class _SheetBody extends StatelessWidget {
  const _SheetBody({
    required this.title,
    required this.child,
    required this.actions,
  });

  final String title;
  final Widget child;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.xl,
        AppSpace.sm,
        AppSpace.xl,
        AppSpace.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(title, style: context.text.titleLarge),
          const SizedBox(height: AppSpace.md),
          Flexible(child: SingleChildScrollView(child: child)),
          if (actions.isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.xl),
            for (final Widget a in actions)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: a,
              ),
          ],
        ],
      ),
    ),
  );
}

/// `.btn` as a standalone widget, for sheets and full-width actions.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.busy = false,
    this.tone = ChipTone.brand,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final ChipTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final BrandColors b = context.brand;
    final (Color bg, Color fg) = switch (tone) {
      ChipTone.brand => (b.brandFill, b.onBrand),
      ChipTone.danger => (b.dangerContainer, b.danger),
      ChipTone.success => (b.successContainer, b.success),
      _ => (context.colors.surface, context.colors.onSurface),
    };

    final bool enabled = onPressed != null && !busy;

    return PressScale(
      onTap: enabled ? onPressed : null,
      child: AnimatedOpacity(
        duration: AppMotion.fadeIn,
        opacity: enabled ? 1 : 0.55,
        child: Container(
          // A floor, not a height: a label that needs two lines gets them,
          // and one that fits reads exactly as it did at a fixed 54.
          constraints: const BoxConstraints(minHeight: 54),
          width: double.infinity,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(AppRadius.button),
            border: tone == ChipTone.neutral
                ? Border.all(color: context.colors.outline)
                : null,
          ),
          // `Align` with a `heightFactor`, not `Container.alignment`: an
          // alignment with no fixed height takes *all* the height it is
          // offered, which in a `bottomNavigationBar` is the whole screen —
          // the coding screen's body was squeezed to nothing. The factor
          // pins the box to its content, and the 54 floor above does the
          // rest.
          child: Align(
            heightFactor: 1,
            child: busy
                ? SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: fg,
                    ),
                  )
                : Padding(
                    // Room for the label to end before the rounded corner does,
                    // and for a second line to clear the top and bottom edges.
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.md,
                      vertical: AppSpace.md,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        if (icon != null) ...<Widget>[
                          Icon(icon, size: 20, color: fg),
                          const SizedBox(width: AppSpace.sm),
                        ],
                        // Flexible, not fixed: two of these side by side in a
                        // Row of Expandeds — or one at 1.4x text scale — gets
                        // less width than its label wants, and a bare Text
                        // would overflow the button rather than wrap inside it.
                        //
                        // No `maxLines` and no ellipsis: a button says what it
                        // does, and half of that with a "…" is worse than a
                        // taller button. The height follows the label.
                        Flexible(
                          child: Text(
                            label,
                            textAlign: TextAlign.center,
                            style: context.text.titleMedium?.copyWith(
                              color: fg,
                              fontSize: fs(16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
