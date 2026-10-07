// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// A normalized response.
///
/// **The backend does not envelope.** DRF returns bare objects, bare arrays
/// (`my-courses`), page objects (`{count, next, previous, results}`),
/// `{"detail": …}` errors, field-error maps and raw PDF bytes. Rather than leak
/// that variety into every view model, [DioClient] normalizes once, here.
///
/// Repositories return an [ApiResponse] and **never throw** — a timeout or a
/// socket error is turned into a failed response, so callers only branch on
/// [isSuccess].
class ApiResponse {
  final bool success;
  final int? statusCode;
  final String message;
  final dynamic data;
  final Map<String, dynamic>? meta;

  /// Per-field validation errors from a DRF `400`, e.g.
  /// `{"email": ["This field is required."]}`. Drives inline form errors.
  final Map<String, List<String>> fieldErrors;

  const ApiResponse({
    required this.success,
    this.statusCode,
    this.message = '',
    this.data,
    this.meta,
    this.fieldErrors = const <String, List<String>>{},
  });

  bool get isSuccess => success == true;

  /// [data] as an object, or null when it is a list / absent / malformed.
  Map<String, dynamic>? get dataMap =>
      data is Map ? Map<String, dynamic>.from(data as Map) : null;

  /// [data] as a list — empty rather than null, so callers can iterate blindly.
  /// For a paginated response this is already `results`.
  List<dynamic> get dataList =>
      data is List ? data as List<dynamic> : const <dynamic>[];

  /// Typed list helper: `res.listOf(Course.fromJson)`.
  List<T> listOf<T>(T Function(Map<String, dynamic>) fromJson) => dataList
      .whereType<Map<dynamic, dynamic>>()
      .map((Map<dynamic, dynamic> e) => fromJson(Map<String, dynamic>.from(e)))
      .toList();

  /// Raw bytes, for the certificate PDF download.
  Uint8List? get bytes => data is Uint8List ? data as Uint8List : null;

  // ── Pagination (DRF page objects) ───────────────────────────────────────
  bool get hasNextPage => (meta?['next'] as String?)?.isNotEmpty ?? false;
  String? get nextUrl => meta?['next'] as String?;
  int get totalCount => int.tryParse('${meta?['count']}') ?? dataList.length;

  /// Builds a response from a decoded 2xx body.
  ///
  /// A DRF page object is unwrapped so `data` is always the list a caller
  /// wants, with `count` / `next` / `previous` moved into [meta].
  factory ApiResponse.fromBody(dynamic body, {int? statusCode}) {
    if (body is Map && _isPageObject(body)) {
      final Map<String, dynamic> m = Map<String, dynamic>.from(body);
      return ApiResponse(
        success: true,
        statusCode: statusCode,
        data: m['results'],
        meta: <String, dynamic>{
          'count': m['count'],
          'next': m['next'],
          'previous': m['previous'],
        },
      );
    }
    return ApiResponse(success: true, statusCode: statusCode, data: body);
  }

  /// Builds a failure from a DRF error body.
  ///
  /// Handles the three shapes the backend produces: `{"detail": "…"}`,
  /// `{"non_field_errors": ["…"]}` and `{"field": ["…"]}`.
  factory ApiResponse.fromErrorBody(
    dynamic body, {
    int? statusCode,
    String fallbackMessage = 'Something went wrong. Please try again.',
  }) {
    if (body is Map) {
      final Map<String, dynamic> m = Map<String, dynamic>.from(body);

      final Object? detail = m['detail'];
      if (detail is String && detail.trim().isNotEmpty) {
        return ApiResponse(
          success: false,
          statusCode: statusCode,
          message: detail,
        );
      }

      final Map<String, List<String>> fields = <String, List<String>>{};
      m.forEach((String key, dynamic value) {
        if (value is List) {
          final List<String> msgs = value
              .map((dynamic e) => '$e')
              .where((String e) => e.trim().isNotEmpty)
              .toList();
          if (msgs.isNotEmpty) fields[key] = msgs;
        } else if (value is String && value.trim().isNotEmpty) {
          fields[key] = <String>[value];
        }
      });

      if (fields.isNotEmpty) {
        // non_field_errors reads as the headline message when present.
        final List<String>? nonField = fields['non_field_errors'];
        final String headline = nonField?.first ?? fields.values.first.first;
        return ApiResponse(
          success: false,
          statusCode: statusCode,
          message: headline,
          fieldErrors: fields,
        );
      }
    }

    if (body is String && body.trim().isNotEmpty && body.length < 300) {
      return ApiResponse(
        success: false,
        statusCode: statusCode,
        message: body.trim(),
      );
    }

    return ApiResponse(
      success: false,
      statusCode: statusCode,
      message: fallbackMessage,
    );
  }

  factory ApiResponse.failure(String message, {int? statusCode}) =>
      ApiResponse(success: false, message: message, statusCode: statusCode);

  static bool _isPageObject(Map<dynamic, dynamic> m) =>
      m.containsKey('results') &&
      m.containsKey('count') &&
      m['results'] is List;
}
