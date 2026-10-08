// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// Route **names**. Navigate with `context.goNamed(AppRouteNames.home)` — never
/// with a hardcoded path string.
abstract final class AppRouteNames {
  static const String splash = 'splash';
  static const String signIn = 'sign-in';
  static const String forgotPassword = 'forgot-password';
  static const String resetPassword = 'reset-password';

  // Tabs
  static const String home = 'home';
  static const String courses = 'courses';
  static const String progress = 'progress';
  static const String profile = 'profile';

  // Pushed on the root navigator, so the tab bar is absent rather than
  // animated away.
  static const String roadmap = 'roadmap';
  static const String task = 'task';
  static const String quiz = 'quiz';
  static const String quizResult = 'quiz-result';
  static const String editProfile = 'edit-profile';
  static const String changePassword = 'change-password';
}

/// Route **paths**. Only [AppRoutes] and the auth guard should read these.
abstract final class AppRoutePaths {
  static const String splash = '/';
  static const String signIn = '/login';
  static const String forgotPassword = '/forgot-password';

  /// Opened from the link in a reset email, with `?token=`. **Nothing reaches
  /// it today** — those links open the web app until App Links / Universal
  /// Links are registered (PRD R8) — but the route, the screen and the call
  /// are all in place for when they are.
  static const String resetPassword = '/reset-password';

  /// Everything behind the auth guard lives under this prefix.
  static const String app = '/app';

  static const String home = '/app/home';
  static const String courses = '/app/courses';
  static const String progress = '/app/progress';
  static const String profile = '/app/profile';

  static const String roadmap = '/course/:courseId';
  // Everything that opens a node takes the ids that identify it and fetches
  // for itself. Nothing is handed a model through `extra`: a route that only
  // works when the previous screen loaded something cannot be deep-linked,
  // cannot be reloaded, and silently shows the caller's stale copy.
  static const String task =
      '/course/:courseId/module/:moduleId/node/:nodeId/task';
  static const String quiz =
      '/course/:courseId/module/:moduleId/node/:nodeId/quiz';
  static const String quizResult =
      '/course/:courseId/module/:moduleId/node/:nodeId/quiz/result';
  static const String editProfile = '/profile/edit';
  static const String changePassword = '/profile/password';

  /// Locations reachable without a session.
  ///
  /// Both password routes belong here: someone who cannot sign in is exactly
  /// who needs them, and the reset link lands on a device with no session at
  /// all.
  static const Set<String> public = <String>{
    splash,
    signIn,
    forgotPassword,
    resetPassword,
  };
}
