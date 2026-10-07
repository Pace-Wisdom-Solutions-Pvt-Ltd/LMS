// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// First frame.
///
/// The session and the cached brand are already hydrated by `initApp`, so this
/// screen only decides where to send the learner. It is the one route the auth
/// guard ignores, which is what lets it own that decision.
///
/// **The logo does not animate.** It is replaced at runtime by whatever an
/// organization uploads — any shape, any aspect ratio, any amount of detail —
/// and a spin-and-settle choreography that flatters one mark mangles another.
/// It is drawn once, at rest. Only the wordmark and the tagline rise:
///
/// | at   | for | what             |
/// |------|-----|------------------|
/// | 0    | 600 | wordmark rises   |
/// | 200  | 600 | tagline rises    |
///
/// Navigation still waits out [AppMotion.splashFloor] even when the token is
/// warm, so the app never flashes through the splash. Reduced motion renders
/// the final state and holds only briefly.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  /// Drives the whole timeline; every element reads its own slice of it.
  late final AnimationController _timeline = AnimationController(
    vsync: this,
    duration: AppMotion.splashFloor,
  );

  Timer? _floorTimer;
  final Completer<void> _floorDone = Completer<void>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _boot());
  }

  Future<void> _boot() async {
    if (!mounted) return;

    final bool reduced = context.reduceMotion;
    if (reduced) {
      _timeline.value = 1;
    } else {
      _timeline.forward();
    }

    // Reduced motion still gets a short hold, so the first screen does not
    // flicker past before it has been read.
    final Duration floor = reduced
        ? const Duration(milliseconds: 500)
        : AppMotion.splashFloor;
    _floorTimer = Timer(floor, _releaseFloor);

    final SessionProvider session = context.read<SessionProvider>();
    final BrandingProvider branding = context.read<BrandingProvider>();
    final int? orgId = session.orgId;

    // Every launch refetches the organization. The splash only *waits* for it
    // when nothing has been cached yet — otherwise the brand is already on
    // screen from Hive and a change an admin has made since repaints when it
    // lands, rather than holding the learner behind the network.
    if (session.isLoggedIn && orgId != null) {
      final bool nothingCached = branding.isEmpty;
      final Future<void> fetch = branding.refresh(orgId);
      if (nothingCached) await fetch;
    }

    await _floorDone.future;

    if (!mounted) return;

    // Something else has already routed away from the splash — a deep link,
    // a test driving the router. Its destination wins; the
    // splash must not yank the learner back several seconds later.
    if (GoRouter.of(context).state.matchedLocation != AppRoutePaths.splash) {
      return;
    }

    if (!session.isLoggedIn) {
      context.goNamed(AppRouteNames.signIn);
      return;
    }

    // A learner with several organizations who has not chosen one yet — can
    // happen if the app was killed mid-pick. Ask again rather than guessing.
    if (session.needsOrgChoice) {
      final int? chosen = await showOrgPicker(context, dismissible: false);
      if (!mounted) return;
      if (chosen == null) {
        await session.signOut();
        if (!mounted) return;
        context.goNamed(AppRouteNames.signIn);
        return;
      }
      await branding.refresh(chosen);
      if (!mounted) return;
    }

    context.goNamed(AppRouteNames.home);
  }

  void _releaseFloor() {
    if (!_floorDone.isCompleted) _floorDone.complete();
  }

  @override
  void dispose() {
    _floorTimer?.cancel();
    // Let _boot resume so it can bail on its `mounted` check, rather than
    // leaving it parked on a future that will never complete.
    _releaseFloor();
    _timeline.dispose();
    super.dispose();
  }

  /// A slice of the timeline in milliseconds, as a 0..1 animation.
  Animation<double> _slice(int startMs, int durationMs, Curve curve) {
    final double total = AppMotion.splashFloor.inMilliseconds.toDouble();
    return CurvedAnimation(
      parent: _timeline,
      curve: Interval(
        startMs / total,
        (startMs + durationMs) / total,
        curve: curve,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final BrandingProvider branding = context.watch<BrandingProvider>();
    final String wordmark = branding.orgName.isNotEmpty
        ? branding.orgName
        : context.l10n.appName;

    return Scaffold(
      // The prototype's splash is plain white in light mode, not the app
      // background, so the mark's gradients read cleanly.
      backgroundColor: context.theme.brightness == Brightness.light
          ? AppPalette.lSurface
          : AppPalette.dBackground,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const _SplashMark(size: 118),
              const SizedBox(height: AppSpace.xxl),
              _Rise(
                animation: _slice(0, 600, AppMotion.decelerate),
                child: Text(
                  wordmark,
                  textAlign: TextAlign.center,
                  style: context.text.displaySmall?.copyWith(
                    fontSize: fs(34),
                    letterSpacing: -1.02, // -0.03em at 34px
                  ),
                ),
              ),
              const SizedBox(height: AppSpace.md),
              _Rise(
                animation: _slice(200, 600, AppMotion.decelerate),
                child: Text(
                  context.l10n.appTagline,
                  textAlign: TextAlign.center,
                  style: context.text.bodyMedium?.copyWith(
                    color: context.brand.muted,
                    fontSize: fs(15),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The mark at the top of the splash: the **organization's** once one is
/// chosen, the app's own until then.
///
/// A returning learner's branding is already hydrated from Hive by `initApp`,
/// so this is their org's logo on the very first frame rather than the app
/// mark swapping out a moment later. With no session, or a session that has
/// not picked an org yet, there is no tenant to represent and the app's own
/// mark is the honest answer.
///
/// [BrandMark] handles the rest of the chain — logo URL, then a monogram tile
/// built from the org name, then [AppIcon] — so a tenant without an uploaded
/// logo still gets something of its own. Static either way: see rule 14.
class _SplashMark extends StatelessWidget {
  const _SplashMark({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    final SessionProvider session = context.watch<SessionProvider>();
    final bool hasOrg = session.isLoggedIn && session.orgId != null;

    return hasOrg
        ? BrandMark(size: size, radius: AppRadius.hero)
        : AppIcon(size: size);
  }
}

/// `@keyframes rise` bound to an explicit slice of the splash timeline.
class _Rise extends StatelessWidget {
  const _Rise({required this.animation, required this.child});

  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: animation,
    builder: (_, Widget? c) => Opacity(
      opacity: animation.value,
      child: Transform.translate(
        offset: Offset(0, 14 * (1 - animation.value)),
        child: c,
      ),
    ),
    child: child,
  );
}
