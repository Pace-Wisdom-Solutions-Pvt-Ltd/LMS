// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:convert';

import 'package:lms/utils/app_exports.dart';

/// The **synchronous** mirror of the persisted session.
///
/// The Dio interceptor runs outside the widget tree and cannot `await` a read,
/// so the tokens live here as plain statics, loaded by [load] before `runApp`.
/// [SessionProvider] is the UI-facing source of truth and is the only thing
/// that should write here — features must never call these setters.
///
/// **Storage is Hive, split by lifetime** (see [HSBox]): tokens and the
/// the account's own data in
/// [HSBox.session], and the locale in [HSBox.prefs] so it outlives the account.
/// Nothing is encrypted at rest — see the note on [HSKeys].
abstract final class AuthTokenStore {
  static String? accessToken;
  static String? refreshToken;
  static Map<String, dynamic>? user;
  static String langCode = 'en';

  /// The org the session is currently scoped to. Always one the account is a
  /// member of — [SessionProvider.selectOrg] is what enforces that.
  static int? orgId;

  static bool get isLoggedIn => (accessToken ?? '').isNotBlank;

  /// The signed-in learner's id.
  ///
  /// Normally the cached user's own `id`.
  static String? get userId {
    final Object? cached = user?['id'];
    if (cached != null && '$cached'.isNotBlank) return '$cached';
    return null;
  }

  /// Reads the persisted session into memory. Called once by `initApp`.
  ///
  /// Synchronous: every box is already open by this point, so there is no I/O
  /// to await and no chance of the first frame racing it.
  static void load() {
    accessToken = HiveStorage.get<String>(HSKeys.accessToken);
    refreshToken = HiveStorage.get<String>(HSKeys.refreshToken);

    langCode = HiveStorage.get<String>(HSKeys.langCode, defaultValue: 'en')!;
    orgId = HiveStorage.get<int>(HSKeys.orgId);

    // Cleared first: [load] reports what storage holds, and a second call
    // after the record is gone must not leave the previous one standing.
    user = null;
    final String? rawUser = HiveStorage.get<String>(HSKeys.user);
    if (rawUser != null && rawUser.isNotBlank) {
      try {
        user = Map<String, dynamic>.from(jsonDecode(rawUser) as Map);
      } catch (e) {
        appLogPrint('Failed to decode cached user: $e', tag: 'AUTH');
        user = null;
      }
    }
  }

  static Future<void> saveTokens({
    required String access,
    String? refresh,
  }) async {
    accessToken = access;
    await HiveStorage.store(HSKeys.accessToken, access);

    // Refresh tokens rotate on every refresh: the old one is blacklisted
    // server-side, so keeping it would cause a silent logout later.
    if (refresh != null && refresh.isNotBlank) {
      refreshToken = refresh;
      await HiveStorage.store(HSKeys.refreshToken, refresh);
    }
  }

  static Future<void> saveUser(Map<String, dynamic> value) async {
    user = value;
    await HiveStorage.store(HSKeys.user, jsonEncode(value));
  }

  static Future<void> saveOrgId(int value) async {
    orgId = value;
    await HiveStorage.store(HSKeys.orgId, value);
  }

  static Future<void> saveLangCode(String code) async {
    langCode = code;
    await HiveStorage.store(HSKeys.langCode, code);
  }

  /// Drops the session from memory and from disk.
  ///
  /// The locale survives because it lives in [HSBox.prefs], not because
  /// anything here remembers to spare it.
  static Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
    user = null;
    orgId = null;

    await HiveStorage.clearOnSignOut();
  }
}
