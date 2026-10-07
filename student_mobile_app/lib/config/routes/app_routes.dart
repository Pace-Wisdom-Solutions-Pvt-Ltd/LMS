// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The app's [GoRouter], built lazily against [appSession] so it exists before
/// the widget tree does.
final GoRouter appRouter = AppRoutes.build(appSession);

/// Tells a screen when it has become the top route again.
///
/// **This exists because the obvious thing does not work.** `await
/// context.pushNamed(...)` looks like it resolves when the learner comes back,
/// and for a plain push-then-pop it does — but go_router **drops the
/// completer of a route that gets replaced**. The quiz pushes, then replaces
/// itself with the result; that future never resolves, not on the replacement
/// and not on the later pop, so a `refresh` awaiting it silently never ran and
/// the roadmap stayed stale after every quiz.
///
/// A screen that needs to reload when it is uncovered mixes in [RouteAware],
/// subscribes to this, and refreshes in `didPopNext`. That is true whatever
/// happened above it — push, replace, several of each — so the trap cannot be
/// walked into again by the next screen that reaches for `pushReplacement`.
/// Only routes **this app navigated to** count: see [AppRouteObserver].
final AppRouteObserver appRouteObserver = AppRouteObserver();

/// A [RouteObserver] that reports app navigation and nothing else.
///
/// A widget is free to push a route for its own purposes, and several do:
/// Chewie's fullscreen video, a dialog, a bottom sheet. Those land on the
/// **root** navigator next to the roadmap and the shell, so the bare observer
/// read "fullscreen video closed" as "the learner came back from a lesson" —
/// which fired [TabRefresher] (three requests for screens nobody left) and,
/// worse, made the roadmap reload the node that was playing. That reload
/// swaps the expanded row for `_NodeUpdating`, which disposes the player
/// **while Chewie's fullscreen route is still animating out**: the route kept
/// rendering over a disposed `VideoPlayerController` and a disposed
/// `PlayerNotifier`, and exiting fullscreen threw every frame until the
/// animation finished.
///
/// The discriminator is [Page]. go_router builds every one of its routes from
/// a page (`AppRoutes._page`), so `settings is Page` is true for a screen and
/// false for anything a widget pushed for itself. Filtering the *pushed* route
/// drops `didPushNext` and `didPopNext` together, so a screen is never told it
/// was covered by something it will not be told has gone.
class AppRouteObserver extends RouteObserver<ModalRoute<void>> {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (!_isAppRoute(route)) return;
    super.didPush(route, previousRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (!_isAppRoute(route)) return;
    super.didPop(route, previousRoute);
  }

  static bool _isAppRoute(Route<dynamic> route) => route.settings is Page;
}

abstract final class AppRoutes {
  static final GlobalKey<NavigatorState> _rootKey = GlobalKey<NavigatorState>(
    debugLabel: 'root',
  );

