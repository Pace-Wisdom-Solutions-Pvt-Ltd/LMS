// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Builds the light and dark [ThemeData] for a given [AppBrand].
///
/// Ported from the handoff bundle's `app_theme.dart` (written against Flutter
/// 3.27 and never compiled) with every vendor-specific name replaced by a
/// neutral one, since branding is resolved per organization at runtime.
/// A font size in logical pixels, scaled for the device.
///
/// This is where `responsive_sizer` earns its place: the type scale is written
/// at the design's phone sizes and sized up or down from there, rather than
/// being the same 16px on a 5" phone and a 13" tablet.
///
/// **Clamped, because `.sp` on its own is not usable here.** It grows with the
/// screen's width *and* height, so a 10" tablet lands at nearly **2x** the
/// phone size — headings that wrap mid-word and cards that no longer hold
/// their contents. A bigger screen reads a little larger, never twice as
/// large; a small phone loses a few percent rather than wrapping every title.
///
/// Falls back to the raw size when the device metrics are not set — any widget
/// test that builds a theme outside `ResponsiveSizer`. A font size must never
/// be the thing that throws.
double fs(num size) {
  try {
    return size.sp.clamp(size * 0.95, size * 1.25).toDouble();
  } catch (_) {
    return size.toDouble();
  }
}

abstract final class AppTheme {
  static ThemeData light([AppBrand brand = AppBrand.fallback]) =>
      _build(Brightness.light, brand);

  static ThemeData dark([AppBrand brand = AppBrand.fallback]) =>
      _build(Brightness.dark, brand);

  /// The type scale from `design_tokens.json`.
  ///
  /// The design names Bricolage Grotesque / Figtree / JetBrains Mono, but the
  /// app ships **no bundled or fetched fonts** — every style falls through to
  /// the platform font (SF on iOS, Roboto on Android). Only the family is lost:
  /// sizes, weights, line heights and letter spacing are the design's.
  static TextTheme _text(Color ink, Color muted) {
    TextStyle display(
      double size,
      FontWeight w,
      double height,
      double spacing,
    ) => TextStyle(
      fontSize: fs(size),
      fontWeight: w,
      height: height,
      letterSpacing: spacing,
      color: ink,
    );
    TextStyle body(
      double size,
      FontWeight w,
      double height, {
      Color? color,
      double spacing = 0,
    }) => TextStyle(
      fontSize: fs(size),
      fontWeight: w,
      height: height,
      letterSpacing: spacing,
      color: color ?? ink,
    );

    return TextTheme(
      displayLarge: display(50, FontWeight.w800, 1.0, -1.5), // quiz score
      displaySmall: display(
        32,
        FontWeight.w800,
        1.03,
        -0.8,
      ), // greeting, sign-in
      headlineSmall: display(26, FontWeight.w700, 1.10, -0.5), // screen titles
      headlineMedium: display(
        24,
        FontWeight.w700,
        1.18,
        -0.36,
      ), // quiz question
      titleLarge: display(19, FontWeight.w700, 1.20, -0.2), // section titles
      titleMedium: body(16, FontWeight.w700, 1.30), // card titles, buttons
      bodyLarge: body(16, FontWeight.w400, 1.45),
      bodyMedium: body(15, FontWeight.w400, 1.45),
      bodySmall: body(13, FontWeight.w400, 1.35, color: muted),
      labelLarge: body(13, FontWeight.w600, 1.35),
      labelMedium: body(12, FontWeight.w700, 1.30), // chips
      labelSmall: body(11, FontWeight.w700, 1.30, color: muted, spacing: 1.0),
    );
  }

  static ThemeData _build(Brightness b, AppBrand brand) {
    final bool isLight = b == Brightness.light;
    final Color bg = isLight ? AppPalette.lBackground : AppPalette.dBackground;
    final Color surface = isLight ? AppPalette.lSurface : AppPalette.dSurface;
    final Color surfaceVariant = isLight
        ? AppPalette.lSurfaceVariant
        : AppPalette.dSurfaceVariant;
    final Color ink = isLight ? AppPalette.ink : AppPalette.dInk;
    final Color muted = isLight ? AppPalette.lMuted : AppPalette.dMuted;
    final Color outline = isLight ? AppPalette.lOutline : AppPalette.dOutline;
    final Color track = isLight ? AppPalette.lTrack : AppPalette.dTrack;
    final Color danger = isLight ? AppPalette.lDanger : AppPalette.dDanger;

    final Color fill = brand.fillFor(b);
    final Color onFill = brand.onFillFor(b);
    final Color brandText = brand.textFor(b);
    final Color brandSoft = Color.lerp(surface, fill, isLight ? 0.13 : 0.24)!;

    final ColorScheme scheme = ColorScheme(
      brightness: b,
      primary: fill,
      onPrimary: onFill,
      primaryContainer: brandSoft,
      onPrimaryContainer: brandText,
      secondary: deepenForWhiteText(brand.accent),
      onSecondary: AppPalette.white,
      error: danger,
      onError: isLight ? AppPalette.white : AppPalette.ink,
      errorContainer: isLight
          ? AppPalette.lDangerContainer
          : AppPalette.dDangerContainer,
      surface: surface,
      onSurface: ink,
      onSurfaceVariant: muted,
      surfaceContainerLowest: bg,
      surfaceContainerHighest: surfaceVariant,
      outline: outline,
      outlineVariant: outline,
    );

    final TextTheme text = _text(ink, muted);
    RoundedRectangleBorder rounded(double r) =>
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(r));

