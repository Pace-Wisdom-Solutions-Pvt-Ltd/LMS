// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The root widget: provider tiers, theming from the resolved org brand, then
/// the router.
///
/// The nesting matters. [globalProviders] sits outside so branding and the
/// session survive a sign-out; the session tier sits inside a [KeyedSubtree]
/// keyed on [SessionProvider.sessionKey], so signing in or out — **or
/// switching organization** — rebuilds that subtree from scratch and discards
/// every session-scoped view model with it.
///
/// The org is part of that key on purpose. Every student endpoint is scoped by
/// `org_id`, so a switch has to throw away the dashboard, the course list, the
/// the progress that belongs to the previous one. Rebuilding
/// the subtree is the in-app equivalent of relaunching: nothing survives it
/// except the session and the brand.
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: globalProviders,
      child: Consumer<SessionProvider>(
        builder: (BuildContext context, SessionProvider session, _) {
          return KeyedSubtree(
            key: ValueKey<String>(session.sessionKey),
            child: _withSessionProviders(const _AppView()),
          );
        },
      ),
    );
  }

  /// `MultiProvider` asserts that `providers` is non-empty, so the session tier
  /// is only inserted once a feature has registered a view model. The
  /// [KeyedSubtree] above keeps the reset-on-session-change behaviour either way.
  static Widget _withSessionProviders(Widget child) {
    final List<SingleChildWidget> providers = sessionProviders;
    if (providers.isEmpty) return child;
    return MultiProvider(providers: providers, child: child);
  }
}

class _AppView extends StatelessWidget {
  const _AppView();

  @override
  Widget build(BuildContext context) {
    // Only the pieces that actually change the theme, so an unrelated branding
    // field does not rebuild the whole app.
    final AppBrand brand = context.select((BrandingProvider b) => b.brand);
    final Locale locale = context.select((SessionProvider s) => s.appLocale);
    final ThemeMode themeMode = context.select(
      (SessionProvider s) => s.themeMode,
    );

    return ResponsiveSizer(
      builder: (BuildContext context, Orientation _, ScreenType _) {
        return MaterialApp.router(
          onGenerateTitle: (BuildContext c) => AppLocalizations.of(c).appName,
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(brand),
          darkTheme: AppTheme.dark(brand),
          themeMode: themeMode,
          routerConfig: appRouter,
          locale: locale,
          supportedLocales: const <Locale>[Locale('en')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          // Honour the 1.3x the specs require without letting a 2x system
          // setting destroy every layout, and pin the "No internet" bar to the
          // bottom of every route at once.
          // The [ColoredBox] is not decoration. A page transition fades the
          // outgoing and incoming routes at the same time, and for those
          // frames neither is opaque — so whatever sits behind the navigator
          // shows through. Nothing did: `MaterialApp` paints no background of
          // its own, so the exposed layer was the platform's window
          // background, which is white. Every push and pop flashed white on a
          // dark theme, and nobody notices on a light one because white is
          // roughly where it was going anyway.
          //
          // `Theme.of` resolves to the selected theme here —
          // `MaterialApp` wraps `builder` in a `Builder` of its own precisely
          // so that it can.
          builder: (BuildContext context, Widget? child) => ClampedTextScale(
            child: ColoredBox(
              color: Theme.of(context).scaffoldBackgroundColor,
              child: Column(
                children: <Widget>[
                  Expanded(child: child ?? const SizedBox.shrink()),
                  const NoInternetBar(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
