// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// Every path the app calls, from `api/student-openapi.yaml`.
///
/// Two conventions that differ from the house standard:
///  * there is **no `/api/v1` prefix** — paths are `/api/…`, org-scoped ones
///    `/api/organizations/{org_id}/…`;
///  * **trailing slashes are mandatory** — Django will redirect or 404 without
///    them, and a redirect silently drops the request body on POST.
abstract final class ApiEndPoints {
  static const String _api = '/api';

  // ── Auth ────────────────────────────────────────────────────────────────
  static const String login = '$_api/auth/login/';
  static const String logout = '$_api/auth/logout/';
  static const String refresh = '$_api/auth/refresh/';
  static const String forgotPassword = '$_api/auth/forgot-password/';
  static const String changePassword = '$_api/auth/change-password/';

  /// Completes a reset started by `forgot-password`, with the signed token
  /// from the email. **Nothing in this app can reach it yet** — that token
  /// arrives only in a link, and those links open the web app until App Links
  /// / Universal Links are registered (PRD R8). Built and kept so the day the
  /// deep link lands there is a screen waiting for it.
  static const String resetPassword = '$_api/auth/reset-password/';

  // ── Org / branding ──────────────────────────────────────────────────────
  static String organization(int orgId) => '$_api/organizations/$orgId/';

  // ── User ────────────────────────────────────────────────────────────────
  static String user(String userId) => '$_api/users/$userId/';

  // ── Dashboard / courses / progress ──────────────────────────────────────
  static String dashboard(int orgId) =>
      '$_api/organizations/$orgId/students/me/dashboard/';
  static String myCourses(int orgId) =>
      '$_api/organizations/$orgId/my-courses/';
  static String myProgress(int orgId) =>
      '$_api/organizations/$orgId/my-progress/';
  static String roadmap(int orgId, String courseId) =>
      '$_api/organizations/$orgId/courses/$courseId/roadmap/';
  static String node(
    int orgId,
    String courseId,
    String moduleId,
    String nodeId,
  ) =>
      '$_api/organizations/$orgId/courses/$courseId/modules/$moduleId/nodes/$nodeId/';

  // ── Lesson / task / quiz ────────────────────────────────────────────────
  static String completeNode(String nodeId) => '$_api/nodes/$nodeId/complete/';

  /// **GET and POST.** POST submits an attempt; GET lists every attempt on
  /// this node, newest first. `task/result/` returned only the latest and is
  /// no longer called — one path, one model, and the history comes free.
  static String submitTask(String nodeId) => '$_api/nodes/$nodeId/task/submit/';
  static String submitQuiz(String quizId) => '$_api/quizzes/$quizId/submit/';

  // ── Certificates ────────────────────────────────────────────────────────
  static String certificates(int orgId) =>
      '$_api/organizations/$orgId/certificates/';

  /// Takes the **printed reference** (`CERT-C-1-DEEFDA1C`), not the integer
  /// id, and is not scoped to an organization.
  ///
  /// The list response carries an absolute `download_url` for the same route.
  /// It is not used: the server builds it from its own idea of its hostname
  /// and sends `https://localhost:8000/…`, which is nothing a device can
  /// reach. Building the path here puts it on [AppEnv.baseUrl] like every
  /// other call.
  static String downloadCertificate(String certificateId) =>
      '$_api/certificates/$certificateId/download/';

  /// **How a certificate comes into existence.** Nothing issues one on the
  /// learner's behalf: this call checks the course and creates it (201), and
  /// `certificates/` only ever lists what has already been claimed. Answers
  /// `400` with the reason until every lesson is complete and every task is
  /// approved.
  static String claimCertificate(int orgId, String courseId) =>
      '$_api/organizations/$orgId/courses/$courseId/claim-certificate/';
}
