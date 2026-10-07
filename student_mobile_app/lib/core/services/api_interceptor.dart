// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:async';

import 'package:lms/utils/app_exports.dart';

/// Attaches headers to every request and transparently recovers from an expired
/// access token.
///
/// On a `401` it rotates the refresh token **once**, behind a single-flight
/// lock, and replays the original request, so the learner never sees the
/// failure. If the refresh itself fails the session is unrecoverable and
/// [onSessionExpired] signs them out.
///
/// Two mechanisms keep parallel `401`s from each triggering their own refresh:
/// [QueuedInterceptor] serializes the error handlers, and [_refreshOnce] shares
/// one in-flight [Completer] between callers. A request that failed with a token
/// that has since been replaced is replayed without refreshing at all.
class AppInterceptor extends QueuedInterceptor {
  /// Set by `initApp` to clear the session. A callback, so this file has no
  /// dependency on the widget tree.
  static Future<void> Function()? onSessionExpired;

  static Completer<bool>? _inFlightRefresh;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final bool isMultipart = options.data is FormData;
    options.headers.addAll(DioHelper.dioHeader(isMultipart: isMultipart));
    appLogPrint(
      '→ ${options.method} ${options.uri.path} ${options.queryParameters}',
      tag: 'API',
    );
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    appLogPrint(
      '← ${response.statusCode} ${response.requestOptions.uri.path} ${response.data}',
      tag: 'API',
    );
    handler.next(response);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final RequestOptions request = err.requestOptions;
    final bool isAuthFailure = err.response?.statusCode == 401;

    // A 401 on refresh or login means the credentials themselves are dead;
    // retrying would loop forever.
    final bool isAuthEndpoint =
        request.path == ApiEndPoints.refresh ||
        request.path == ApiEndPoints.login;

    if (!isAuthFailure || isAuthEndpoint || !AuthTokenStore.isLoggedIn) {
      appLogPrint(
        '✗ ${err.response?.statusCode} ${request.uri.path} ${err.message}',
        tag: 'API',
      );
      return handler.next(err);
    }

    // Another request already refreshed while this one was in flight — the
    // token it used is stale, so just replay with the current one.
    final String? sentWith = DioHelper.authHeaderOf(request);
    final String current = 'Bearer ${AuthTokenStore.accessToken}';
    if (sentWith != null && sentWith != current) {
      return _replayOrFail(request, handler, err);
    }

    final bool refreshed = await _refreshOnce();
    if (!refreshed) {
      await onSessionExpired?.call();
      return handler.next(err);
    }

    return _replayOrFail(request, handler, err);
  }

  Future<void> _replayOrFail(
    RequestOptions request,
    ErrorInterceptorHandler handler,
    DioException original,
  ) async {
    try {
      handler.resolve(await _replay(request));
    } on DioException catch (e) {
      handler.next(e);
    } catch (_) {
      handler.next(original);
    }
  }

  /// Runs at most one refresh at a time; concurrent callers await the same one.
  static Future<bool> _refreshOnce() {
    final Completer<bool>? existing = _inFlightRefresh;
    if (existing != null) return existing.future;

    final Completer<bool> completer = Completer<bool>();
    _inFlightRefresh = completer;

    _performRefresh()
        .then((bool ok) {
          _inFlightRefresh = null;
          completer.complete(ok);
        })
        .catchError((Object e) {
          _inFlightRefresh = null;
          completer.complete(false);
        });

    return completer.future;
  }

  /// Exchanges the refresh token for a new pair. Uses a bare [Dio] so this call
  /// does not re-enter the interceptor.
  static Future<bool> _performRefresh() async {
    final String? refresh = AuthTokenStore.refreshToken;
    if (refresh == null || refresh.isBlank) return false;

    try {
      final Dio bare = Dio(BaseOptions(baseUrl: AppEnv.baseUrl));
      final Response<dynamic> res = await bare.post<dynamic>(
        ApiEndPoints.refresh,
        data: <String, dynamic>{'refresh': refresh},
        options: Options(
          headers: <String, String>{'Content-Type': 'application/json'},
        ),
      );

      final Map<String, dynamic>? body = res.data is Map
          ? Map<String, dynamic>.from(res.data as Map)
          : null;
      final String? access = body?['access'] as String?;
      if (access == null || access.isBlank) return false;

      await AuthTokenStore.saveTokens(
        access: access,
        // Rotation: the response carries a new refresh token and the old one is
        // blacklisted. Persisting it is not optional.
        refresh: body?['refresh'] as String?,
      );
      appLogPrint('Access token refreshed', tag: 'AUTH');
      return true;
    } catch (e) {
      appLogPrint('Token refresh failed: $e', tag: 'AUTH');
      return false;
    }
  }

  /// Re-sends the original request with the rotated token.
  static Future<Response<dynamic>> _replay(RequestOptions request) {
    final Dio bare = Dio(BaseOptions(baseUrl: request.baseUrl));
    final bool isMultipart = request.data is FormData;
    return bare.fetch<dynamic>(
      request
        ..headers = <String, dynamic>{
          ...request.headers,
          ...DioHelper.dioHeader(isMultipart: isMultipart),
        },
    );
  }

  /// Test seam: drops any in-flight refresh so tests don't leak state.
  @visibleForTesting
  static void resetRefreshLock() => _inFlightRefresh = null;
}