    return ThemeData(
      useMaterial3: true,
      brightness: b,
      colorScheme: scheme,
      scaffoldBackgroundColor: bg,
      textTheme: text,
      splashFactory: InkSparkle.splashFactory,
      extensions: <ThemeExtension<dynamic>>[
        BrandColors(
          muted: muted,
          track: track,
          success: isLight ? AppPalette.lSuccess : AppPalette.dSuccess,
          successContainer: isLight
              ? AppPalette.lSuccessContainer
              : AppPalette.dSuccessContainer,
          warning: isLight ? AppPalette.lWarning : AppPalette.dWarning,
          warningContainer: isLight
              ? AppPalette.lWarningContainer
              : AppPalette.dWarningContainer,
          danger: danger,
          dangerContainer: isLight
              ? AppPalette.lDangerContainer
              : AppPalette.dDangerContainer,
          brandFill: fill,
          onBrand: onFill,
          brandText: brandText,
          brandSoft: brandSoft,
          ring1: brand.ring1(),
          ring2: brand.ring2(),
          ring3: brand.ring3(),
          codeBackground: AppPalette.codeBackground,
        ),
      ],
      // `fillColor` is explicit because the default is `canvasColor`, which
      // Material 3 derives from `colorScheme.surface` — the *card* colour, a
      // shade off the page it is covering. The transition should fill with the
      // background it sits on.
      pageTransitionsTheme: PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: SharedAxisPageTransitionsBuilder(
            transitionType: SharedAxisTransitionType.horizontal,
            fillColor: bg,
          ),
          TargetPlatform.iOS: SharedAxisPageTransitionsBuilder(
            transitionType: SharedAxisTransitionType.horizontal,
            fillColor: bg,
          ),
        },
      ),
      appBarTheme: AppBarThemeData(
        backgroundColor: bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: ink,
        titleTextStyle: text.titleLarge,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: fill,
          foregroundColor: onFill,
          minimumSize: const Size.fromHeight(54),
          shape: rounded(AppRadius.button),
          textStyle: text.titleMedium,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ink,
          backgroundColor: surface,
          minimumSize: const Size.fromHeight(54),
          side: BorderSide(color: outline),
          shape: rounded(AppRadius.button),
          textStyle: text.titleMedium,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: brandText,
          textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationThemeData(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        labelStyle: text.labelLarge?.copyWith(color: muted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: BorderSide(color: outline, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: BorderSide(color: outline, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: BorderSide(color: fill, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: BorderSide(color: danger, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: BorderSide(color: danger, width: 1.5),
        ),
        errorStyle: text.labelLarge?.copyWith(color: danger),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: BorderSide(color: outline),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceVariant,
        labelStyle: text.labelMedium?.copyWith(color: muted),
        side: BorderSide.none,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface.withValues(alpha: 0.86),
        surfaceTintColor: Colors.transparent,
        indicatorColor: brandSoft,
        height: 64,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (Set<WidgetState> s) => text.labelMedium!.copyWith(
            fontSize: fs(11),
            fontWeight: FontWeight.w600,
            color: s.contains(WidgetState.selected) ? brandText : muted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (Set<WidgetState> s) => IconThemeData(
            color: s.contains(WidgetState.selected) ? brandText : muted,
            size: 23,
          ),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: outline,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppRadius.sheet),
          ),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ink,
        contentTextStyle: text.labelLarge?.copyWith(color: bg),
        shape: rounded(16),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: fill,
        linearTrackColor: track,
      ),
      switchTheme: SwitchThemeData(
        trackColor: WidgetStateProperty.resolveWith(
          (Set<WidgetState> s) =>
              s.contains(WidgetState.selected) ? fill : track,
        ),
        thumbColor: const WidgetStatePropertyAll<Color>(AppPalette.white),
        trackOutlineColor: const WidgetStatePropertyAll<Color>(
          Colors.transparent,
        ),
      ),
      dividerTheme: DividerThemeData(color: outline, thickness: 1, space: 1),
    );
  }
}

/// Mono text for code, timers and counts.
///
/// No font is bundled, so this names the platform monospace families and falls
/// back through them. Tabular figures keep digits from jittering as a timer
/// counts down.
TextStyle appMono(
  BuildContext context, {
  double size = 13,
  FontWeight weight = FontWeight.w400,
  Color? color,
}) => TextStyle(
  fontFamily: AppPlatform.isIOS ? 'Menlo' : 'monospace',
  fontFamilyFallback: const <String>['Menlo', 'Roboto Mono', 'monospace'],
  fontSize: fs(size),
  fontWeight: weight,
  height: 1.6,
  color: color ?? Theme.of(context).colorScheme.onSurface,
  fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
);

/// Tabular figures for any style — scores, counts, timers.
TextStyle tabular(TextStyle style) => style.copyWith(
  fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
);