  static GoRouter build(SessionProvider session) => GoRouter(
    navigatorKey: _rootKey,
    observers: <NavigatorObserver>[appRouteObserver],
    initialLocation: AppRoutePaths.splash,
    debugLogDiagnostics: kDebugMode,

    // Re-runs the guard whenever the session changes, so a sign-out
    // anywhere — including one forced by a failed token refresh — bounces
    // straight to the sign-in screen.
    refreshListenable: session,
    redirect: (BuildContext context, GoRouterState state) =>
        _guard(session, state),
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutePaths.splash,
        name: AppRouteNames.splash,
        pageBuilder: (_, GoRouterState s) => _page(s, const SplashScreen()),
      ),
      GoRoute(
        path: AppRoutePaths.signIn,
        name: AppRouteNames.signIn,
        pageBuilder: (_, GoRouterState s) => _page(s, const SignInScreen()),
      ),
      GoRoute(
        path: AppRoutePaths.forgotPassword,
        name: AppRouteNames.forgotPassword,
        pageBuilder: (_, GoRouterState s) =>
            _page(s, const ForgotPasswordScreen()),
      ),
      // Reached only from a reset email, which opens the web app today — see
      // [AppRoutePaths.resetPassword].
      GoRoute(
        path: AppRoutePaths.resetPassword,
        name: AppRouteNames.resetPassword,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          ResetPasswordScreen(token: s.uri.queryParameters['token'] ?? ''),
        ),
      ),
      GoRoute(
        path: AppRoutePaths.roadmap,
        name: AppRouteNames.roadmap,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          RoadmapScreen(
            courseId: _int(s.pathParameters['courseId']),
            resumeNodeId: int.tryParse(s.uri.queryParameters['resume'] ?? ''),
          ),
        ),
      ),
      GoRoute(
        path: AppRoutePaths.lesson,
        name: AppRouteNames.lesson,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          LessonScreen(
            courseId: _int(s.pathParameters['courseId']),
            moduleId: _int(s.pathParameters['moduleId']),
            nodeId: _int(s.pathParameters['nodeId']),
          ),
        ),
      ),
      // Task, quiz, quiz result and coding all take the **ids of the node**
      // and fetch for themselves. None of them is handed a model through
      // `extra`: a screen that can only be reached with a payload in hand is
      // not deep-linkable, cannot survive a reload, and renders whatever the
      // previous screen happened to be holding rather than what the server
      // currently says.
      GoRoute(
        path: AppRoutePaths.task,
        name: AppRouteNames.task,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          TaskScreen(
            courseId: _int(s.pathParameters['courseId']),
            moduleId: _int(s.pathParameters['moduleId']),
            nodeId: _int(s.pathParameters['nodeId']),
          ),
        ),
      ),
      GoRoute(
        path: AppRoutePaths.quiz,
        name: AppRouteNames.quiz,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          QuizScreen(
            courseId: _int(s.pathParameters['courseId']),
            moduleId: _int(s.pathParameters['moduleId']),
            nodeId: _int(s.pathParameters['nodeId']),
          ),
        ),
      ),
      GoRoute(
        path: AppRoutePaths.quizResult,
        name: AppRouteNames.quizResult,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          QuizResultScreen(
            courseId: _int(s.pathParameters['courseId']),
            moduleId: _int(s.pathParameters['moduleId']),
            nodeId: _int(s.pathParameters['nodeId']),
          ),
        ),
      ),
      GoRoute(
        path: AppRoutePaths.coding,
        name: AppRouteNames.coding,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) => _page(
          s,
          CodingScreen(
            courseId: _int(s.pathParameters['courseId']),
            moduleId: _int(s.pathParameters['moduleId']),
            nodeId: _int(s.pathParameters['nodeId']),
            // The coding-questions endpoint names each problem but never the
            // node they hang off, so the lesson's own title rides along as a
            // display hint. Absent — a deep link — the screen falls back to
            // its generic heading rather than showing nothing.
            nodeTitle: s.uri.queryParameters['title'] ?? '',
          ),
        ),
      ),
      GoRoute(
        path: AppRoutePaths.editProfile,
        name: AppRouteNames.editProfile,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) =>
            _page(s, const EditProfileScreen()),
      ),
      GoRoute(
        path: AppRoutePaths.changePassword,
        name: AppRouteNames.changePassword,
        parentNavigatorKey: _rootKey,
        pageBuilder: (_, GoRouterState s) =>
            _page(s, const ChangePasswordScreen()),
      ),

      // ── The four tabs ───────────────────────────────────────────────
      // indexedStack so each branch keeps its own scroll position and
      // navigation stack.
      StatefulShellRoute.indexedStack(
        parentNavigatorKey: _rootKey,
        builder: (_, _, StatefulNavigationShell shell) =>
            MainShell(shell: shell),
        branches: <StatefulShellBranch>[
          _branch(AppRoutePaths.home, AppRouteNames.home, const HomeScreen()),
          _branch(
            AppRoutePaths.courses,
            AppRouteNames.courses,
            const CoursesScreen(),
          ),
          _branch(
            AppRoutePaths.progress,
            AppRouteNames.progress,
            const ProgressScreen(),
          ),
          _branch(
            AppRoutePaths.profile,
            AppRouteNames.profile,
            const ProfileScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (_, GoRouterState state) =>
        Scaffold(body: Center(child: Text('Route not found: ${state.uri}'))),
  );

  static StatefulShellBranch _branch(String path, String name, Widget child) =>
      StatefulShellBranch(
        routes: <RouteBase>[
          GoRoute(
            path: path,
            name: name,
            pageBuilder: (_, GoRouterState s) => _page(s, child),
          ),
        ],
      );

  /// A **pure** auth guard: it answers "may this location be shown?" and
  /// nothing else.
  ///
  /// The organization picker and the branding fetch happen imperatively after
  /// sign-in. Putting either here would make redirects loop and turn every
  /// navigation into a policy evaluation.
  static String? _guard(SessionProvider session, GoRouterState state) {
    final String location = state.matchedLocation;

    // The splash screen decides where to go itself.
    if (location == AppRoutePaths.splash) return null;

    final bool loggedIn = session.isLoggedIn;
    final bool isPublic = AppRoutePaths.public.contains(location);

    if (!loggedIn && !isPublic) return AppRoutePaths.signIn;
    if (loggedIn && location == AppRoutePaths.signIn) return AppRoutePaths.home;
    return null;
  }

  static int _int(String? value) => int.tryParse(value ?? '') ?? -1;

  /// Page transition. Mobile uses [MaterialPage] so the shared-axis transition
  /// configured on the theme applies; web would jump without one.
  static Page<void> _page(GoRouterState state, Widget child) =>
      AppPlatform.isWeb
      ? NoTransitionPage<void>(key: state.pageKey, child: child)
      : MaterialPage<void>(key: state.pageKey, child: child);
}
