// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The session, created once at boot so the router can read it before the
/// widget tree exists.
final SessionProvider appSession = SessionProvider();

/// Branding, also created at boot: it is hydrated from disk *before* `runApp`
/// so the first frame is already in the organization's colours.
final BrandingProvider appBranding = BrandingProvider();

/// Providers that **survive session expiry**.
///
/// [BrandingProvider] is global rather than session-scoped because it themes
/// the pre-login screens too; it is cleared explicitly on logout and on a
/// rejected login instead of being torn down with the session.
List<SingleChildWidget> get globalProviders => <SingleChildWidget>[
  ChangeNotifierProvider<SessionProvider>.value(value: appSession),
  ChangeNotifierProvider<BrandingProvider>.value(value: appBranding),
  // Global, not session: losing internet has nothing to do with who is
  // signed in, and the bar must survive a forced sign-out.
  ChangeNotifierProvider<InternetProvider>(create: (_) => InternetProvider()),
];

/// Providers scoped to **one logged-in session**.
///
/// [MyApp] keys this tier on `SessionProvider.userId`, so signing in or out
/// rebuilds the subtree and discards every view model below — no data leaks
/// between learners on a shared device.
///
/// Feature view models go here. A view model used by a single screen should use
/// a local `ChangeNotifierProvider` on that screen instead, so its timers stop
/// when the screen is popped.
///
/// [TabRefresher] is last: it is a bridge over the three tab view models above
/// it, not a view model of its own.
List<SingleChildWidget> get sessionProviders => <SingleChildWidget>[
  ChangeNotifierProvider<DashboardViewModel>(
    create: (_) => DashboardViewModel(),
  ),
  ChangeNotifierProvider<CoursesViewModel>(create: (_) => CoursesViewModel()),
  ChangeNotifierProvider<ProgressViewModel>(create: (_) => ProgressViewModel()),
  // The learner's own record. Reads the session from the tier above it, which
  // is where the record lives and what persists it.
  ChangeNotifierProvider<ProfileViewModel>(
    create: (BuildContext c) => ProfileViewModel(
      session: c.read<SessionProvider>(),
      branding: c.read<BrandingProvider>(),
    ),
  ),
  // The bridge the shell pulls when it is uncovered. It must sit below the
  // three view models it refetches, which is what a proxy guarantees.
  ProxyProvider3<
    DashboardViewModel,
    CoursesViewModel,
    ProgressViewModel,
    TabRefresher
  >(
    update:
        (
          _,
          DashboardViewModel dashboard,
          CoursesViewModel courses,
          ProgressViewModel progress,
          TabRefresher? previous,
        ) =>
            previous ??
            TabRefresher(
              dashboard: dashboard,
              courses: courses,
              progress: progress,
            ),
  ),
];
