// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Builds the headers sent on every request.
///
/// These are attached centrally by [AppInterceptor] — a repository method must
/// never set `Authorization`, `Accept-Language` or `Content-Type` itself.
abstract final class DioHelper {
  static Map<String, String> dioHeader({bool isMultipart = false}) {
    final String? token = AuthTokenStore.accessToken;
    return <String, String>{
      if (!isMultipart) 'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': AuthTokenStore.langCode,
      'X-Platform': AppPlatform.name,
      if (token != null && token.isNotBlank) 'Authorization': 'Bearer $token',
    };
  }

  /// The value an outgoing request carried, used to detect that another request
  /// already refreshed the token while this one was in flight.
  static String? authHeaderOf(RequestOptions options) =>
      options.headers['Authorization'] as String?;
}
