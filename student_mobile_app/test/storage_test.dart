// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Storage lifetimes.
//
// Persistence is one package — Hive — split into three boxes by **how long the
// data should live**, not by feature. Signing out must take the tokens, the
// account and the brand with it, and must leave the device's own preferences
// alone. These tests pin that split, because it is enforced by which box a key
// declares rather than by anyone remembering to delete it.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  late Directory tempDir;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    tempDir = await Directory.systemTemp.createTemp('lms_storage_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() => HiveStorage.clearAllBoxes());

  test('every key declares a box, and the three do not overlap', () {
    expect(HSKeys.accessToken.box, HSBox.secrets);
    expect(HSKeys.refreshToken.box, HSBox.secrets);

    expect(HSKeys.user.box, HSBox.session);
    expect(HSKeys.orgId.box, HSBox.session);
    expect(HSKeys.organizations.box, HSBox.session);
    expect(HSKeys.themeMode.box, HSBox.session);
    expect(HSKeys.brandPrimary.box, HSBox.session);

    expect(
      HSKeys.langCode.box,
      HSBox.prefs,
      reason: 'the locale is a device preference and outlives the account',
    );
    expect(HSBox.all.toSet(), hasLength(HSBox.all.length));
  });

  test(
    'signing out clears secrets and session but spares preferences',
    () async {
      await AuthTokenStore.saveTokens(access: 'acc', refresh: 'ref');
      await AuthTokenStore.saveUser(<String, dynamic>{
        'id': 7,
        'email': 'a@b.c',
      });
      await AuthTokenStore.saveOrgId(3);
      await AuthTokenStore.saveLangCode('en');
      await HiveStorage.store(HSKeys.themeMode, ThemeMode.dark.name);
      await HiveStorage.store(HSKeys.brandPrimary, '#0F766E');

      await AuthTokenStore.clear();

      expect(AuthTokenStore.accessToken, isNull);
      expect(AuthTokenStore.refreshToken, isNull);
      expect(AuthTokenStore.user, isNull);
      expect(AuthTokenStore.orgId, isNull);
      expect(HiveStorage.get<String>(HSKeys.accessToken), isNull);
      expect(HiveStorage.get<String>(HSKeys.user), isNull);
      expect(HiveStorage.get<String>(HSKeys.brandPrimary), isNull);
      expect(
        HiveStorage.get<String>(HSKeys.langCode),
        'en',
        reason: 'the locale lives in prefs, which sign-out does not touch',
      );
    },
  );

  test('load() reads the session back synchronously', () async {
    await AuthTokenStore.saveTokens(access: 'acc', refresh: 'ref');
    await AuthTokenStore.saveUser(<String, dynamic>{'id': 7});
    await AuthTokenStore.saveOrgId(3);
    await AuthTokenStore.saveLangCode('en');

    // Wipe the in-memory mirror without touching disk, as a cold start does.
    AuthTokenStore.accessToken = null;
    AuthTokenStore.refreshToken = null;
    AuthTokenStore.user = null;
    AuthTokenStore.orgId = null;

    AuthTokenStore.load();

    expect(AuthTokenStore.accessToken, 'acc');
    expect(AuthTokenStore.refreshToken, 'ref');
    expect(AuthTokenStore.orgId, 3);
    expect(AuthTokenStore.user?['id'], 7);
    expect(AuthTokenStore.isLoggedIn, isTrue);
  });

  test('a user record that no longer parses is dropped, not thrown', () async {
    await HiveStorage.store(HSKeys.user, 'not json');
    AuthTokenStore.load();
    expect(AuthTokenStore.user, isNull);
  });

  test('a value of the wrong type falls back instead of crashing', () async {
    await Hive.box<dynamic>(HSBox.session).put(HSKeys.orgId.name, 'three');
    expect(HiveStorage.get<int>(HSKeys.orgId), isNull);
    expect(HiveStorage.get<int>(HSKeys.orgId, defaultValue: 1), 1);
  });

  test('stored orgs round-trip through the session box', () async {
    const String raw = '[{"id":1,"name":"Acme"}]';
    await HiveStorage.store(HSKeys.organizations, raw);
    expect(
      jsonDecode(HiveStorage.get<String>(HSKeys.organizations)!),
      isA<List<dynamic>>(),
    );
  });
}
