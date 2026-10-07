// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The one way the app talks to the backend.
///
/// Every method returns an [ApiResponse] and **never throws** — a timeout, a
/// socket error, a DRF field-error map and a `{"detail": …}` body all come back
/// as a normalized response. That is what lets repositories stay
/// `try`/`catch`-free.
abstract final class DioClient {
  /// Lazily created, so [AppEnv.baseUrl] is read after `initApp` has resolved
  /// the environment rather than at class-load time.
  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: AppEnv.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      responseType: ResponseType.json,
    ),
  )..interceptors.add(AppInterceptor());

  static Future<ApiResponse> get(String path, {Map<String, dynamic>? query}) =>
      _send(() => dio.get<dynamic>(path, queryParameters: query));

  /// [headers] is for the one case the interceptor cannot cover: blacklisting
  /// the tokens of a **rejected** login, which were never stored (FR-AUTH-3).
  /// The interceptor only adds an `Authorization` header when one is stored, so
  /// an explicit one passed here survives.
  static Future<ApiResponse> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
    Map<String, String>? headers,
  }) => _send(
    () => dio.post<dynamic>(
      path,
      data: data,
      queryParameters: query,
      options: headers == null ? null : Options(headers: headers),
    ),
  );

  static Future<ApiResponse> put(String path, {dynamic data}) =>
      _send(() => dio.put<dynamic>(path, data: data));

  static Future<ApiResponse> patch(String path, {dynamic data}) =>
      _send(() => dio.patch<dynamic>(path, data: data));

  static Future<ApiResponse> delete(String path, {dynamic data}) =>
      _send(() => dio.delete<dynamic>(path, data: data));

  /// Multipart `PATCH`, for a binary field on an existing record (the profile
  /// picture). The interceptor drops the JSON content-type when it sees a
  /// [FormData] body, so Dio can set its own boundary.
  static Future<ApiResponse> patchMultipart(String path, FormData form) =>
      _send(() => dio.patch<dynamic>(path, data: form));

  /// Multipart upload — task submission.
  ///
  /// Note the task endpoint wants `payload` as a **JSON string**, not an
  /// object; build the [FormData] accordingly at the call site.
  static Future<ApiResponse> upload(String path, FormData form) =>
      _send(() => dio.post<dynamic>(path, data: form));

  /// Raw bytes, for the certificate PDF. Bypasses JSON decoding entirely.
  /// [onReceiveProgress] is Dio's own: `(received, total)` in bytes, with
  /// **total `-1` whenever the response carries no `Content-Length`** — a
  /// chunked or compressed PDF does exactly that, so a caller turning this
  /// into a percentage has to handle the unknown case rather than divide by
  /// it.
  static Future<ApiResponse> download(
    String path, {
    ProgressCallback? onReceiveProgress,
  }) => _send(
    () => dio.get<dynamic>(
      path,
      options: Options(responseType: ResponseType.bytes),
      onReceiveProgress: onReceiveProgress,
    ),
    asBytes: true,
  );

  static Future<ApiResponse> _send(
    Future<Response<dynamic>> Function() call, {
    bool asBytes = false,
  }) async {
    if (!AppEnv.isConfigured) {
      appLogPrint(
        'No API base URL. Pass --dart-define=API_BASE_URL or set it in the '
        '.env file.',
        tag: 'API',
      );
      return ApiResponse.failure(
        'The app is not configured to reach a server.',
      );
    }

    try {
      final Response<dynamic> res = await call();
      if (asBytes) {
        final dynamic body = res.data;
        return ApiResponse(
          success: true,
          statusCode: res.statusCode,
          data: body is List<int> ? Uint8List.fromList(body) : body,
        );
      }
      return ApiResponse.fromBody(res.data, statusCode: res.statusCode);
    } on DioException catch (e) {
      return _fromDioException(e);
    } catch (e, s) {
      appLogPrint('Unhandled API error: $e\n$s', tag: 'API');
      return ApiResponse.failure('Something went wrong. Please try again.');
    }
  }

  /// Turns a transport or HTTP failure into a normalized response, preferring
  /// the server's own message when there is a body.
  static ApiResponse _fromDioException(DioException e) {
    final Response<dynamic>? res = e.response;

    if (res != null) {
      return ApiResponse.fromErrorBody(
        res.data,
        statusCode: res.statusCode,
        fallbackMessage: _statusMessage(res.statusCode),
      );
    }

    final String message = switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'The request timed out. Please try again.',
      DioExceptionType.connectionError =>
        'No internet connection. Check your network and try again.',
      DioExceptionType.cancel => 'Request cancelled.',
      DioExceptionType.badCertificate =>
        'Could not establish a secure connection.',
      _ => 'Something went wrong. Please try again.',
    };

    return ApiResponse.failure(message, statusCode: res?.statusCode);
  }

  static String _statusMessage(int? status) => switch (status) {
    400 => 'Please check the details and try again.',
    401 => 'Your session has expired. Please sign in again.',
    403 => "You don't have access to this.",
    404 => 'We couldn\'t find that.',
    500 || 502 || 503 => 'The server is having trouble. Please try again.',
    _ => 'Something went wrong. Please try again.',
  };
}
