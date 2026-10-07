// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The back affordance, used everywhere one is needed.
///
/// A bordered 46px tile rather than Material's bare `IconButton`: it reads as
/// a control at a glance on a busy screen, and it is the same object on a
/// pushed screen's app bar as on the roadmap's own header, so "back" never
/// changes shape as the learner moves through the app.
class AppBackButton extends StatelessWidget {
  const AppBackButton({super.key, this.onTap});

  /// Defaults to popping the current route.
  final VoidCallback? onTap;

  static const double size = 46;

  /// `arrow_back_ios_new` rather than `CupertinoIcons.back`: it is the same
  /// chevron, and taking it from Material keeps the barrel's cupertino export
  /// narrowed to `CupertinoPage` (see the barrel rule).
  static IconData get icon => AppPlatform.isIOS
      ? Icons.arrow_back_ios_new_rounded
      : Icons.arrow_back_rounded;

  @override
  Widget build(BuildContext context) => PressScale(
    onTap: onTap ?? () => context.pop(),
    child: Semantics(
      button: true,
      container: true,
      label: MaterialLocalizations.of(context).backButtonTooltip,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: context.colors.surface,
          borderRadius: BorderRadius.circular(AppRadius.iconButton),
          border: Border.all(color: context.colors.outline),
        ),
        child: Icon(
          icon,
          // The chevron is a narrower glyph than the arrow and reads smaller
          // at a shared size, so it is given a little more.
          size: AppPlatform.isIOS ? 21 : 20,
          color: context.colors.onSurface,
        ),
      ),
    ),
  );
}

/// The app bar every screen uses.
///
/// Exists so the back button, the title style and the leading width are
/// decided once. Reaching for a bare `AppBar` gets Material's default arrow
/// instead, which is how the app ended up with two different back buttons.
///
/// [showBack] defaults to *whether there is anything to go back to*, so a
/// pushed screen gets the button and a tab does not, without either having to
/// say so.
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  const AppTopBar({
    super.key,
    this.title,
    this.actions,
    this.actionsPadding,
    this.showBack,
  });

  /// A widget, like `AppBar.title`, so swapping one for the other is
  /// mechanical and no call site has to be rewritten to adopt this.
  final Widget? title;

  final List<Widget>? actions;
  final EdgeInsetsGeometry? actionsPadding;
  final bool? showBack;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    // `Navigator.canPop`, not go_router's `context.canPop()`: this is a core
    // widget and must build without a router above it. It answers the same
    // question — a pushed route can go back, a shell branch's root cannot.
    final bool back = showBack ?? Navigator.canPop(context);

    return AppBar(
      automaticallyImplyLeading: false,
      // The tile brings its own padding, so the title sits where it would
      // with Material's arrow rather than drifting right.
      titleSpacing: back ? 0 : null,
      leading: back ? const Center(child: AppBackButton()) : null,
      leadingWidth: back ? AppBackButton.size + AppSpace.lg : null,
      title: title,
      actions: actions,
      actionsPadding: actionsPadding,
    );
  }
}
