// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Auth calls.
///
/// `POST /api/auth/login/` is shared by every role and does not gate on one.
/// **Neither does this app**: whoever authenticates is admitted, with every
/// organization they belong to, and the picker labels each with the roles held
/// there. The student-scoped endpoints return empty results for a non-learner
/// rather than failing, which is what makes that acceptable.
class AuthRepository {
  const AuthRepository();

  Future<LoginOutcome> login({
    required String email,
    required String password,
  }) async {
    final ApiResponse res = await DioClient.post(
      ApiEndPoints.login,
      data: <String, dynamic>{'email': email.trim(), 'password': password},
    );

    return _sessionFrom(res);
  }

  /// `{access, refresh, user}` → a [LoginOutcome].
  ///
  /// Shared by login and [resetPassword], because the backend answers both
  /// with the same body: a reset is a sign-in that happens to set a password
  /// on the way through, and reading it twice is how the two would come to
  /// disagree about which organization list to trust.
  LoginOutcome _sessionFrom(ApiResponse res) {
    if (!res.isSuccess) {
      return LoginFailure(
        res.message,
        fieldErrors: res.fieldErrors,
        statusCode: res.statusCode,
      );
    }

    final Map<String, dynamic>? body = res.dataMap;
    final String access = (body?['access'] ?? '').toString();
    final String refresh = (body?['refresh'] ?? '').toString();
    final Object? rawUser = body?['user'];

    if (body == null || access.isBlank || rawUser is! Map) {
      return const LoginFailure('Unexpected response from the server.');
    }

    final AppUser user = AppUser.fromJson(Map<String, dynamic>.from(rawUser));

    return LoginSuccess(
      user: user,
      accessToken: access,
      refreshToken: refresh,
      // `user.organizations` only. The response's top-level `organizations[]`
      // is a second copy in a different shape and is deliberately unread.
      organizations: user.organizations,
    );
  }

  /// Ends the session server-side. Returns quietly on failure — someone who
  /// taps "Sign out" must end up signed out locally regardless.
  Future<void> logout() async {
    final String? refresh = AuthTokenStore.refreshToken;
    if (refresh == null || refresh.isBlank) return;
    await DioClient.post(
      ApiEndPoints.logout,
      data: <String, dynamic>{'refresh': refresh},
    );
  }

  Future<ApiResponse> forgotPassword(String email) => DioClient.post(
    ApiEndPoints.forgotPassword,
    data: <String, dynamic>{'email': email.trim()},
  );

  /// Sets a new password from the signed token in the reset email.
  ///
  /// **Answers with a token pair and the user**, exactly like login: finishing
  /// a reset signs the learner in. A caller that only says "password changed"
  /// and sends them to the form throws away a session the backend has already
  /// issued. `400` means the token is invalid or expired.
  Future<LoginOutcome> resetPassword({
    required String token,
    required String password,
  }) async => _sessionFrom(
    await DioClient.post(
      ApiEndPoints.resetPassword,
      data: <String, dynamic>{'token': token, 'password': password},
    ),
  );

  /// Changes the password.
  ///
  /// **On success the backend blacklists every refresh token for this user**,
  /// so this session's tokens are dead the moment it returns — the caller has
  /// to sign out and send them back to sign-in.
  Future<ApiResponse> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) => DioClient.post(
    ApiEndPoints.changePassword,
    data: <String, dynamic>{
      'current_password': currentPassword,
      'new_password': newPassword,
      'confirm_password': confirmPassword,
    },
  );
}
