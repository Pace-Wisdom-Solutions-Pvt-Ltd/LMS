// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Typed wrapper around Hive, and the app's **only** persistence layer.
///
/// **UI never touches a [Box] directly** — go through here (or, for auth,
/// through [AuthTokenStore]), so which box a value lives in stays a property of
/// its [HSKey] rather than a decision made at the call site.
///
/// Reads are synchronous: Hive keeps an open box in memory, which is what lets
/// `initApp` hydrate the session and the brand before the first frame.
class HiveStorage {
  HiveStorage._();

  /// Opens every box the app uses. Called by [initApp] before `runApp`.
  static Future<void> init() async {
    await Hive.initFlutter();
    for (final String name in HSBox.all) {
      await Hive.openBox<dynamic>(name);
    }
    await _dropLegacyBox();
  }

  /// Reads [key], returning [defaultValue] when absent or of the wrong type.
  static T? get<T>(HSKey<T> key, {T? defaultValue}) {
    final dynamic value = _boxOf(key.box).get(key.name);
    if (value is T) return value;
    return defaultValue;
  }

  static Future<void> store<T>(HSKey<T> key, T value) =>
      _boxOf(key.box).put(key.name, value);

  static Future<void> remove(HSKey<dynamic> key) =>
      _boxOf(key.box).delete(key.name);

  static bool has(HSKey<dynamic> key) => _boxOf(key.box).containsKey(key.name);

  /// Writes [value], or removes the key entirely when it is null — so an absent
  /// field never persists as an empty string.
  static Future<void> storeOrRemove<T>(HSKey<T> key, T? value) =>
      value == null ? remove(key) : store<T>(key, value);

  /// Everything tied to the signed-in account, in one call.
  ///
  /// [HSBox.prefs] is deliberately untouched: the locale is a device
  /// preference and must survive a sign-out.
  static Future<void> clearOnSignOut() async {
    await _boxOf(HSBox.secrets).clear();
    await _boxOf(HSBox.session).clear();
  }

  /// Wipes every box, preferences included. Only for tests and a factory reset.
  static Future<void> clearAllBoxes() async {
    for (final String name in HSBox.all) {
      await _boxOf(name).clear();
    }
  }

  /// Removes the pre-split single box, which held the previous account's
  /// profile and cached payloads. A no-op on a fresh install.
  static Future<void> _dropLegacyBox() async {
    try {
      if (await Hive.boxExists(HSBox.legacy)) {
        await Hive.deleteBoxFromDisk(HSBox.legacy);
        appLogPrint('Removed legacy ${HSBox.legacy}', tag: 'STORE');
      }
    } catch (e) {
      appLogPrint('Could not remove ${HSBox.legacy}: $e', tag: 'STORE');
    }
  }

  static Box<dynamic> _boxOf(String name) => Hive.box<dynamic>(name);
}
