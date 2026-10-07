// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:convert';

import 'package:lms/utils/app_exports.dart';

/// A canned HTTP layer for [DioClient].
///
/// Swaps out Dio's adapter so repository tests exercise the real client,
/// interceptor and response normalization without a server.
class FakeApi implements HttpClientAdapter {
  final List<RequestOptions> requests = <RequestOptions>[];
  final Map<String, FakeReply> routes = <String, FakeReply>{};

  /// [delay] holds the response open, which is the only way to observe a
  /// loading state: without it the adapter answers in the same microtask and
  /// the state is gone before a frame can be pumped. Needs
  /// [WidgetTester.runAsync], like anything else that waits on real time.
  /// Registers a reply.
  ///
  /// [method] is only needed where one path answers more than one verb —
  /// `…/task/submit/` lists attempts on GET and takes one on POST. A route
  /// registered without it answers every method, which is what nearly every
  /// test wants.
  void on(
    String path, {
    required int status,
    Object? body,
    Duration? delay,
    String? method,
  }) => routes[_key(path, method)] = FakeReply(
    status: status,
    body: body,
    delay: delay,
  );

  static String _key(String path, String? method) =>
      method == null ? path : '${method.toUpperCase()} $path';

  bool hit(String path, {String? method}) => requests.any(
    (RequestOptions r) =>
        r.path == path &&
        (method == null || r.method.toUpperCase() == method.toUpperCase()),
  );

  RequestOptions? requestFor(String path, {String? method}) {
    for (final RequestOptions r in requests) {
      if (r.path != path) continue;
      if (method != null && r.method.toUpperCase() != method.toUpperCase()) {
        continue;
      }
      return r;
    }
    return null;
  }

  void reset() {
    requests.clear();
    routes.clear();
  }

  /// Installs this adapter on the shared client.
  void install() => DioClient.dio.httpClientAdapter = this;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);

    // The method-specific route wins; the bare path is the fallback.
    final FakeReply? reply =
        routes[_key(options.path, options.method)] ?? routes[options.path];
    if (reply == null) {
      return ResponseBody.fromString(
        jsonEncode(<String, dynamic>{
          'detail': 'No fake route for ${options.path}',
        }),
        404,
        headers: _jsonHeaders,
      );
    }

    if (reply.delay != null) await Future<void>.delayed(reply.delay!);

    return ResponseBody.fromString(
      reply.body == null ? '' : jsonEncode(reply.body),
      reply.status,
      headers: _jsonHeaders,
    );
  }

  @override
  void close({bool force = false}) {}

  static const Map<String, List<String>> _jsonHeaders = <String, List<String>>{
    Headers.contentTypeHeader: <String>[Headers.jsonContentType],
  };
}

class FakeReply {
  const FakeReply({required this.status, this.body, this.delay});
  final int status;
  final Object? body;

  /// How long to hold the response before answering.
  final Duration? delay;
}

/// A login response shaped like `api/examples/01-auth-student-login.json`.
Map<String, dynamic> loginBody({
  required List<Map<String, dynamic>> organizations,
  bool isSuperuser = false,
  List<String> userRoles = const <String>['student'],
  String email = 'learner@example.com',
}) => <String, dynamic>{
  'refresh': 'refresh-token',
  'access': 'access-token',
  'user': <String, dynamic>{
    'id': 'b1f3f937-9999-4430-8ee7-6c7208897165',
    'email': email,
    'first_name': 'Diya',
    'last_name': 'Rao',
    'phone_number': '',
    'profile_picture': null,
    'is_active': true,
    'status': 'active',
    'is_superuser': isSuperuser,
    'roles': userRoles,
    'organizations': organizations,
  },
  // The real response repeats the memberships here in a different shape. The
  // app must not read it, so this copy is deliberately wrong: anything that
  // falls back to it gets an org that does not exist.
  'organizations': <Map<String, dynamic>>[decoyOrg],
};

/// The shape of one `user.organizations[]` entry — `name`, not `org_name`,
/// and no `logo`.
Map<String, dynamic> org(
  int id,
  String name,
  String role, {
  List<String>? roles,
}) => <String, dynamic>{
  'org_id': id,
  'name': name,
  'role': role,
  'roles': roles ?? <String>[role],
};

/// A membership that exists only in the login response's **top-level**
/// `organizations[]`. No test expects to see it.
const Map<String, dynamic> decoyOrg = <String, dynamic>{
  'org_id': 999,
  'org_name': 'Top-level Only',
  'role': 'student',
  'roles': <String>['student'],
  'logo': null,
};
