// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The result of a sign-in attempt.
///
/// Sealed so a caller has to handle both branches. There is deliberately **no
/// role gate**: the backend's single login endpoint admits every role, and this
/// app admits whoever it admits. A trainer or an admin signing in gets the
/// learner UI, and the student-scoped endpoints simply return empty results for them
sealed class LoginOutcome {
  const LoginOutcome();
}

/// Credentials accepted.
class LoginSuccess extends LoginOutcome {
  final AppUser user;
  final String accessToken;
  final String refreshToken;

  ///  **Every** organization the account belongs to, whatever the role in each.
  ///  The picker shows them all, labelled with the roles held there.
  final List<OrgMembership> organizations;

  const LoginSuccess({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    required this.organizations,
  });

  bool get needsOrgChoice => organizations.length > 1;
}

/// The sign-in itself failed — bad credentials, inactive account, pending
/// invitation, or a transport error.
class LoginFailure extends LoginOutcome {
  final String message;
  final Map<String, List<String>> fieldErrors;
  final int? statusCode;

  const LoginFailure(
    this.message, {
    this.fieldErrors = const <String, List<String>>{},
    this.statusCode,
  });

  /// The status the server answered with, kept for logging and for anyone who
  /// later needs to tell a rejection from an outage. **Nothing branches on it**
  /// — the screen shows [message] whatever it was. Classifying login failures
  /// in the client only ever produced wrong guesses about the backend's copy.
}
